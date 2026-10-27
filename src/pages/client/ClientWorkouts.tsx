import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, CheckCircle2, XCircle, PlayCircle, Calendar } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { Spinner } from '../../components/ui'
import { formatDate, todayISO, toLocalISO, addDays, effectiveStatus } from '../../lib/queries'

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

export function ClientWorkouts() {
  const { profile } = useAuth()
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [weekData, setWeekData] = useState<any[]>([])
  const [useMockData] = useState(false) // Set to false for production

  useEffect(() => {
    if (profile) loadSessions()
  }, [profile])

  const loadSessions = async () => {
    if (!profile) return
    
    // Mock data for testing (disabled in production)
    /*
    if (useMockData) {
      const today = new Date()
      const startOfWeek = addDays(today, -today.getDay())
      
      const mockSessions = [
        {
          id: 'session-1',
          title: 'Upper Body Strength',
          scheduled_date: toLocalISO(addDays(startOfWeek, 0)),
          status: 'completed',
          feeling: 5
        },
        {
          id: 'session-2',
          title: 'Lower Body Power',
          scheduled_date: toLocalISO(addDays(startOfWeek, 1)),
          status: 'completed',
          feeling: 4
        },
        {
          id: 'session-3',
          title: 'Core & Cardio',
          scheduled_date: toLocalISO(addDays(startOfWeek, 2)),
          status: 'missed',
          feeling: null
        },
        {
          id: 'session-4',
          title: 'Full Body HIIT',
          scheduled_date: toLocalISO(addDays(startOfWeek, 3)),
          status: 'completed',
          feeling: 5
        },
        {
          id: 'session-5',
          title: 'Upper Body Strength',
          scheduled_date: toLocalISO(addDays(startOfWeek, 4)),
          status: 'scheduled',
          feeling: null
        },
        {
          id: 'session-6',
          title: 'Lower Body Hypertrophy',
          scheduled_date: toLocalISO(addDays(startOfWeek, 5)),
          status: 'scheduled',
          feeling: null
        },
        {
          id: 'session-7',
          title: 'Active Recovery',
          scheduled_date: toLocalISO(addDays(startOfWeek, 6)),
          status: 'scheduled',
          feeling: null
        }
      ]
      
      setSessions(mockSessions)
      
      // Build week data
      const week: any[] = []
      for (let i = 0; i < 7; i++) {
        const date = addDays(startOfWeek, i)
        const dateStr = toLocalISO(date)
        const daySession = mockSessions.find((s) => s.scheduled_date === dateStr)
        week.push({
          day: DAYS[i],
          date: dateStr,
          isToday: dateStr === todayISO(),
          session: daySession || null,
        })
      }
      setWeekData(week)
      setLoading(false)
      return
    }
    */
    
    try {
      const today = new Date()
      const startOfWeek = addDays(today, -today.getDay())
      
      const { data } = await supabase
        .from('workout_sessions')
        .select('*')
        .eq('client_id', profile.id)
        .gte('scheduled_date', toLocalISO(startOfWeek))
        .order('scheduled_date', { ascending: true })

      const withStatus = (data || []).map((s) => ({ ...s, status: effectiveStatus(s) }))
      setSessions(withStatus)
      
      // Build week data
      const week: any[] = []
      for (let i = 0; i < 7; i++) {
        const date = addDays(startOfWeek, i)
        const dateStr = toLocalISO(date)
        const daySession = withStatus.find((s) => s.scheduled_date === dateStr)
        week.push({
          day: DAYS[i],
          date: dateStr,
          isToday: dateStr === todayISO(),
          session: daySession || null,
        })
      }
      setWeekData(week)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size={40} />
      </div>
    )
  }

  const upcoming = sessions.filter((s) => s.status === 'scheduled' || s.status === 'in_progress')
  const completed = sessions.filter((s) => s.status === 'completed')
  const missed = sessions.filter((s) => s.status === 'missed')

  const statusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 size={20} />
      case 'missed': return <XCircle size={20} />
      case 'in_progress': return <PlayCircle size={20} />
      default: return null
    }
  }

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[.14em] text-[#1787c4]">Your fitness</p>
          <h1 className="font-display text-4xl font-semibold tracking-tight text-[#0f2a3a]">Workouts</h1>
          <p className="mt-2 text-sm text-[#64748b]">Track your training progress.</p>
        </div>
      </div>

      {/* This Week */}
      <section className="card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold text-[#0f2a3a]">This week</h2>
            <p className="mt-1 text-xs text-[#64748b]">Your weekly schedule</p>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-7 gap-2">
          {weekData.map((day) => (
            <div
              key={day.date}
              className={`text-center py-3 border-b-2 ${
                day.isToday ? 'border-[#28a9e8]' : 'border-[#dceaf2]'
              }`}
            >
              <p className={`text-[10px] font-semibold uppercase tracking-[.12em] ${
                day.isToday ? 'text-[#0f2a3a]' : 'text-[#94a3b8]'
              }`}>
                {day.day}
              </p>
              {day.session ? (
                <Link to={`/app/workouts/${day.session.id}`} title={day.session.title} className="mt-2 block">
                  <div className={`grid size-8 mx-auto place-items-center rounded-full ${
                    day.session.status === 'completed' ? 'bg-[#d6f0e3] text-[#075a38]' :
                    day.session.status === 'missed' ? 'bg-[#fde3e6] text-[#f3263a]' :
                    day.session.status === 'in_progress' ? 'bg-[#dff2fc] text-[#1787c4]' :
                    'bg-[#f1f5f9] text-[#64748b]'
                  }`}>
                    {statusIcon(day.session.status) || <Calendar className="size-4" />}
                  </div>
                </Link>
              ) : (
                <div className="mt-2">
                  <span className="text-[#cbd5e1]">—</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <section className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl font-semibold text-[#0f2a3a]">Upcoming</h2>
              <p className="mt-1 text-xs text-[#64748b]">Scheduled workouts</p>
            </div>
          </div>
          <div className="mt-6 space-y-3">
            {upcoming.map((s) => (
              <Link
                key={s.id}
                to={`/app/workouts/${s.id}`}
                className="flex items-center gap-4 rounded-xl border border-[#e3eff6] p-4 hover:bg-[#eef7fc] transition"
              >
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#dff2fc] text-[#1787c4]">
                  <Calendar className="size-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[#1e293b]">{s.title}</p>
                  <p className="text-xs text-[#64748b]">{formatDate(s.scheduled_date)}</p>
                </div>
                <ChevronRight className="size-4 text-[#94a3b8]" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <section className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl font-semibold text-[#0f2a3a]">Completed</h2>
              <p className="mt-1 text-xs text-[#64748b]">{completed.length} workouts finished</p>
            </div>
          </div>
          <div className="mt-6 space-y-3">
            {completed.map((s) => (
              <Link
                key={s.id}
                to={`/app/workouts/${s.id}`}
                className="flex items-center gap-4 rounded-xl border border-[#e3eff6] p-4 hover:bg-[#eef7fc] transition"
              >
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#d6f0e3] text-[#075a38]">
                  <CheckCircle2 className="size-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[#1e293b]">{s.title}</p>
                  <p className="text-xs text-[#64748b]">{formatDate(s.scheduled_date)}</p>
                </div>
                {s.feeling && (
                  <span className="text-[#1787c4]">{'★'.repeat(s.feeling)}</span>
                )}
                <ChevronRight className="size-4 text-[#94a3b8]" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Missed */}
      {missed.length > 0 && (
        <section className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl font-semibold text-[#0f2a3a]">Missed</h2>
              <p className="mt-1 text-xs text-[#64748b]">{missed.length} workouts missed</p>
            </div>
          </div>
          <div className="mt-6 space-y-3">
            {missed.map((s) => (
              <Link key={s.id} to={`/app/workouts/${s.id}`} className="flex items-center gap-4 rounded-xl border border-[#e3eff6] p-4 opacity-60 hover:opacity-100 transition">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#fde3e6] text-[#f3263a]">
                  <XCircle className="size-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[#1e293b]">{s.title}</p>
                  <p className="text-xs text-[#64748b]">{formatDate(s.scheduled_date)}</p>
                </div>
                <span className="badge bg-[#fde3e6] text-[#f3263a]">Missed</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {sessions.length === 0 && (
        <div className="flex items-center justify-center rounded-2xl border border-[#d9e9f2] bg-white p-12">
          <p className="text-sm text-[#64748b]">No workouts scheduled yet.</p>
        </div>
      )}
    </div>
  )
}
