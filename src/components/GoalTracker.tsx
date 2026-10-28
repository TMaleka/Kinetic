import { useEffect, useMemo, useState } from 'react'
import { Plus, Target, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { fetchGoalHistory } from '../lib/activeGoal'
import { intakeFromGoalRow, goalLabel } from '../lib/intake'
import { metricsForGoal, progressPercent, type MetricDef } from '../lib/goalMetrics'
import { todayISO } from '../lib/queries'

type Point = { date: string; value: number }

function Sparkline({ points, lowerIsBetter }: { points: Point[]; lowerIsBetter: boolean }) {
  if (points.length < 2) return <div className="h-10" />
  const vals = points.map((p) => p.value)
  const min = Math.min(...vals), max = Math.max(...vals), span = max - min || 1
  const coords = points.map((p, i) => `${(i / (points.length - 1)) * 100},${36 - ((p.value - min) / span) * 32}`).join(' ')
  const improving = lowerIsBetter ? vals[vals.length - 1] <= vals[0] : vals[vals.length - 1] >= vals[0]
  return (
    <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="h-10 w-full">
      <polyline points={coords} fill="none" stroke={improving ? '#075a38' : '#f3263a'} strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

export function GoalTracker({ clientId, canLog = true, refreshKey = 0 }: { clientId: string; canLog?: boolean; refreshKey?: number }) {
  const [defs, setDefs] = useState<MetricDef[]>([])
  const [goalText, setGoalText] = useState('')
  const [points, setPoints] = useState<Record<string, Point[]>>({})
  const [loading, setLoading] = useState(true)
  const [logging, setLogging] = useState<MetricDef | null>(null)
  const [value, setValue] = useState('')
  const [date, setDate] = useState(todayISO())
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const { active } = await fetchGoalHistory(clientId)
      const metricDefs = metricsForGoal(active ? intakeFromGoalRow(active) : null, active || undefined)
      setDefs(metricDefs)
      setGoalText(active?.goal || '')
      const [{ data: ms }, { data: gm, error: gmError }] = await Promise.all([
        supabase.from('measurements').select('logged_at, created_at, body_weight, waist').eq('client_id', clientId).order('logged_at').order('created_at'),
        supabase.from('goal_metrics').select('metric, value, logged_at, created_at').eq('client_id', clientId).order('logged_at').order('created_at'),
      ])
      if (gmError) console.error('goal_metrics unavailable:', gmError)
      const byKey: Record<string, Point[]> = {}
      const push = (k: string, date: string, v: unknown) => {
        if (v === null || v === undefined) return
        ;(byKey[k] ||= []).push({ date, value: Number(v) })
      }
      for (const m of ms || []) {
        push('weight', m.logged_at, m.body_weight)
        push('waist', m.logged_at, m.waist)
      }
      for (const g of gm || []) push(g.metric, g.logged_at, g.value)
      setPoints(byKey)
    } catch (err) {
      console.error('Failed to load goal progress:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [clientId, refreshKey])

  const openLog = (def: MetricDef) => {
    setLogging(def)
    setValue('')
    setDate(todayISO())
    setNotes('')
    setError('')
  }

  const save = async () => {
    if (!logging || value === '') return
    setSaving(true)
    setError('')
    const v = parseFloat(value)
    const { error: saveError } =
      logging.source === 'metric'
        ? await supabase.from('goal_metrics').insert({ client_id: clientId, metric: logging.key, value: v, unit: logging.unit, notes: notes || null, logged_at: date })
        : await supabase.from('measurements').insert({ client_id: clientId, logged_at: date, notes: notes || null, [logging.source === 'weight' ? 'body_weight' : 'waist']: v })
    setSaving(false)
    if (saveError) {
      setError(/goal_metrics/.test(saveError.message) ? 'Goal tracking is not set up yet (database migration 009 is missing).' : saveError.message)
      return
    }
    setLogging(null)
    load()
  }

  const groups = useMemo(() => {
    const out: Record<string, MetricDef[]> = {}
    for (const d of defs) (out[d.goal] ||= []).push(d)
    return out
  }, [defs])

  return (
    <section className="card p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold text-[#0f2a3a]">Goal progress</h2>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-[#64748b]"><Target className="size-3.5 text-[#28a9e8]" />{goalText || 'No goal set yet'}</p>
        </div>
      </div>
      {loading ? (
        <p className="mt-6 text-sm text-[#64748b]">Loading…</p>
      ) : (
        <div className="mt-5 space-y-5">
          {Object.entries(groups).map(([goal, list]) => (
            <div key={goal}>
              {Object.keys(groups).length > 1 && <p className="mb-2 text-[10px] font-semibold uppercase tracking-[.14em] text-[#1787c4]">{goalLabel(goal)}</p>}
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {list.map((def) => {
                  const pts = points[def.key] || []
                  const latest = pts[pts.length - 1]?.value
                  const pct = progressPercent(def, latest)
                  return (
                    <div key={def.key} className="rounded-xl border border-[#e3eff6] p-4">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-medium text-[#64748b]">{def.label}</p>
                        {canLog && (
                          <button onClick={() => openLog(def)} className="flex items-center gap-1 rounded-lg bg-[#fde3e6] px-2 py-1 text-[11px] font-semibold text-[#f3263a]" aria-label={`Log ${def.label}`}>
                            <Plus className="size-3" />Log
                          </button>
                        )}
                      </div>
                      <p className="mt-1 font-display text-2xl font-semibold text-[#0f2a3a]">
                        {latest ?? '—'}<span className="ml-1 text-xs font-medium text-[#64748b]">{def.unit}</span>
                      </p>
                      <p className="text-[11px] text-[#64748b]">
                        {def.baseline !== undefined && `Start ${def.baseline} · `}
                        {def.target !== undefined ? `Target ${def.target}${def.unit.startsWith('/') ? def.unit : ` ${def.unit}`}` : 'No target set'}
                      </p>
                      <Sparkline points={pts} lowerIsBetter={def.lowerIsBetter} />
                      {pct !== null && (
                        <div className="mt-1">
                          <div className="h-1.5 rounded-full bg-[#e0f3fc]"><div className="h-1.5 rounded-full bg-[#28a9e8]" style={{ width: `${pct}%` }} /></div>
                          <p className="mt-1 text-[11px] font-semibold text-[#1787c4]">{pct}% of the way</p>
                        </div>
                      )}
                      {pts.length === 0 && <p className="mt-1 text-[11px] text-[#64748b]">Nothing logged yet</p>}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {logging && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f2a3a]/40 p-4" onClick={() => setLogging(null)}>
          <div className="card w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold text-[#0f2a3a]">Log {logging.label.toLowerCase()}</h3>
              <button onClick={() => setLogging(null)} aria-label="Close"><X className="size-4 text-[#64748b]" /></button>
            </div>
            {logging.hint && <p className="mt-1 text-xs text-[#64748b]">{logging.hint}</p>}
            <div className="mt-4 space-y-3">
              <div>
                <label className="label">Value ({logging.unit})</label>
                <input type="number" step="any" autoFocus value={value} onChange={(e) => setValue(e.target.value)} className="input mt-1" />
              </div>
              <div>
                <label className="label">Date</label>
                <input type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} className="input mt-1" />
              </div>
              <div>
                <label className="label">Notes</label>
                <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" className="input mt-1" />
              </div>
              {error && <p className="rounded-lg bg-[#fde3e6] px-3 py-2 text-xs text-[#f3263a]">{error}</p>}
              <button onClick={save} disabled={saving || value === ''} className="btn-primary w-full py-3 disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
