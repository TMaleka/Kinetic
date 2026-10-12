import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Dumbbell, Flame, TrendingUp, Calendar, ChevronRight, Check, Play } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { Spinner } from '../../components/ui'
import { formatDate, formatRelative, todayISO, toLocalISO, addDays } from '../../lib/queries'

function StatCard({ label, value, detail, icon: Icon, accent = 'lime' }: { label: string; value: string; detail: string; icon: any; accent?: 'lime' | 'lavender' | 'peach' }) {
  const bg = accent === 'lime' ? 'bg-[#edf3d5]' : accent === 'lavender' ? 'bg-[#eee8f3]' : 'bg-[#f7eadb]'
  return (
    <div className={`stat-card ${bg}`}>
      <div className="flex items-start justify-between">
        <div className="label">{label}</div>
        <div className="grid size-8 place-items-center rounded-xl bg-white/70 text-[#65722f]">
          <Icon className="size-4" />
        </div>
      </div>
      <div className="mt-5 font-display text-[30px] font-semibold tracking-tight text-[#25342d]">{value}</div>
      <div className="mt-1 flex items-center gap-1 text-xs text-[#778078]">
        <TrendingUp className="size-3 text-[#8da74a]" />{detail}
      </div>
    </div>
  )
}

export function ClientDashboard() {
  const { profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [todaySession, setTodaySession] = useState<any>(null)
  const [streak, setStreak] = useState(0)
  const [weekCount, setWeekCount] = useState(0)
  const [adherence, setAdherence] = useState(0)
  const [latestWeight, setLatestWeight] = useState<any>(null)
  const [weightChange, setWeightChange] = useState<number | null>(null)
  const [goal, setGoal] = useState<string | null>(null)
  const [hasTrainer, setHasTrainer] = useState(false)
  const [error, setError] = useState('')
  const [useMockData] = useState(false) // Set to false for production

  useEffect(() => {
    if (profile) loadData()
  }, [profile])

  const loadData = async () => {
    if (!profile) return
    
    // Mock data for testing (disabled in production)
    /*
    if (useMockData) {
      setTodaySession({
        id: '1',
        title: 'Upper Body Strength',
        status: 'scheduled'
      })
      setStreak(5)
      setWeekCount(4)
      setAdherence(87)
      setLatestWeight({ body_weight: 75.5 })
      setWeightChange(-2.3)
      setGoal('Build muscle mass and increase strength')
      setLoading(false)
      return
    }
    */

    try {
      const today = todayISO()
      const weekAgo = addDays(new Date(), -7)

      // Today's session
      const { data: todayData } = await supabase
        .from('workout_sessions')
        .select('*')
        .eq('client_id', profile.id)
        .eq('scheduled_date', today)
        .order('created_at', { ascending: false })
        .maybeSingle()
      setTodaySession(todayData)

      // Calculate streak from completed sessions
      const { data: completedSessions } = await supabase
        .from('workout_sessions')
        .select('scheduled_date, status')
        .eq('client_id', profile.id)
        .eq('status', 'completed')
        .order('scheduled_date', { ascending: false })

      let currentStreak = 0
      const sessions = completedSessions || []
      if (sessions.length > 0) {
        const dates = sessions.map((s) => s.scheduled_date)
        const uniqueDates = [...new Set(dates)].sort().reverse()

        const todayDate = new Date()
        const yesterdayDate = new Date()
        yesterdayDate.setDate(yesterdayDate.getDate() - 1)

        const lastSessionDate = new Date(uniqueDates[0])
        if (
          lastSessionDate.toDateString() === todayDate.toDateString() ||
          lastSessionDate.toDateString() === yesterdayDate.toDateString()
        ) {
          currentStreak = 1
          for (let i = 1; i < uniqueDates.length; i++) {
            const prev = new Date(uniqueDates[i - 1])
            const curr = new Date(uniqueDates[i])
            const diffDays = Math.round((prev.getTime() - curr.getTime()) / 86400000)
            if (diffDays <= 2) currentStreak++
            else break
          }
        }
      }
      setStreak(currentStreak)

      // Week stats
      const { data: weekSessions } = await supabase
        .from('workout_sessions')
        .select('scheduled_date, status')
        .eq('client_id', profile.id)
        .gte('scheduled_date', toLocalISO(weekAgo))
      
      const weekData = weekSessions || []
      setWeekCount(weekData.filter((s) => s.status === 'completed').length)
      
      // Calculate adherence (completed / scheduled)
      const scheduledThisWeek = weekData.length
      const completedThisWeek = weekData.filter((s) => s.status === 'completed').length
      setAdherence(scheduledThisWeek > 0 ? Math.round((completedThisWeek / scheduledThisWeek) * 100) : 0)

      // Latest weight and change
      const { data: weightData } = await supabase
        .from('measurements')
        .select('*')
        .eq('client_id', profile.id)
        .not('body_weight', 'is', null)
        .order('logged_at', { ascending: false })
        .limit(2)
      
      if (weightData && weightData.length > 0) {
        setLatestWeight(weightData[0])
        if (weightData.length > 1) {
          const change = weightData[0].body_weight - weightData[1].body_weight
          setWeightChange(change)
        }
      }

      // Goals and trainer connection
      const { data: linkGoals } = await supabase
        .from('trainer_client_links')
        .select('goals, trainer_id')
        .eq('client_id', profile.id)
        .eq('status', 'active')
        .maybeSingle()
      setGoal(linkGoals?.goals || null)
      setHasTrainer(!!linkGoals?.trainer_id)
    } catch (err) {
      console.error(err)
      setError('Failed to load dashboard data. Please refresh the page.')
    } finally {
      setLoading(false)
    }
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'GOOD MORNING'
    if (hour < 17) return 'GOOD AFTERNOON'
    return 'GOOD EVENING'
  }

  const getDayName = () => {
    return new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size={40} />
      </div>
    )
  }

  const firstName = profile?.full_name?.split(' ')[0] || 'THERE'

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-sm text-[#8b4a4a] bg-[#f5d5d5] rounded-lg px-4 py-3 mb-4">{error}</p>
          <button onClick={loadData} className="btn-primary">Retry</button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[.14em] text-[#93a84e]">{getDayName()}</p>
          <h1 className="font-display text-4xl font-semibold tracking-tight text-[#25342d]">
            {getGreeting()}, {firstName}.
          </h1>
          <p className="mt-2 text-sm text-[#7c857c]">Let's crush your goals today.</p>
        </div>
      </div>

      {todaySession ? (
        <section className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl font-semibold text-[#25342d]">Today's workout</h2>
              <p className="mt-1 text-xs text-[#929990]">{todaySession.title}</p>
            </div>
            <Link
              to={`/app/workouts/${todaySession.id}`}
              className="flex items-center gap-2 rounded-xl bg-[#25342d] px-4 py-3 text-xs font-semibold text-white"
            >
              {todaySession.status === 'completed' ? (
                <>
                  <Check className="size-4" />
                  View
                </>
              ) : (
                <>
                  <Play className="size-4" />
                  Start
                </>
              )}
            </Link>
          </div>
        </section>
      ) : (
        <section className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl font-semibold text-[#25342d]">Rest day</h2>
              <p className="mt-1 text-xs text-[#929990]">No workout scheduled today</p>
            </div>
          </div>
        </section>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Weekly adherence" value={`${adherence}%`} detail="On track this week" icon={Calendar} />
        <StatCard label="Current streak" value={`${streak} days`} detail="Personal best" icon={Flame} accent="peach" />
        <StatCard label="Workouts" value={`${weekCount}`} detail="This week" icon={Dumbbell} accent="lavender" />
      </div>

      {!hasTrainer && (
        <section className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl font-semibold text-[#25342d]">Connect with a trainer</h2>
              <p className="mt-1 text-xs text-[#929990]">Get personalized workout plans and expert guidance</p>
            </div>
            <button className="rounded-xl bg-[#25342d] px-4 py-3 text-xs font-semibold text-white">
              Find a Trainer
            </button>
          </div>
        </section>
      )}

      <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
        <section className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl font-semibold text-[#25342d]">Progress overview</h2>
              <p className="mt-1 text-xs text-[#929990]">Last 8 weeks</p>
            </div>
            <button className="rounded-lg border border-[#e5e7dd] px-3 py-2 text-xs text-[#69746a]">8 weeks⌄</button>
          </div>
          <div className="mt-8 flex h-44 items-end gap-3 border-b border-[#eceee5] px-2">
            {[38, 48, 43, 65, 58, 72, 68, 83, 78, 92].map((v, i) => (
              <div key={i} className="flex flex-1 items-end">
                <div
                  className="w-full rounded-t-md bg-[#b9cd69] transition-all hover:bg-[#a5bd55]"
                  style={{ height: `${v}%` }}
                />
              </div>
            ))}
          </div>
          <div className="mt-3 flex justify-between text-[10px] text-[#a1a8a0]">
            <span>May</span>
            <span>Jun</span>
            <span>Jul</span>
            <span>Aug</span>
          </div>
        </section>

        <section className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl font-semibold text-[#25342d]">Key metrics</h2>
              <p className="mt-1 text-xs text-[#929990]">Progress at a glance</p>
            </div>
          </div>
          <div className="mt-6 space-y-4">
            {latestWeight && (
              <div className="flex items-center justify-between rounded-xl bg-[#f8f8f4] p-4">
                <div>
                  <p className="text-xs text-[#969f96]">Weight</p>
                  <p className="text-lg font-semibold text-[#25342d]">{latestWeight.body_weight}kg</p>
                </div>
                <span className={`text-xs font-semibold ${
                  weightChange && weightChange < 0 ? 'text-[#718b33]' : 'text-[#ad784b]'
                }`}>
                  {weightChange && weightChange < 0 ? '↓' : weightChange && weightChange > 0 ? '↑' : ''} {weightChange ? Math.abs(weightChange).toFixed(1) : '0'}kg
                </span>
              </div>
            )}
            <div className="flex items-center justify-between rounded-xl bg-[#f8f8f4] p-4">
              <div>
                <p className="text-xs text-[#969f96]">Workouts</p>
                <p className="text-lg font-semibold text-[#25342d]">{weekCount}</p>
              </div>
              <span className="text-xs font-semibold text-[#718b33]">+{weekCount}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-[#f8f8f4] p-4">
              <div>
                <p className="text-xs text-[#969f96]">Adherence</p>
                <p className="text-lg font-semibold text-[#25342d]">{adherence}%</p>
              </div>
              <span className={`text-xs font-semibold ${
                adherence >= 80 ? 'text-[#718b33]' : adherence >= 60 ? 'text-[#ad784b]' : 'text-[#8b4a4a]'
              }`}>
                {adherence >= 80 ? 'Excellent' : adherence >= 60 ? 'Good' : 'Needs work'}
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
