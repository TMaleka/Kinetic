import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Dumbbell, Flame, TrendingUp, Calendar, ChevronRight, Check, Play } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { Spinner } from '../../components/ui'
import { todayISO, toLocalISO, addDays, adherencePercent, computeStreak } from '../../lib/queries'
import { WeeklyActivityChart } from '../../components/WeeklyActivityChart'

function StatCard({ label, value, detail, icon: Icon, accent = 'lime' }: { label: string; value: string; detail: string; icon: any; accent?: 'lime' | 'lavender' | 'peach' }) {
  const bg = accent === 'lime' ? 'bg-[#d9f99d]' : accent === 'lavender' ? 'bg-[#ddd6fe]' : 'bg-[#fed7aa]'
  return (
    <div className={`stat-card ${bg}`}>
      <div className="flex items-start justify-between">
        <div className="label">{label}</div>
        <div className="grid size-8 place-items-center rounded-xl bg-white/70 text-[#3f6212]">
          <Icon className="size-4" />
        </div>
      </div>
      <div className="mt-5 font-display text-[30px] font-semibold tracking-tight text-[#1c1446]">{value}</div>
      <div className="mt-1 flex items-center gap-1 text-xs text-[#64748b]">
        <TrendingUp className="size-3 text-[#16a34a]" />{detail}
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
  const [recentSessions, setRecentSessions] = useState<any[]>([])
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
        .limit(1)
      setTodaySession(todayData?.[0] ?? null)

      // Last 12 weeks of sessions for streak, weekly stats and the activity chart
      const { data: sessionHistory } = await supabase
        .from('workout_sessions')
        .select('status, scheduled_date')
        .eq('client_id', profile.id)
        .gte('scheduled_date', toLocalISO(addDays(new Date(), -7 * 12)))
        .lte('scheduled_date', today)
      const history = sessionHistory || []
      setRecentSessions(history)
      setStreak(computeStreak(history))

      const weekData = history.filter((s) => s.scheduled_date >= toLocalISO(weekAgo))
      setWeekCount(weekData.filter((s) => s.status === 'completed').length)
      setAdherence(adherencePercent(weekData))

      // Latest weight and change
      const { data: weightData } = await supabase
        .from('measurements')
        .select('*')
        .eq('client_id', profile.id)
        .not('body_weight', 'is', null)
        .order('logged_at', { ascending: false })
        .order('created_at', { ascending: false })
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
          <p className="text-sm text-[#dc2626] bg-[#fee2e2] rounded-lg px-4 py-3 mb-4">{error}</p>
          <button onClick={loadData} className="btn-primary">Retry</button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[.14em] text-[#7c3aed]">{getDayName()}</p>
          <h1 className="font-display text-4xl font-semibold tracking-tight text-[#1c1446]">
            {getGreeting()}, {firstName}.
          </h1>
          <p className="mt-2 text-sm text-[#64748b]">Let's crush your goals today.</p>
        </div>
      </div>

      {todaySession ? (
        <section className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl font-semibold text-[#1c1446]">Today's workout</h2>
              <p className="mt-1 text-xs text-[#64748b]">{todaySession.title}</p>
            </div>
            <Link
              to={`/app/workouts/${todaySession.id}`}
              className="flex items-center gap-2 rounded-xl bg-[#ff4f1f] px-4 py-3 text-xs font-semibold text-white"
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
              <h2 className="font-display text-xl font-semibold text-[#1c1446]">Rest day</h2>
              <p className="mt-1 text-xs text-[#64748b]">No workout scheduled today</p>
            </div>
          </div>
        </section>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Weekly adherence" value={`${adherence}%`} detail={adherence >= 80 ? 'On track this week' : 'Last 7 days'} icon={Calendar} />
        <StatCard label="Current streak" value={`${streak} ${streak === 1 ? 'day' : 'days'}`} detail="Consecutive workout days" icon={Flame} accent="peach" />
        <StatCard label="Workouts" value={`${weekCount}`} detail="Completed in the last 7 days" icon={Dumbbell} accent="lavender" />
      </div>

      {!hasTrainer && (
        <section className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl font-semibold text-[#1c1446]">Connect with a trainer</h2>
              <p className="mt-1 text-xs text-[#64748b]">
                Ask your trainer to invite <span className="font-semibold">{profile?.email}</span>, then accept the invitation on your profile.
              </p>
            </div>
            <Link to="/app/profile" className="shrink-0 rounded-xl bg-[#ff4f1f] px-4 py-3 text-xs font-semibold text-white hover:bg-[#e63e10] transition">
              View invitations
            </Link>
          </div>
        </section>
      )}

      <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
        <WeeklyActivityChart sessions={recentSessions} />

        <section className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl font-semibold text-[#1c1446]">Key metrics</h2>
              <p className="mt-1 text-xs text-[#64748b]">Progress at a glance</p>
            </div>
          </div>
          <div className="mt-6 space-y-4">
            {latestWeight && (
              <div className="flex items-center justify-between rounded-xl bg-[#fff4ec] p-4">
                <div>
                  <p className="text-xs text-[#64748b]">Weight</p>
                  <p className="text-lg font-semibold text-[#1c1446]">{latestWeight.body_weight}kg</p>
                </div>
                <span className={`text-xs font-semibold ${
                  weightChange && weightChange < 0 ? 'text-[#15803d]' : 'text-[#ea580c]'
                }`}>
                  {weightChange && weightChange < 0 ? '↓' : weightChange && weightChange > 0 ? '↑' : ''} {weightChange ? Math.abs(weightChange).toFixed(1) : '0'}kg
                </span>
              </div>
            )}
            <div className="flex items-center justify-between rounded-xl bg-[#fff4ec] p-4">
              <div>
                <p className="text-xs text-[#64748b]">Workouts this week</p>
                <p className="text-lg font-semibold text-[#1c1446]">{weekCount}</p>
              </div>
              <span className="text-xs font-semibold text-[#15803d]">{streak > 0 ? `${streak}-day streak` : ''}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-[#fff4ec] p-4">
              <div>
                <p className="text-xs text-[#64748b]">Adherence</p>
                <p className="text-lg font-semibold text-[#1c1446]">{adherence}%</p>
              </div>
              <span className={`text-xs font-semibold ${
                adherence >= 80 ? 'text-[#15803d]' : adherence >= 60 ? 'text-[#ea580c]' : 'text-[#dc2626]'
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
