import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ClipboardCheck, MessageCircle } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { Spinner, Hint } from '../../components/ui'
import { addActivityEvent } from '../../lib/queries'
import { createNotification } from '../../lib/notifications'
import { CHECKIN_QUESTIONS, fetchCheckins, formatWeek, saveCheckin, scoreTone, syncCheckinWeight, weekStartISO, type CheckinScores, type WeeklyCheckin } from '../../lib/checkins'

const TONE = { good: 'bg-[#d6f0e3] text-[#075a38]', ok: 'bg-[#e0f3fc] text-[#1787c4]', bad: 'bg-[#fde3e6] text-[#f3263a]' }

export function CheckinScoreChips({ checkin }: { checkin: CheckinScores }) {
  return (
    <div className="flex flex-wrap gap-2">
      {CHECKIN_QUESTIONS.map((q) => (
        <span key={q.key} className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${TONE[scoreTone(checkin[q.key], q.highIsBad)]}`}>
          {q.key === 'training' ? 'Training' : q.label} {checkin[q.key]}/5
        </span>
      ))}
    </div>
  )
}

export function ClientCheckin() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const weekStart = weekStartISO()
  const [loading, setLoading] = useState(true)
  const [available, setAvailable] = useState(true)
  const [trainerIds, setTrainerIds] = useState<string[]>([])
  const [history, setHistory] = useState<WeeklyCheckin[]>([])
  const [scores, setScores] = useState<Partial<CheckinScores>>({})
  const [wins, setWins] = useState('')
  const [struggles, setStruggles] = useState('')
  const [weight, setWeight] = useState('')
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    if (!profile) return
    ;(async () => {
      try {
        const { data: links } = await supabase
          .from('trainer_client_links')
          .select('trainer_id')
          .eq('client_id', profile.id)
          .eq('status', 'active')
          .order('started_at', { ascending: true })
        setTrainerIds((links || []).map((l) => l.trainer_id))
        const rows = await fetchCheckins([profile.id], 12)
        if (rows === null) setAvailable(false)
        else {
          setHistory(rows)
          const current = rows.find((r) => r.week_start === weekStart)
          if (current) {
            const { training, energy, sleep, stress, soreness } = current
            setScores({ training, energy, sleep, stress, soreness })
            setWins(current.wins || '')
            setStruggles(current.struggles || '')
            setWeight(current.body_weight != null ? String(current.body_weight) : '')
          } else setEditing(true)
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    })()
  }, [profile])

  if (loading) return <div className="flex min-h-screen items-center justify-center"><Spinner size={40} /></div>
  if (!profile) return null

  const current = history.find((r) => r.week_start === weekStart)
  const complete = CHECKIN_QUESTIONS.every((q) => scores[q.key])

  const handleSubmit = async () => {
    if (!complete) return
    setSaving(true)
    try {
      const parsed = weight.trim() ? parseFloat(weight) : null
      const bodyWeight = parsed != null && !Number.isNaN(parsed) ? parsed : null
      const saved = await saveCheckin({
        client_id: profile.id,
        trainer_id: trainerIds[0] ?? null,
        week_start: weekStart,
        training: scores.training!,
        energy: scores.energy!,
        sleep: scores.sleep!,
        stress: scores.stress!,
        soreness: scores.soreness!,
        wins,
        struggles,
        body_weight: bodyWeight,
      })
      await syncCheckinWeight(saved, current ? current.body_weight : undefined)
      await Promise.all(
        trainerIds.map((id) =>
          createNotification(id, 'checkin_submitted', 'Weekly check-in', `${profile.full_name} ${current ? 'updated' : 'sent'} their weekly check-in.`, { client_id: profile.id, checkin_id: saved.id }),
        ),
      )
      if (!current) await addActivityEvent(profile.id, trainerIds[0] ?? null, 'checkin_submitted', 'Weekly check-in submitted')
      navigate('/app', { replace: true })
    } catch (err: any) {
      console.error(err)
      alert(`Could not save your check-in: ${err?.message || 'Unknown error'}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-7">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[.14em] text-[#1787c4]">{formatWeek(weekStart)}</p>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-[#0f2a3a]">Weekly check-in</h1>
        <p className="mt-2 text-sm text-[#64748b]">30 seconds. Your trainer uses it to plan your next week.</p>
      </div>

      {!available ? (
        <Hint title="Check-ins are almost ready" icon={<ClipboardCheck className="size-5" />}>
          Weekly check-ins switch on soon. Check back in a day or two.
        </Hint>
      ) : (
        <>
          {trainerIds.length === 0 && (
            <Hint title="No trainer yet" icon={<ClipboardCheck className="size-5" />} action={<Link to="/app/profile" className="btn-secondary">Go to Profile</Link>}>
              You can still check in. Once you accept your trainer's invitation, they'll see your check-ins.
            </Hint>
          )}

          {current && !editing ? (
            <section className="card p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl font-semibold text-[#0f2a3a]">You're checked in</h2>
                  <p className="mt-1 text-xs text-[#64748b]">Sent for this week. You can update it until Sunday.</p>
                </div>
                <button className="btn-secondary" onClick={() => setEditing(true)}>Edit</button>
              </div>
              <div className="mt-5"><CheckinScoreChips checkin={current} /></div>
              {current.trainer_reply && (
                <div className="mt-5 flex gap-3 rounded-xl bg-[#eef7fc] p-4">
                  <MessageCircle className="mt-0.5 size-4 shrink-0 text-[#1787c4]" />
                  <div>
                    <p className="text-xs font-semibold text-[#0f2a3a]">Your trainer replied</p>
                    <p className="mt-1 text-sm text-[#334155]">{current.trainer_reply}</p>
                  </div>
                </div>
              )}
            </section>
          ) : (
            <section className="card p-6">
              <div className="space-y-6">
                {CHECKIN_QUESTIONS.map((q) => (
                  <div key={q.key}>
                    <p className="text-sm font-semibold text-[#0f2a3a]">{q.label}</p>
                    <div className="mt-2 grid grid-cols-5 gap-2">
                      {[1, 2, 3, 4, 5].map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setScores((s) => ({ ...s, [q.key]: v }))}
                          className={`rounded-xl border py-3 text-sm font-semibold transition ${
                            scores[q.key] === v ? 'border-[#28a9e8] bg-[#28a9e8] text-white' : 'border-[#d9e9f2] bg-white text-[#334155] hover:bg-[#eef7fc]'
                          }`}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                    <div className="mt-1 flex justify-between text-[11px] text-[#94a3b8]"><span>{q.low}</span><span>{q.high}</span></div>
                  </div>
                ))}
                <div>
                  <label className="label">Wins this week <span className="font-normal text-[#94a3b8]">(optional)</span></label>
                  <textarea className="input min-h-[72px]" value={wins} onChange={(e) => setWins(e.target.value)} placeholder="e.g. Hit a new squat PB, drank more water" maxLength={2000} />
                </div>
                <div>
                  <label className="label">Anything getting in the way? <span className="font-normal text-[#94a3b8]">(optional)</span></label>
                  <textarea className="input min-h-[72px]" value={struggles} onChange={(e) => setStruggles(e.target.value)} placeholder="e.g. Busy at work, knee felt tight" maxLength={2000} />
                </div>
                <div className="max-w-[200px]">
                  <label className="label">Weight (kg) <span className="font-normal text-[#94a3b8]">(optional)</span></label>
                  <input type="number" step="0.1" className="input" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="0.0" />
                </div>
                <button onClick={handleSubmit} disabled={!complete || saving} className="btn-primary w-full">
                  {saving ? 'Sending…' : current ? 'Update check-in' : 'Send check-in'}
                </button>
                {!complete && <p className="-mt-3 text-center text-xs text-[#94a3b8]">Answer all five to send.</p>}
              </div>
            </section>
          )}

          {history.filter((h) => h.week_start !== weekStart).length > 0 && (
            <section className="card p-6">
              <h2 className="font-display text-xl font-semibold text-[#0f2a3a]">Past check-ins</h2>
              <div className="mt-5 space-y-3">
                {history.filter((h) => h.week_start !== weekStart).map((h) => (
                  <div key={h.id} className="rounded-xl border border-[#e3eff6] p-4">
                    <p className="mb-2 text-xs font-semibold text-[#64748b]">{formatWeek(h.week_start)}</p>
                    <CheckinScoreChips checkin={h} />
                    {h.trainer_reply && <p className="mt-3 text-sm text-[#334155]"><b>Trainer:</b> {h.trainer_reply}</p>}
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
