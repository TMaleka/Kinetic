import { useMemo, useState } from 'react'
import { addDays, toLocalISO } from '../lib/queries'

type Session = { status: string; scheduled_date: string }

const RANGES = [4, 8, 12] as const

export function WeeklyActivityChart({ sessions, title = 'Progress overview' }: { sessions: Session[]; title?: string }) {
  const [weeks, setWeeks] = useState<(typeof RANGES)[number]>(8)

  const data = useMemo(() => {
    const today = new Date()
    const startOfThisWeek = addDays(today, -today.getDay())
    return Array.from({ length: weeks }, (_, i) => {
      const start = addDays(startOfThisWeek, -7 * (weeks - 1 - i))
      const end = addDays(start, 6)
      const startStr = toLocalISO(start)
      const endStr = toLocalISO(end)
      const inWeek = sessions.filter((s) => s.scheduled_date >= startStr && s.scheduled_date <= endStr)
      return {
        label: start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        completed: inWeek.filter((s) => s.status === 'completed').length,
        scheduled: inWeek.length,
      }
    })
  }, [sessions, weeks])

  const max = Math.max(1, ...data.map((d) => d.scheduled))
  const totalCompleted = data.reduce((sum, d) => sum + d.completed, 0)

  return (
    <section className="card p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold text-[#1c1446]">{title}</h2>
          <p className="mt-1 text-xs text-[#64748b]">
            {totalCompleted} workouts completed in the last {weeks} weeks
          </p>
        </div>
        <select
          value={weeks}
          onChange={(e) => setWeeks(Number(e.target.value) as (typeof RANGES)[number])}
          className="rounded-lg border border-[#f3dccf] bg-white px-3 py-2 text-xs text-[#475569] outline-none hover:bg-[#fff4ec]"
        >
          {RANGES.map((r) => (
            <option key={r} value={r}>{r} weeks</option>
          ))}
        </select>
      </div>
      <div className="mt-8 flex h-44 items-end gap-2 border-b border-[#f1e4da] px-2">
        {data.map((d) => (
          <div
            key={d.label}
            className="relative flex h-full flex-1 items-end"
            title={`Week of ${d.label}: ${d.completed}/${d.scheduled} completed`}
          >
            <div className="absolute bottom-0 w-full rounded-t-md bg-[#ffe6d8]" style={{ height: `${(d.scheduled / max) * 100}%` }} />
            <div
              className="relative w-full rounded-t-md bg-[#ff4f1f] transition-all hover:bg-[#e63e10]"
              style={{ height: `${(d.completed / max) * 100}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-3 flex justify-between gap-2 px-2 text-[10px] text-[#94a3b8]">
        {data.map((d, i) => (
          <span key={d.label} className="flex-1 text-center">
            {weeks <= 8 || i % 2 === 0 ? d.label : ''}
          </span>
        ))}
      </div>
      {totalCompleted === 0 && (
        <p className="mt-4 text-center text-xs text-[#64748b]">No completed workouts in this period yet.</p>
      )}
    </section>
  )
}
