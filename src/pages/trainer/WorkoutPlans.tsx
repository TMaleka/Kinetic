import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, ChevronRight, Dumbbell, User, Calendar } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { Spinner } from '../../components/ui'
import { formatDate } from '../../lib/queries'

export function WorkoutPlans() {
  const { profile } = useAuth()
  const [plans, setPlans] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [useMockData] = useState(false) // Set to false for production

  useEffect(() => {
    if (profile) loadPlans()
  }, [profile])

  const loadPlans = async () => {
    if (!profile) return
    
    // Mock data for testing (disabled in production)
    /*
    if (useMockData) {
      setPlans([
        {
          id: 'plan-1',
          title: 'Strength Training Basics',
          description: 'Foundational strength program for beginners',
          status: 'active',
          client: { full_name: 'Sarah Johnson' },
          days: [{ count: 5 }],
          created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'plan-2',
          title: 'Advanced Muscle Building',
          description: 'Intensive muscle building program for experienced lifters',
          status: 'active',
          client: { full_name: 'Mike Chen' },
          days: [{ count: 6 }],
          created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'plan-3',
          title: 'Weight Loss & Cardio',
          description: 'Focus on fat loss with cardio intervals',
          status: 'draft',
          client: null,
          days: [{ count: 4 }],
          created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'plan-4',
          title: 'Endurance Builder',
          description: 'Build stamina and cardiovascular health',
          status: 'archived',
          client: { full_name: 'Emma Wilson' },
          days: [{ count: 7 }],
          created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
        }
      ])
      setLoading(false)
      return
    }
    */
    
    try {
      const { data } = await supabase
        .from('workout_plans')
        .select(`
          *,
          client:profiles!client_id(full_name),
          days:plan_days(count)
        `)
        .eq('trainer_id', profile.id)
        .order('created_at', { ascending: false })

      setPlans(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (planId: string) => {
    if (!confirm('Delete this plan? This cannot be undone.')) return
    await supabase.from('workout_plans').delete().eq('id', planId)
    loadPlans()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size={40} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[.14em] text-[#93a84e]">Your programmes</p>
          <h1 className="font-display text-4xl font-semibold tracking-tight text-[#25342d]">Workout plans</h1>
          <p className="mt-2 text-sm text-[#7c857c]">Create and manage training programmes.</p>
        </div>
        <Link
          to="/trainer/plans/new"
          className="flex w-fit items-center gap-2 rounded-xl bg-[#25342d] px-4 py-3 text-xs font-semibold text-white"
        >
          <Plus className="size-4" />Create plan
        </Link>
      </div>

      {plans.length ? (
        <div className="grid gap-4">
          {plans.map((plan) => (
            <Link
              key={plan.id}
              to={`/trainer/plans/${plan.id}/edit`}
              className="card p-6 hover:bg-[#f8f8f4] transition"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#edf3d5] text-[#718b33]">
                      <Dumbbell className="size-4" />
                    </div>
                    <div>
                      <h2 className="font-display text-lg font-semibold text-[#25342d]">{plan.title}</h2>
                      {plan.description && (
                        <p className="text-sm text-[#969f96] mt-1">{plan.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-4">
                    <div className="flex items-center gap-2 text-xs text-[#969f96]">
                      <Calendar className="size-3" />
                      {plan.days?.[0]?.count ?? 0} days
                    </div>
                    {plan.client && (
                      <div className="flex items-center gap-2 text-xs text-[#969f96]">
                        <User className="size-3" />
                        {plan.client.full_name}
                      </div>
                    )}
                    <span className={`badge ${
                      plan.status === 'active' ? 'badge-lime' :
                      plan.status === 'draft' ? 'bg-[#f0f1eb] text-[#8d978d]' :
                      'bg-[#f7eadb] text-[#ad784b]'
                    }`}>
                      {plan.status}
                    </span>
                  </div>
                </div>
                <ChevronRight className="size-4 text-[#aab2a8] flex-shrink-0 ml-4" />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center rounded-2xl border border-[#e5e7dd] bg-white p-12">
          <div className="text-center">
            <p className="text-sm text-[#969f96] mb-4">No workout plans yet</p>
            <Link to="/trainer/plans/new" className="btn-primary">
              Create your first plan
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
