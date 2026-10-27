import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, ChevronRight, Dumbbell, User, Calendar, Trash2 } from 'lucide-react'
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
    const { error } = await supabase.from('workout_plans').delete().eq('id', planId)
    if (error) alert(`Failed to delete plan: ${error.message}`)
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
          <p className="mb-2 text-xs font-semibold uppercase tracking-[.14em] text-[#7c3aed]">Your programmes</p>
          <h1 className="font-display text-4xl font-semibold tracking-tight text-[#1c1446]">Workout plans</h1>
          <p className="mt-2 text-sm text-[#64748b]">Create and manage training programmes.</p>
        </div>
        <Link
          to="/trainer/plans/new"
          className="flex w-fit items-center gap-2 rounded-xl bg-[#ff4f1f] px-4 py-3 text-xs font-semibold text-white"
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
              className="card p-6 hover:bg-[#fff4ec] transition"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#d9f99d] text-[#15803d]">
                      <Dumbbell className="size-4" />
                    </div>
                    <div>
                      <h2 className="font-display text-lg font-semibold text-[#1c1446]">{plan.title}</h2>
                      {plan.description && (
                        <p className="text-sm text-[#64748b] mt-1">{plan.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-4">
                    <div className="flex items-center gap-2 text-xs text-[#64748b]">
                      <Calendar className="size-3" />
                      {plan.days?.[0]?.count ?? 0} days
                    </div>
                    {plan.client ? (
                      <div className="flex items-center gap-2 text-xs text-[#64748b]">
                        <User className="size-3" />
                        {plan.client.full_name}
                      </div>
                    ) : (
                      <span className="text-xs text-[#64748b]">Template (unassigned)</span>
                    )}
                    <span className={`badge ${
                      plan.status === 'active' ? 'badge-lime' :
                      plan.status === 'draft' ? 'bg-[#f1f5f9] text-[#64748b]' :
                      'bg-[#fed7aa] text-[#ea580c]'
                    }`}>
                      {plan.status}
                    </span>
                  </div>
                </div>
                <div className="ml-4 flex flex-shrink-0 items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleDelete(plan.id)
                    }}
                    aria-label="Delete plan"
                    className="grid size-8 place-items-center rounded-lg text-[#dc2626] hover:bg-[#fee2e2]"
                  >
                    <Trash2 className="size-4" />
                  </button>
                  <ChevronRight className="size-4 text-[#94a3b8]" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center rounded-2xl border border-[#f3dccf] bg-white p-12">
          <div className="text-center">
            <p className="text-sm text-[#64748b] mb-4">No workout plans yet</p>
            <Link to="/trainer/plans/new" className="btn-primary">
              Create your first plan
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
