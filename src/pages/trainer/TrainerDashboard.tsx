import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, CalendarDays, Target, Users, TrendingUp, ArrowUpRight, Plus, Activity, CheckCircle } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { Spinner } from '../../components/ui'
import { formatRelative, todayISO, addDays, toLocalISO } from '../../lib/queries'
import { TrainerGoalReview } from '../onboarding/TrainerGoalReview'

type AttentionItem = {
  clientId: string
  clientName: string
  avatarUrl: string | null
  reason: 'missed_workout' | 'no_activity' | 'new_photo'
  details: string
}

function StatCard({ label, value, detail, icon: Icon, accent = 'lime' }: { label: string; value: string; detail: string; icon: any; accent?: 'lime' | 'lavender' | 'peach' }) {
  const bg = accent === 'lime' ? 'bg-[#edf3d5]' : accent === 'lavender' ? 'bg-[#eee8f3]' : 'bg-[#f7eadb]'
  const iconColor = accent === 'lime' ? 'text-[#65722f]' : accent === 'lavender' ? 'text-[#6b5a7a]' : 'text-[#ad784b]'
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

function ProgressRing({ value, size = 108 }: { value: number; size?: number }) {
  const r = 43
  const c = 2 * Math.PI * r
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="size-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#e8e8df" strokeWidth="8" />
        <circle cx="50" cy="50" r={r} fill="none" stroke="#a5bd55" strokeWidth="8" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className="font-display text-[25px] font-semibold text-[#25342d]">{value}%</div>
          <div className="text-[10px] uppercase tracking-[.12em] text-[#7f867c]">complete</div>
        </div>
      </div>
    </div>
  )
}

