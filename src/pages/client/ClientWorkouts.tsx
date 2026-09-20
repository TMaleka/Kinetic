import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, CheckCircle2, XCircle, PlayCircle, Calendar } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { Spinner } from '../../components/ui'
import { formatDate, todayISO, toLocalISO, addDays } from '../../lib/queries'

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
      
      setSessions(data || [])
      
      // Build week data
      const week: any[] = []
      for (let i = 0; i < 7; i++) {
        const date = addDays(startOfWeek, i)
        const dateStr = toLocalISO(date)
        const daySession = data?.find((s) => s.scheduled_date === dateStr)
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
          <p className="mb-2 text-xs font-semibold uppercase tracking-[.14em] text-[#93a84e]">Your fitness</p>
          <h1 className="font-display text-4xl font-semibold tracking-tight text-[#25342d]">Workouts</h1>
          <p className="mt-2 text-sm text-[#7c857c]">Track your training progress.</p>
        </div>
      </div>

      {/* This Week */}
      <section className="card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold text-[#25342d]">This week</h2>
            <p className="mt-1 text-xs text-[#929990]">Your weekly schedule</p>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-7 gap-2">
          {weekData.map((day) => (
            <div
              key={day.date}
              className={`text-center py-3 border-b-2 ${
                day.isToday ? 'border-[#b9cd69]' : 'border-[#eceee5]'
              }`}
            >
              <p className={`text-[10px] font-semibold uppercase tracking-[.12em] ${
                day.isToday ? 'text-[#25342d]' : 'text-[#a1a8a0]'
              }`}>
                {day.day}
              </p>
              {day.session ? (
                <div className="mt-2">
                  <div className={`grid size-8 mx-auto place-items-center rounded-full ${
                    day.session.status === 'completed' ? 'bg-[#edf3d5] text-[#718b33]' :
                    day.session.status === 'missed' ? 'bg-[#f5d5d5] text-[#8b4a4a]' :
                    day.session.status === 'in_progress' ? 'bg-[#f7eadb] text-[#ad784b]' :
                    'bg-[#f0f1eb] text-[#8d978d]'
                  }`}>
                    {statusIcon(day.session.status)}
                  </div>
                </div>
              ) : (
                <div className="mt-2">
                  <span className="text-[#d4d8d2]">—</span>
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
              <h2 className="font-display text-xl font-semibold text-[#25342d]">Upcoming</h2>
              <p className="mt-1 text-xs text-[#929990]">Scheduled workouts</p>
            </div>
          </div>
          <div className="mt-6 space-y-3">
            {upcoming.map((s) => (
              <Link
                key={s.id}
                to={`/app/workouts/${s.id}`}
                className="flex items-center gap-4 rounded-xl border border-[#edf0e8] p-4 hover:bg-[#f8f8f4] transition"
              >
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#f7eadb] text-[#ad784b]">
                  <Calendar className="size-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[#3d4b40]">{s.title}</p>
                  <p className="text-xs text-[#969f96]">{formatDate(s.scheduled_date)}</p>
                </div>
                <ChevronRight className="size-4 text-[#aab2a8]" />
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
              <h2 className="font-display text-xl font-semibold text-[#25342d]">Completed</h2>
              <p className="mt-1 text-xs text-[#929990]">{completed.length} workouts finished</p>
            </div>
          </div>
          <div className="mt-6 space-y-3">
            {completed.map((s) => (
              <Link
                key={s.id}
                to={`/app/workouts/${s.id}`}
                className="flex items-center gap-4 rounded-xl border border-[#edf0e8] p-4 hover:bg-[#f8f8f4] transition"
              >
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#edf3d5] text-[#718b33]">
                  <CheckCircle2 className="size-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[#3d4b40]">{s.title}</p>
                  <p className="text-xs text-[#969f96]">{formatDate(s.scheduled_date)}</p>
                </div>
                {s.feeling && (
                  <span className="text-[#ad784b]">{'★'.repeat(s.feeling)}</span>
                )}
                <ChevronRight className="size-4 text-[#aab2a8]" />
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
              <h2 className="font-display text-xl font-semibold text-[#25342d]">Missed</h2>
              <p className="mt-1 text-xs text-[#929990]">{missed.length} workouts missed</p>
            </div>
          </div>
          <div className="mt-6 space-y-3">
            {missed.map((s) => (
              <div key={s.id} className="flex items-center gap-4 rounded-xl border border-[#edf0e8] p-4 opacity-50">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#f5d5d5] text-[#8b4a4a]">
                  <XCircle className="size-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[#3d4b40]">{s.title}</p>
                  <p className="text-xs text-[#969f96]">{formatDate(s.scheduled_date)}</p>
                </div>
                <span className="badge bg-[#f5d5d5] text-[#8b4a4a]">Missed</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {sessions.length === 0 && (
        <div className="flex items-center justify-center rounded-2xl border border-[#e5e7dd] bg-white p-12">
          <p className="text-sm text-[#969f96]">No workouts scheduled yet.</p>
        </div>
      )}
    </div>
  )
}
