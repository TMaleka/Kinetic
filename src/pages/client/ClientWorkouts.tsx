import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, CheckCircle2, XCircle, PlayCircle, Calendar, BellRing } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { Spinner, Hint } from '../../components/ui'
import { formatDate, todayISO, toLocalISO, addDays, effectiveStatus } from '../../lib/queries'
import { buildSessionsCalendar, downloadCalendar } from '../../lib/reminders'

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

export function ClientWorkouts() {
  const { profile } = useAuth()
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [weekData, setWeekData] = useState<any[]>([])
  const [showCalendar, setShowCalendar] = useState(false)
  const [trainTime, setTrainTime] = useState(() => localStorage.getItem('kinetic:trainTime') || '17:30')
  const [alertMinutes, setAlertMinutes] = useState(60)
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

  const handleAddToCalendar = () => {
    localStorage.setItem('kinetic:trainTime', trainTime)
    const today = todayISO()
    downloadCalendar(buildSessionsCalendar(upcoming.filter((s) => s.scheduled_date >= today), trainTime, 60, alertMinutes))
    setShowCalendar(false)
  }

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
        {upcoming.length > 0 && (
          <button onClick={() => setShowCalendar(true)} className="flex w-fit items-center gap-2 rounded-xl border border-[#d9e9f2] bg-white px-4 py-3 text-xs font-semibold text-[#334155] hover:bg-[#eef7fc]">
            <BellRing className="size-4 text-[#1787c4]" />Remind me: add to calendar
          </button>
        )}
      </div>

      {showCalendar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6" onClick={() => setShowCalendar(false)}>
          <div className="card w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-display text-xl font-semibold text-[#0f2a3a]">Get workout reminders</h2>
            <p className="mt-2 text-xs leading-relaxed text-[#64748b]">
              Adds your {upcoming.length} upcoming {upcoming.length === 1 ? 'workout' : 'workouts'} to your phone's calendar with an alert, so you get a reminder even when KineTic is closed. Do this again when your trainer assigns a new plan.
            </p>
            <div className="mt-5 space-y-4">
              <div>
                <label className="label">I usually train at</label>
                <input type="time" className="input" value={trainTime} onChange={(e) => setTrainTime(e.target.value || '17:30')} />
              </div>
              <div>
                <label className="label">Remind me</label>
                <select className="input" value={alertMinutes} onChange={(e) => setAlertMinutes(Number(e.target.value))}>
                  <option value={30}>30 minutes before</option>
                  <option value={60}>1 hour before</option>
                  <option value={120}>2 hours before</option>
                  <option value={720}>The morning of (12 hours before)</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button className="btn-secondary flex-1" onClick={() => setShowCalendar(false)}>Cancel</button>
                <button className="btn-primary flex-1" onClick={handleAddToCalendar}>Add to calendar</button>
              </div>
            </div>
          </div>
        </div>
      )}

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
        <Hint
          title="No workouts yet"
          icon={<Calendar className="size-5" />}
          action={<Link to="/app/profile" className="btn-secondary">Go to Profile</Link>}
        >
          Your workouts show up here once your trainer assigns you a plan. Not connected to a trainer yet? Accept their invitation on your Profile page.
        </Hint>
      )}
    </div>
  )
}