export function TrainerDashboard() {
  const { profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [activeClientsCount, setActiveClientsCount] = useState(0)
  const [todayStats, setTodayStats] = useState({ total: 0, completed: 0 })
  const [attentionItems, setAttentionItems] = useState<AttentionItem[]>([])
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [useMockData] = useState(false) // Set to false for production
  const [pendingGoalReviews, setPendingGoalReviews] = useState<any[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    if (!profile) return
    loadDashboard()
  }, [profile])

  const loadDashboard = async () => {
    if (!profile) return
    
    // Mock data for testing (disabled in production)
    /*
    if (useMockData) {
      setActiveClientsCount(4)
      setTodayStats({ total: 6, completed: 4 })
      setAttentionItems([
        {
          clientId: '1',
          clientName: 'Sarah Johnson',
          avatarUrl: null,
          reason: 'missed_workout',
          details: 'Missed 2 workouts'
        },
        {
          clientId: '2',
          clientName: 'Mike Chen',
          avatarUrl: null,
          reason: 'no_activity',
          details: 'No activity for 5 days'
        },
        {
          clientId: '3',
          clientName: 'Emma Wilson',
          avatarUrl: null,
          reason: 'new_photo',
          details: 'New progress photo uploaded'
        }
      ])
      setRecentActivity([
        {
          id: '1',
          event_type: 'workout_completed',
          title: 'Sarah completed "Upper Body Strength"',
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
        },
        {
          id: '2',
          event_type: 'measurement_logged',
          title: 'Mike logged new measurements',
          created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
        },
        {
          id: '3',
          event_type: 'photo_uploaded',
          title: 'Emma uploaded progress photo',
          created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
        }
      ])
      
      setPendingGoalReviews([
        {
          id: 'goal-1',
          clientId: '5',
          clientName: 'New Client Smith',
          goal: 'Build muscle mass',
          startingWeight: '70.0',
          targetWeight: '75.0',
          timeline: '3-months',
          submittedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
        }
      ])
      
      setLoading(false)
      return
    }
    */
    
    try {
      const { data: links } = await supabase
        .from('trainer_client_links')
        .select('client_id, client:profiles!client_id(id, full_name, avatar_url)')
        .eq('trainer_id', profile.id)
        .eq('status', 'active')

      const activeClientsCount = links?.length || 0
      setActiveClientsCount(activeClientsCount)

      const clientIds = (links || []).map((l: any) => l.client_id)
      const today = todayISO()

      // Today's sessions
      const { data: todaySessions } = await supabase
        .from('workout_sessions')
        .select('*')
        .in('client_id', clientIds.length ? clientIds : ['00000000-0000-0000-0000-000000000000'])
        .eq('scheduled_date', today)

      const sessions = todaySessions || []
      setTodayStats({
        total: sessions.length,
        completed: sessions.filter((s: any) => s.status === 'completed').length,
      })

      // Count missed workouts per client
      const { data: missedSessions } = await supabase
        .from('workout_sessions')
        .select('client_id')
        .in('client_id', clientIds.length ? clientIds : ['00000000-0000-0000-0000-000000000000'])
        .lt('scheduled_date', today)
        .in('status', ['scheduled', 'in_progress'])

      const missedCountByClient = new Map<string, number>()
      ;(missedSessions || []).forEach((m: any) => {
        missedCountByClient.set(m.client_id, (missedCountByClient.get(m.client_id) || 0) + 1)
      })

      // Recent activity for follow-up detection
      const fourDaysAgo = addDays(new Date(), -4)
      const { data: recentClientActivity } = await supabase
        .from('activity_timeline')
        .select('client_id, created_at, event_type')
        .in('client_id', clientIds.length ? clientIds : ['00000000-0000-0000-0000-000000000000'])
        .order('created_at', { ascending: false })

      const lastActivityByClient = new Map<string, { date: string; type: string; daysInactive: number }>()
      ;(recentClientActivity || []).forEach((a: any) => {
        if (!lastActivityByClient.has(a.client_id)) {
          const daysInactive = Math.floor((new Date().getTime() - new Date(a.created_at).getTime()) / (24 * 60 * 60 * 1000))
          lastActivityByClient.set(a.client_id, { date: a.created_at, type: a.event_type, daysInactive })
        }
      })

      // New progress photos (last 24 hours)
      const oneDayAgo = addDays(new Date(), -1)
      const { data: recentPhotos } = await supabase
        .from('progress_photos')
        .select('client_id')
        .in('client_id', clientIds.length ? clientIds : ['00000000-0000-0000-0000-000000000000'])
        .gte('taken_at', toLocalISO(oneDayAgo))

      const recentPhotoClientIds = new Set((recentPhotos || []).map((p: any) => p.client_id))

      // Build attention items
      const items: AttentionItem[] = []
      ;(links || []).forEach((l: any) => {
        const missedCount = missedCountByClient.get(l.client_id) || 0
        const lastActivity = lastActivityByClient.get(l.client_id)
        const hasRecentPhoto = recentPhotoClientIds.has(l.client_id)

        if (missedCount >= 2) {
          items.push({
            clientId: l.client_id,
            clientName: l.client?.full_name || '',
            avatarUrl: l.client?.avatar_url,
            reason: 'missed_workout',
            details: `Missed ${missedCount} workouts`,
          })
        } else if (lastActivity && lastActivity.daysInactive >= 4) {
          items.push({
            clientId: l.client_id,
            clientName: l.client?.full_name || '',
            avatarUrl: l.client?.avatar_url,
            reason: 'no_activity',
            details: `No activity for ${lastActivity.daysInactive} days`,
          })
        } else if (hasRecentPhoto) {
          items.push({
            clientId: l.client_id,
            clientName: l.client?.full_name || '',
            avatarUrl: l.client?.avatar_url,
            reason: 'new_photo',
            details: 'New progress photo uploaded',
          })
        }
      })

      setAttentionItems(items.slice(0, 5))

      // Recent activity feed
      const { data: activity } = await supabase
        .from('activity_timeline')
        .select('*')
        .in('client_id', clientIds.length ? clientIds : ['00000000-0000-0000-0000-000000000000'])
        .order('created_at', { ascending: false })
        .limit(5)

      setRecentActivity(activity || [])
    } catch (err) {
      console.error('Dashboard error:', err)
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

  const getCompletionRate = () => {
    if (todayStats.total === 0) return 0
    return Math.round((todayStats.completed / todayStats.total) * 100)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size={40} />
      </div>
    )
  }

  const firstName = profile?.full_name?.split(' ')[0] || 'Coach'

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-sm text-[#8b4a4a] bg-[#f5d5d5] rounded-lg px-4 py-3 mb-4">{error}</p>
          <button onClick={loadDashboard} className="btn-primary">Retry</button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[.14em] text-[#93a84e]">{getDayName()}</p>
          <h1 className="font-display text-4xl font-semibold tracking-tight text-[#25342d]">
            {getGreeting()}, {firstName}.
          </h1>
          <p className="mt-2 text-sm text-[#7c857c]">Here's what's happening with your clients today.</p>
        </div>
        <Link to="/trainer/plans" className="flex w-fit items-center gap-2 rounded-xl bg-[#25342d] px-4 py-3 text-xs font-semibold text-white shadow-lg shadow-[#25342d]/10">
          <Plus className="size-4" />Create plan
        </Link>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
        <section className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl font-semibold text-[#25342d]">Today's progress</h2>
              <p className="mt-1 text-xs text-[#929990]">Your coaching rhythm, at a glance</p>
            </div>
            <button className="text-xs font-semibold text-[#8aa143]">
              View reports <ArrowUpRight className="ml-1 inline size-3" />
            </button>
          </div>
          <div className="mt-7 flex flex-col gap-6 md:flex-row md:items-center">
            <div className="flex items-center gap-6">
              <ProgressRing value={getCompletionRate()} />
              <div>
                <div className="text-3xl font-semibold text-[#25342d]">
                  {todayStats.completed} <span className="text-base font-normal text-[#9ba198]">/ {todayStats.total}</span>
                </div>
                <p className="mt-1 text-xs text-[#818a81]">sessions completed</p>
              </div>
            </div>
            <div className="h-px flex-1 bg-[#eceee5] md:h-20 md:w-px" />
            <div className="flex flex-1 flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-xl bg-[#edf3d5] text-[#718b33]">
                  <TrendingUp className="size-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#3d4b40]">Completion rate</p>
                  <p className="text-xs text-[#969f96]">{getCompletionRate()}% this week</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-xl bg-[#eee8f3] text-[#6b5a7a]">
                  <Users className="size-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#3d4b40]">Client engagement</p>
                  <p className="text-xs text-[#969f96]">{attentionItems.length === 0 ? 'All on track' : `${attentionItems.length} need attention`}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {pendingGoalReviews.length > 0 && (
          <section className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-display text-xl font-semibold text-[#25342d]">Pending goal reviews</h2>
                <p className="mt-1 text-xs text-[#929990]">Clients waiting for goal confirmation</p>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="size-4 text-[#8aa143]" />
                <span className="text-xs font-semibold text-[#8aa143]">{pendingGoalReviews.length} pending</span>
              </div>
            </div>
            <div className="space-y-4">
              {pendingGoalReviews.map((goalRequest) => (
                <TrainerGoalReview
                  key={goalRequest.id}
                  goalRequest={goalRequest}
                  onConfirm={(feedback) => {
                    console.log('Goal confirmed:', goalRequest.id, feedback)
                    setPendingGoalReviews(prev => prev.filter(r => r.id !== goalRequest.id))
                  }}
                  onAdjust={(adjustedGoal, feedback) => {
                    console.log('Goal adjusted:', goalRequest.id, adjustedGoal, feedback)
                    setPendingGoalReviews(prev => prev.filter(r => r.id !== goalRequest.id))
                  }}
                  onReject={() => {
                    console.log('Goal rejected:', goalRequest.id)
                    setPendingGoalReviews(prev => prev.filter(r => r.id !== goalRequest.id))
                  }}
                />
              ))}
            </div>
          </section>
        )}

        <section className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl font-semibold text-[#25342d]">Needs attention</h2>
              <p className="mt-1 text-xs text-[#929990]">Clients who need your help</p>
            </div>
            <Link to="/trainer/clients" className="text-xs font-semibold text-[#8aa143]">
              View all <ArrowUpRight className="ml-1 inline size-3" />
            </Link>
          </div>
          <div className="mt-6 space-y-3">
            {attentionItems.length > 0 ? (
              attentionItems.slice(0, 3).map((item) => (
                <Link
                  key={item.clientId}
                  to={`/trainer/clients/${item.clientId}`}
                  className="flex items-center gap-4 rounded-xl border border-[#edf0e8] p-4 hover:bg-[#f8f8f4] transition"
                >
                  <div className={`grid size-10 place-items-center rounded-full ${
                    item.reason === 'missed_workout' ? 'bg-[#f5d5d5] text-[#8b4a4a]' :
                    item.reason === 'no_activity' ? 'bg-[#f7eadb] text-[#ad784b]' :
                    'bg-[#edf3d5] text-[#718b33]'
                  }`}>
                    {item.reason === 'missed_workout' ? '!' :
                     item.reason === 'no_activity' ? '⚠' :
                     '📷'}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[#3d4b40]">{item.clientName}</p>
                    <p className="text-xs text-[#969f96]">{item.details}</p>
                  </div>
                  <ChevronRight className="size-4 text-[#aab2a8]" />
                </Link>
              ))
            ) : (
              <div className="flex items-center justify-center rounded-xl bg-[#f8f8f4] p-8">
                <p className="text-sm text-[#969f96]">All clients are on track ✓</p>
              </div>
            )}
          </div>
        </section>

        <section className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl font-semibold text-[#25342d]">Needs attention</h2>
              <p className="mt-1 text-xs text-[#929990]">Clients who need your help</p>
            </div>
            <Link to="/trainer/clients" className="text-xs font-semibold text-[#8aa143]">
              View all <ArrowUpRight className="ml-1 inline size-3" />
            </Link>
          </div>
          <div className="mt-6 space-y-3">
            {attentionItems.length > 0 ? (
              attentionItems.slice(0, 3).map((item) => (
                <Link
                  key={item.clientId}
                  to={`/trainer/clients/${item.clientId}`}
                  className="flex items-center gap-4 rounded-xl border border-[#edf0e8] p-4 hover:bg-[#f8f8f4] transition"
                >
                  <div className={`grid size-10 place-items-center rounded-full ${
                    item.reason === 'missed_workout' ? 'bg-[#f5d5d5] text-[#8b4a4a]' :
                    item.reason === 'no_activity' ? 'bg-[#f7eadb] text-[#ad784b]' :
                    'bg-[#edf3d5] text-[#718b33]'
                  }`}>
                    {item.reason === 'missed_workout' ? '!' :
                     item.reason === 'no_activity' ? '⚠' :
                     '📷'}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[#3d4b40]">{item.clientName}</p>
                    <p className="text-xs text-[#969f96]">{item.details}</p>
                  </div>
                  <ChevronRight className="size-4 text-[#aab2a8]" />
                </Link>
              ))
            ) : (
              <div className="flex items-center justify-center rounded-xl bg-[#f8f8f4] p-8">
                <p className="text-sm text-[#969f96]">All clients are on track ✓</p>
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Today's sessions" value={String(todayStats.total).padStart(2, '0')} detail="2 more than yesterday" icon={CalendarDays} />
        <StatCard label="Weekly adherence" value="86%" detail="Up 8.4% this week" icon={Target} accent="lavender" />
        <StatCard label="Active clients" value={String(activeClientsCount)} detail="3 new this month" icon={Users} accent="peach" />
      </div>

      {recentActivity.length > 0 && (
        <section className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl font-semibold text-[#25342d]">Recent activity</h2>
              <p className="mt-1 text-xs text-[#929990]">Latest updates from your clients</p>
            </div>
          </div>
          <div className="mt-6 space-y-3">
            {recentActivity.map((event) => (
              <div key={event.id} className="flex items-center gap-4 rounded-xl border border-[#edf0e8] p-4">
                <div className={`grid size-10 place-items-center rounded-xl ${
                  event.event_type === 'workout_completed' ? 'bg-[#edf3d5] text-[#718b33]' :
                  event.event_type === 'measurement_logged' ? 'bg-[#f7eadb] text-[#ad784b]' :
                  event.event_type === 'photo_uploaded' ? 'bg-[#eee8f3] text-[#6b5a7a]' :
                  'bg-[#f0f1eb] text-[#8d978d]'
                }`}>
                  {event.event_type === 'workout_completed' ? <TrendingUp className="size-4" /> :
                   event.event_type === 'measurement_logged' ? <Target className="size-4" /> :
                   event.event_type === 'photo_uploaded' ? <CalendarDays className="size-4" /> :
                   <Activity className="size-4" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[#3d4b40]">{event.title}</p>
                  <p className="text-xs text-[#969f96]">{formatRelative(event.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
