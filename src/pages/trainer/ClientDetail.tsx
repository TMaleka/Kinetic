import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, ChevronRight, TrendingUp, Flame, Dumbbell, Plus, Target } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { Spinner } from '../../components/ui'
import { formatDate, formatRelative, fetchClientActivity, addActivityEvent, scheduleSessionsFromPlan, todayISO, toLocalISO, addDays } from '../../lib/queries'

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

export function ClientDetail() {
  const { clientId } = useParams<{ clientId: string }>()
  const { profile } = useAuth()
  const [client, setClient] = useState<any>(null)
  const [link, setLink] = useState<any>(null)
  const [sessions, setSessions] = useState<any[]>([])
  const [measurements, setMeasurements] = useState<any[]>([])
  const [photos, setPhotos] = useState<any[]>([])
  const [activity, setActivity] = useState<any[]>([])
  const [plans, setPlans] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddMeasurement, setShowAddMeasurement] = useState(false)
  const [showAssignPlan, setShowAssignPlan] = useState(false)
  const [availablePlans, setAvailablePlans] = useState<any[]>([])
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [scheduleSessions, setScheduleSessions] = useState(true)
  const [startDate, setStartDate] = useState(todayISO())
  const [scheduling, setScheduling] = useState(false)
  const [measurementWeight, setMeasurementWeight] = useState('')
  const [measurementChest, setMeasurementChest] = useState('')
  const [measurementWaist, setMeasurementWaist] = useState('')

  useEffect(() => {
    if (clientId) loadData()
  }, [clientId])

  const loadData = async () => {
    if (!clientId || !profile) return
    try {
      const { data: clientData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', clientId)
        .maybeSingle()

      const { data: linkData } = await supabase
        .from('trainer_client_links')
        .select('*')
        .eq('trainer_id', profile.id)
        .eq('client_id', clientId)
        .maybeSingle()

      const { data: sessionData } = await supabase
        .from('workout_sessions')
        .select('*')
        .eq('client_id', clientId)
        .order('scheduled_date', { ascending: false })

      const { data: measurementData } = await supabase
        .from('measurements')
        .select('*')
        .eq('client_id', clientId)
        .order('logged_at', { ascending: true })

      const { data: photoData } = await supabase
        .from('progress_photos')
        .select('*')
        .eq('client_id', clientId)
        .order('taken_at', { ascending: false })

      const { data: planData } = await supabase
        .from('workout_plans')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })

      const activityData = await fetchClientActivity(clientId, 20)

      setClient(clientData)
      setLink(linkData)
      setSessions(sessionData || [])
      setMeasurements(measurementData || [])
      setPhotos(photoData || [])
      setPlans(planData || [])
      setActivity(activityData || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const loadAvailablePlans = async () => {
    if (!profile) return
    try {
      const { data } = await supabase
        .from('workout_plans')
        .select('*')
        .eq('trainer_id', profile.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
      setAvailablePlans(data || [])
    } catch (err) {
      console.error(err)
    }
  }

  const handleAssignPlan = async () => {
    if (!selectedPlan || !clientId || !profile) return
    setScheduling(true)
    try {
      // Update plan to assign to client
      const { error: updateError } = await supabase
        .from('workout_plans')
        .update({ client_id: clientId })
        .eq('id', selectedPlan)

      if (updateError) throw updateError

      // Schedule sessions if requested
      if (scheduleSessions) {
        const result = await scheduleSessionsFromPlan(selectedPlan, clientId, profile.id, startDate)
        if (!result.success) {
          console.error('Failed to schedule sessions:', result.message)
        }
      }

      // Log activity
      await addActivityEvent(
        clientId,
        profile.id,
        'plan_assigned',
        'Workout plan assigned',
        scheduleSessions ? 'Plan assigned and sessions scheduled' : 'Plan assigned',
      )

      setShowAssignPlan(false)
      setSelectedPlan(null)
      loadData()
    } catch (err) {
      console.error(err)
    } finally {
      setScheduling(false)
    }
  }

  const handleOpenAssignPlan = () => {
    loadAvailablePlans()
    setShowAssignPlan(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size={40} />
      </div>
    )
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
        <p className="text-body text-neutral-400 mb-4">Client not found</p>
        <Link to="/trainer/clients" className="btn-primary">Back to Clients</Link>
      </div>
    )
  }

  const completedSessions = sessions.filter((s) => s.status === 'completed').length
  const adherenceRate = sessions.length > 0
    ? Math.round((completedSessions / sessions.length) * 100)
    : 0

  const weightData = measurements
    .filter((m) => m.body_weight != null)
    .map((m) => ({
      date: new Date(m.logged_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      weight: m.body_weight,
    }))

  const latestWeight = measurements.filter(m => m.body_weight).pop()?.body_weight
  const firstWeight = measurements.find(m => m.body_weight)?.body_weight
  const weightChange = firstWeight && latestWeight ? latestWeight - firstWeight : null

  const latestWaist = measurements.filter(m => m.waist).pop()?.waist
  const firstWaist = measurements.find(m => m.waist)?.waist
  const waistChange = firstWaist && latestWaist ? latestWaist - firstWaist : null

  const latestChest = measurements.filter(m => m.chest).pop()?.chest
  const firstChest = measurements.find(m => m.chest)?.chest
  const chestChange = firstChest && latestChest ? latestChest - firstChest : null

  return (
    <div className="flex flex-col gap-7">
      <button onClick={() => window.history.back()} className="flex w-fit items-center gap-2 text-xs font-semibold text-[#7f927d]">
        ← Back to clients
      </button>
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
        <div className="flex items-center gap-4">
          <div className={`grid size-16 shrink-0 place-items-center rounded-full text-lg font-semibold ${
            adherenceRate >= 80 ? 'bg-[#edf3d5] text-[#4d604c]' :
            adherenceRate >= 60 ? 'bg-[#f7eadb] text-[#ad784b]' :
            'bg-[#f0f1eb] text-[#8d978d]'
          }`}>
            {client.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-3xl font-semibold tracking-tight text-[#25342d]">{client.full_name}</h1>
              <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                adherenceRate >= 80 ? 'bg-[#edf3d5] text-[#718b33]' :
                adherenceRate >= 60 ? 'bg-[#f7eadb] text-[#ad784b]' :
                'bg-[#f0f1eb] text-[#8d978d]'
              }`}>
                {adherenceRate >= 80 ? 'On track' : adherenceRate >= 60 ? 'Needs attention' : 'At risk'}
              </span>
            </div>
            <p className="mt-1 text-sm text-[#808980]">
              {link?.goals || 'No goal set'} · Member since {new Date(client.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>
        <button
          onClick={handleOpenAssignPlan}
          className="flex w-fit items-center gap-2 rounded-xl bg-[#25342d] px-4 py-3 text-xs font-semibold text-white"
        >
          <Plus className="size-4" />Assign workout
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Weekly adherence" value={`${adherenceRate}%`} detail={adherenceRate > 70 ? '+12% vs last month' : 'Needs improvement'} icon={TrendingUp} />
        <StatCard label="Current streak" value={`${sessions.length} days`} detail="Personal best" icon={Flame} accent="peach" />
        <StatCard label="Strength score" value="78" detail="+8 points this month" icon={Dumbbell} accent="lavender" />
      </div>

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
            {firstWeight && latestWeight && (
              <div className="flex items-center justify-between rounded-xl bg-[#f8f8f4] p-4">
                <div>
                  <p className="text-xs text-[#969f96]">Weight</p>
                  <p className="text-lg font-semibold text-[#25342d]">{latestWeight}kg</p>
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
                <p className="text-lg font-semibold text-[#25342d]">{sessions.length}</p>
              </div>
              <span className="text-xs font-semibold text-[#718b33]">+{sessions.length > 0 ? sessions.length : 0}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-[#f8f8f4] p-4">
              <div>
                <p className="text-xs text-[#969f96]">Adherence</p>
                <p className="text-lg font-semibold text-[#25342d]">{adherenceRate}%</p>
              </div>
              <span className={`text-xs font-semibold ${
                adherenceRate >= 80 ? 'text-[#718b33]' : adherenceRate >= 60 ? 'text-[#ad784b]' : 'text-[#8b4a4a]'
              }`}>
                {adherenceRate >= 80 ? 'Excellent' : adherenceRate >= 60 ? 'Good' : 'Needs work'}
              </span>
            </div>
          </div>
        </section>
      </div>

      {photos.length > 0 && (
        <section className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl font-semibold text-[#25342d]">Progress photos</h2>
              <p className="mt-1 text-xs text-[#929990]">Visual progress over time</p>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4">
            {photos.slice(0, 4).map((photo) => (
              <div key={photo.id} className="aspect-square bg-[#f8f8f4] rounded-2xl overflow-hidden">
                <img
                  src={photo.photo_url}
                  alt={photo.caption || 'Progress photo'}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {sessions.length > 0 && (
        <section className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl font-semibold text-[#25342d]">Recent workouts</h2>
              <p className="mt-1 text-xs text-[#929990]">Latest session history</p>
            </div>
          </div>
          <div className="mt-6 space-y-3">
            {sessions.slice(0, 5).map((s) => (
              <div key={s.id} className="flex items-center gap-4 rounded-xl border border-[#edf0e8] p-4">
                <div className={`grid size-10 place-items-center rounded-xl ${
                  s.status === 'completed' ? 'bg-[#edf3d5] text-[#718b33]' :
                  s.status === 'missed' ? 'bg-[#f5d5d5] text-[#8b4a4a]' :
                  'bg-[#f0f1eb] text-[#8d978d]'
                }`}>
                  {s.status === 'completed' ? <TrendingUp className="size-4" /> :
                   s.status === 'missed' ? <Target className="size-4" /> :
                   <Dumbbell className="size-4" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[#3d4b40]">{s.title}</p>
                  <p className="text-xs text-[#969f96]">{formatDate(s.scheduled_date)}</p>
                </div>
                <span className={`badge ${
                  s.status === 'completed' ? 'badge-lime' :
                  s.status === 'missed' ? 'badge-error' :
                  'bg-[#f0f1eb] text-[#8d978d]'
                }`}>
                  {s.status}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {activity.length > 0 && (
        <section className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl font-semibold text-[#25342d]">Recent activity</h2>
              <p className="mt-1 text-xs text-[#929990]">Latest updates and events</p>
            </div>
          </div>
          <div className="mt-6 space-y-3">
            {activity.slice(0, 5).map((event) => (
              <div key={event.id} className="flex items-center gap-4 rounded-xl border border-[#edf0e8] p-4">
                <div className={`grid size-10 place-items-center rounded-xl ${
                  event.event_type === 'workout_completed' ? 'bg-[#edf3d5] text-[#718b33]' :
                  event.event_type === 'measurement_logged' ? 'bg-[#f7eadb] text-[#ad784b]' :
                  event.event_type === 'photo_uploaded' ? 'bg-[#eee8f3] text-[#6b5a7a]' :
                  'bg-[#f0f1eb] text-[#8d978d]'
                }`}>
                  {event.event_type === 'workout_completed' ? <TrendingUp className="size-4" /> :
                   event.event_type === 'measurement_logged' ? <Target className="size-4" /> :
                   event.event_type === 'photo_uploaded' ? <Dumbbell className="size-4" /> :
                   <Flame className="size-4" />}
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

      {/* Add Measurement Modal */}
      {showAddMeasurement && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50">
          <div className="card p-6 max-w-sm w-full">
            <h2 className="font-display text-xl font-semibold text-[#25342d] mb-6">Log measurement</h2>
            <div className="space-y-4">
              <div>
                <label className="label">Weight (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={measurementWeight}
                  onChange={(e) => setMeasurementWeight(e.target.value)}
                  className="input"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="label">Chest (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={measurementChest}
                  onChange={(e) => setMeasurementChest(e.target.value)}
                  className="input"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="label">Waist (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={measurementWaist}
                  onChange={(e) => setMeasurementWaist(e.target.value)}
                  className="input"
                  placeholder="0"
                />
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowAddMeasurement(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    const data: any = { client_id: clientId }
                    if (measurementWeight.trim()) data.body_weight = parseFloat(measurementWeight)
                    if (measurementChest.trim()) data.chest = parseFloat(measurementChest)
                    if (measurementWaist.trim()) data.waist = parseFloat(measurementWaist)
                    
                    if (Object.keys(data).length > 1) {
                      await supabase.from('measurements').insert(data)
                      setShowAddMeasurement(false)
                      setMeasurementWeight('')
                      setMeasurementChest('')
                      setMeasurementWaist('')
                      loadData()
                    }
                  }}
                  disabled={!measurementWeight.trim() && !measurementChest.trim() && !measurementWaist.trim()}
                  className="btn-primary flex-1"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assign Plan Modal */}
      {showAssignPlan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50">
          <div className="card p-6 max-w-md w-full">
            <h2 className="font-display text-xl font-semibold text-[#25342d] mb-6">Assign workout plan</h2>
            
            {availablePlans.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-[#969f96] mb-4">
                  No workout plans available. Create one first.
                </p>
                <Link
                  to="/trainer/plans"
                  className="btn-primary"
                  onClick={() => setShowAssignPlan(false)}
                >
                  Create plan
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="label">Select plan</label>
                  <select
                    value={selectedPlan || ''}
                    onChange={(e) => setSelectedPlan(e.target.value)}
                    className="w-full rounded-xl border border-[#e5e7dd] bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#c0d568]"
                  >
                    <option value="">Choose a plan...</option>
                    {availablePlans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="scheduleSessions"
                    checked={scheduleSessions}
                    onChange={(e) => setScheduleSessions(e.target.checked)}
                    className="w-5 h-5 rounded"
                  />
                  <label htmlFor="scheduleSessions" className="text-sm text-[#3d4b40]">
                    Schedule sessions automatically
                  </label>
                </div>

                {scheduleSessions && (
                  <div>
                    <label className="label">Start date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full rounded-xl border border-[#e5e7dd] bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#c0d568]"
                    />
                  </div>
                )}

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowAssignPlan(false)}
                    className="btn-secondary flex-1"
                    disabled={scheduling}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAssignPlan}
                    disabled={!selectedPlan || scheduling}
                    className="btn-primary flex-1"
                  >
                    {scheduling ? 'Assigning...' : 'Assign'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
