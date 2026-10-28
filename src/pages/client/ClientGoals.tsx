import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Pencil, Calendar, TrendingUp } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { fetchGoalHistory } from '../../lib/activeGoal'
import { intakeFromGoalRow } from '../../lib/intake'
import { ClientIntakeSummary } from '../../components/ClientIntakeSummary'
import { GoalTracker } from '../../components/GoalTracker'
import { Spinner } from '../../components/ui'

const STATUS: Record<string, [string, string]> = {
  pending: ['Waiting for trainer review', 'bg-[#fff4d6] text-[#a16207]'],
  confirmed: ['Confirmed by trainer', 'bg-[#dcf3e7] text-[#075a38]'],
  adjusted: ['Adjusted by trainer', 'bg-[#e0f3fc] text-[#1787c4]'],
  rejected: ['Not approved', 'bg-[#fde3e6] text-[#f3263a]'],
}

export function ClientGoals() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [rows, setRows] = useState<any[]>([])
  const [active, setActive] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    fetchGoalHistory(profile.id)
      .then(({ rows, active }) => {
        setRows(rows)
        setActive(active)
      })
      .catch((err) => console.error('Failed to load goals:', err))
      .finally(() => setLoading(false))
  }, [profile])

  if (loading || !profile) return <div className="flex justify-center py-20"><Spinner /></div>

  const latest = rows[0]
  const details = active ? intakeFromGoalRow(active) : null
  const deadline = details?.targetDate || active?.target_date
  const daysLeft = deadline ? Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000) : null

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[.14em] text-[#1787c4]">Your journey</p>
          <h1 className="font-display text-4xl font-semibold tracking-tight text-[#0f2a3a]">My goals</h1>
          <p className="mt-2 text-sm text-[#64748b]">What you're working towards. Update it any time — your trainer reviews every change.</p>
        </div>
        <button onClick={() => navigate('/app/goals/edit')} className="flex w-fit items-center gap-2 rounded-xl bg-[#f3263a] px-4 py-3 text-xs font-semibold text-white">
          <Pencil className="size-4" />{active ? 'Update my goals' : 'Set my goals'}
        </button>
      </div>

      {latest && latest !== active && latest.status === 'rejected' && (
        <p className="rounded-xl bg-[#fde3e6] px-4 py-3 text-sm text-[#f3263a]">Your trainer didn't approve your last update ({latest.goal}). Talk to them, or send a new update.</p>
      )}

      {active ? (
        <>
          <section className="card p-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className={`badge ${STATUS[active.status]?.[1]}`}>{STATUS[active.status]?.[0]}</span>
              {daysLeft !== null && (
                <span className="flex items-center gap-1 text-xs text-[#64748b]"><Calendar className="size-3.5" />{daysLeft >= 0 ? `${daysLeft} days to go` : `Deadline passed ${-daysLeft} days ago`}</span>
              )}
            </div>
            <p className="mt-3 font-display text-2xl font-semibold text-[#0f2a3a]">{active.goal}</p>
            <div className="mt-6">
              {details ? <ClientIntakeSummary details={details} /> : <p className="text-sm text-[#64748b]">Update your goals to add measurable targets, your deadline and what success looks like.</p>}
            </div>
          </section>
          <GoalTracker clientId={profile.id} />
          <button onClick={() => navigate('/app/progress')} className="flex w-fit items-center gap-2 text-xs font-semibold text-[#1787c4]"><TrendingUp className="size-4" />See all progress</button>
        </>
      ) : (
        <section className="card p-6 text-sm text-[#64748b]">You haven't set a goal yet.</section>
      )}

      {rows.length > 1 && (
        <section className="card p-6">
          <h2 className="font-display text-xl font-semibold text-[#0f2a3a]">Goal history</h2>
          <ul className="mt-4 divide-y divide-[#e3eff6]">
            {rows.map((g) => (
              <li key={g.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <div>
                  <p className="font-medium text-[#0f2a3a]">{g.goal}</p>
                  <p className="text-xs text-[#64748b]">{new Date(g.created_at).toLocaleDateString()}</p>
                </div>
                <span className={`badge ${STATUS[g.status]?.[1]}`}>{g.status}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
