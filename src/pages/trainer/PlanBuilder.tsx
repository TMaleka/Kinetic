import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, Plus, Trash2, GripVertical, Save, Dumbbell, ChevronDown, ChevronUp, Calendar,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { Spinner, Modal, Badge } from '../../components/ui'
import { fetchTrainerClients, scheduleSessionsFromPlan, todayISO } from '../../lib/queries'

type Day = {
  id?: string
  title: string
  day_order: number
  notes?: string
  exercises: Exercise[]
}

type Exercise = {
  id?: string
  name: string
  target_sets: number
  target_reps: number
  target_weight: number
  rest_seconds: number
  notes?: string
  exercise_order: number
}

const EXERCISE_SUGGESTIONS = [
  'Bench Press', 'Squat', 'Deadlift', 'Overhead Press', 'Barbell Row',
  'Pull-up', 'Dip', 'Lunge', 'Romanian Deadlift', 'Leg Press',
  'Dumbbell Curl', 'Tricep Extension', 'Lat Pulldown', 'Cable Row',
  'Leg Curl', 'Calf Raise', 'Plank', 'Hanging Leg Raise', 'Russian Twist',
  'Hip Thrust', 'Face Pull', 'Lateral Raise', 'Push-up', 'Mountain Climbers',
  'Kettlebell Swing', 'Box Jump', 'Burpee', 'Thruster', 'Clean', 'Snatch',
]

export function PlanBuilder() {
  const { planId } = useParams<{ planId: string }>()
  const isEdit = !!planId
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [days, setDays] = useState<Day[]>([])
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [expandedDay, setExpandedDay] = useState<number | null>(0)
  const [showExercisePicker, setShowExercisePicker] = useState<number | null>(null)
  const [clients, setClients] = useState<any[]>([])
  const [selectedClient, setSelectedClient] = useState<string | null>(null)
  const [scheduleSessions, setScheduleSessions] = useState(false)
  const [startDate, setStartDate] = useState(todayISO())

  useEffect(() => {
    if (planId) loadPlan()
    loadClients()
  }, [planId])

  const loadClients = async () => {
    if (!profile) return
    try {
      const data = await fetchTrainerClients(profile.id)
      setClients(data || [])
    } catch (err) {
      console.error(err)
    }
  }

  const loadPlan = async () => {
    try {
      const { data: plan } = await supabase
        .from('workout_plans')
        .select('*')
        .eq('id', planId)
        .maybeSingle()

      if (plan) {
        setTitle(plan.title)
        setDescription(plan.description || '')
      }

      const { data: planDays } = await supabase
        .from('plan_days')
        .select('*')
        .eq('plan_id', planId)
        .order('day_order', { ascending: true })

      const loadedDays: Day[] = []
      for (const pd of planDays || []) {
        const { data: exercises } = await supabase
          .from('plan_exercises')
          .select('*')
          .eq('plan_day_id', pd.id)
          .order('exercise_order', { ascending: true })
        loadedDays.push({
          id: pd.id,
          title: pd.title,
          day_order: pd.day_order,
          notes: pd.notes,
          exercises: (exercises || []).map((ex) => ({
            id: ex.id,
            name: ex.name,
            target_sets: ex.target_sets,
            target_reps: ex.target_reps,
            target_weight: ex.target_weight,
            rest_seconds: ex.rest_seconds,
            notes: ex.notes,
            exercise_order: ex.exercise_order,
          })),
        })
      }
      setDays(loadedDays)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const addDay = () => {
    setDays([
      ...days,
      {
        title: `Day ${days.length + 1}`,
        day_order: days.length,
        exercises: [],
      },
    ])
    setExpandedDay(days.length)
  }

  const removeDay = (index: number) => {
    setDays(days.filter((_, i) => i !== index).map((d, i) => ({ ...d, day_order: i })))
  }

  const addExercise = (dayIndex: number, name: string) => {
    const newExercise: Exercise = {
      name,
      target_sets: 3,
      target_reps: 10,
      target_weight: 0,
      rest_seconds: 60,
      exercise_order: days[dayIndex].exercises.length,
    }
    const updated = [...days]
    updated[dayIndex].exercises.push(newExercise)
    setDays(updated)
    setShowExercisePicker(null)
  }

  const updateExercise = (dayIndex: number, exIndex: number, field: keyof Exercise, value: any) => {
    const updated = [...days]
    ;(updated[dayIndex].exercises[exIndex] as any)[field] = value
    setDays(updated)
  }

  const removeExercise = (dayIndex: number, exIndex: number) => {
    const updated = [...days]
    updated[dayIndex].exercises.splice(exIndex, 1)
    setDays(updated)
  }

  const handleSave = async () => {
    if (!profile || !title.trim()) return
    setSaving(true)
    try {
      let currentPlanId = planId

      if (isEdit) {
        await supabase
          .from('workout_plans')
          .update({ title, description: description || null })
          .eq('id', planId)
      } else {
        const { data: newPlan } = await supabase
          .from('workout_plans')
          .insert({
            trainer_id: profile.id,
            client_id: selectedClient || null, // Assign to client if selected, otherwise null for template
            title,
            description: description || null,
            status: 'active',
          })
          .select()
          .maybeSingle()
        currentPlanId = newPlan?.id
      }

      if (!currentPlanId) {
        setSaving(false)
        return
      }

      // Delete existing days and exercises if editing
      if (isEdit) {
        const { data: existingDays } = await supabase
          .from('plan_days')
          .select('id')
          .eq('plan_id', currentPlanId)
        for (const d of existingDays || []) {
          await supabase.from('plan_exercises').delete().eq('plan_day_id', d.id)
        }
        await supabase.from('plan_days').delete().eq('plan_id', currentPlanId)
      }

      // Insert days and exercises
      for (const day of days) {
        const { data: newDay } = await supabase
          .from('plan_days')
          .insert({
            plan_id: currentPlanId,
            title: day.title,
            day_order: day.day_order,
            notes: day.notes || null,
          })
          .select()
          .maybeSingle()

        if (!newDay) continue

        if (day.exercises.length > 0) {
          await supabase.from('plan_exercises').insert(
            day.exercises.map((ex) => ({
              plan_day_id: newDay.id,
              name: ex.name,
              target_sets: ex.target_sets,
              target_reps: ex.target_reps,
              target_weight: ex.target_weight,
              rest_seconds: ex.rest_seconds,
              notes: ex.notes || null,
              exercise_order: ex.exercise_order,
            })),
          )
        }
      }

      // Schedule sessions if client is selected and option is enabled
      if (selectedClient && scheduleSessions && currentPlanId) {
        await scheduleSessionsFromPlan(currentPlanId, selectedClient, profile.id, startDate)
      }

      navigate('/trainer/plans')
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size={32} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-7">
      <button
        onClick={() => navigate('/trainer/plans')}
        className="flex w-fit items-center gap-2 text-xs font-semibold text-[#7f927d]"
      >
        ← Back to plans
      </button>

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[.14em] text-[#93a84e]">Program builder</p>
          <h1 className="font-display text-4xl font-semibold tracking-tight text-[#25342d]">
            {isEdit ? 'Edit plan' : 'New workout plan'}
          </h1>
          <p className="mt-2 text-sm text-[#7c857c]">Build a training program with days and exercises.</p>
        </div>
      </div>

      <section className="card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold text-[#25342d]">Plan details</h2>
            <p className="mt-1 text-xs text-[#929990]">Basic information about your program</p>
          </div>
        </div>
        <div className="mt-6 space-y-4">
          <div>
            <label className="label">Plan title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Push/Pull/Legs, Upper/Lower, Full Body..."
              className="input"
            />
          </div>
          <div>
            <label className="label">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this program..."
              rows={2}
              className="input resize-none"
            />
          </div>
          {!isEdit && (
            <>
              <div>
                <label className="label">Assign to client (optional)</label>
                <select
                  value={selectedClient || ''}
                  onChange={(e) => setSelectedClient(e.target.value)}
                  className="w-full rounded-xl border border-[#e5e7dd] bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#c0d568]"
                >
                  <option value="">Save as template (assign later)</option>
                  {clients.map((clientLink) => (
                    <option key={clientLink.client.id} value={clientLink.client.id}>
                      {clientLink.client.full_name}
                    </option>
                  ))}
                </select>
              </div>
              {selectedClient && (
                <>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="scheduleSessions"
                      checked={scheduleSessions}
                      onChange={(e) => setScheduleSessions(e.target.checked)}
                      className="w-5 h-5 rounded"
                    />
                    <label htmlFor="scheduleSessions" className="text-sm text-[#3d4b40] flex items-center gap-2">
                      <Calendar size={16} />
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
                </>
              )}
            </>
          )}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display text-xl font-semibold text-[#25342d]">Training days</h2>
            <p className="mt-1 text-xs text-[#929990]">Add exercises to each day</p>
          </div>
        </div>
        <div className="space-y-4">
          {days.map((day, dayIndex) => (
            <div key={dayIndex} className="card overflow-hidden">
              {/* Day header */}
              <div className="flex items-center gap-3 p-4 bg-[#f8f8f4]">
                <button
                  onClick={() => setExpandedDay(expandedDay === dayIndex ? null : dayIndex)}
                  className="btn-ghost p-1"
                >
                  {expandedDay === dayIndex ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
                <input
                  type="text"
                  value={day.title}
                  onChange={(e) => {
                    const updated = [...days]
                    updated[dayIndex].title = e.target.value
                    setDays(updated)
                  }}
                  className="flex-1 bg-transparent font-semibold text-[#25342d] outline-none"
                  placeholder="Day title"
                />
                <span className="badge badge-lime">{day.exercises.length} exercises</span>
                <button
                  onClick={() => removeDay(dayIndex)}
                  className="btn-ghost p-1.5"
                >
                  <Trash2 size={16} className="text-[#8b4a4a]" />
                </button>
              </div>

              {/* Day exercises */}
              {expandedDay === dayIndex && (
                <div className="p-4 space-y-3">
                  {day.exercises.map((ex, exIndex) => (
                    <div key={exIndex} className="border border-[#edf0e8] rounded-xl p-3 space-y-3">
                      <div className="flex items-center gap-2">
                        <Dumbbell size={16} className="text-[#969f96]" />
                        <input
                          type="text"
                          value={ex.name}
                          onChange={(e) => updateExercise(dayIndex, exIndex, 'name', e.target.value)}
                          className="flex-1 bg-transparent font-medium text-[#3d4b40] outline-none"
                          placeholder="Exercise name"
                        />
                        <button
                          onClick={() => removeExercise(dayIndex, exIndex)}
                          className="btn-ghost p-1"
                        >
                          <Trash2 size={14} className="text-[#8b4a4a]" />
                        </button>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        <div>
                          <label className="text-xs text-[#969f96]">Sets</label>
                          <input
                            type="number"
                            value={ex.target_sets}
                            onChange={(e) => updateExercise(dayIndex, exIndex, 'target_sets', parseInt(e.target.value) || 0)}
                            className="input py-1.5 text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-[#969f96]">Reps</label>
                          <input
                            type="number"
                            value={ex.target_reps}
                            onChange={(e) => updateExercise(dayIndex, exIndex, 'target_reps', parseInt(e.target.value) || 0)}
                            className="input py-1.5 text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-[#969f96]">Weight</label>
                          <input
                            type="number"
                            step="0.5"
                            value={ex.target_weight}
                            onChange={(e) => updateExercise(dayIndex, exIndex, 'target_weight', parseFloat(e.target.value) || 0)}
                            className="input py-1.5 text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-[#969f96]">Rest (s)</label>
                          <input
                            type="number"
                            value={ex.rest_seconds}
                            onChange={(e) => updateExercise(dayIndex, exIndex, 'rest_seconds', parseInt(e.target.value) || 0)}
                            className="input py-1.5 text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={() => setShowExercisePicker(dayIndex)}
                    className="w-full border-2 border-dashed border-[#e5e7dd] rounded-xl py-3 text-sm text-[#969f96] hover:border-[#c0d568] hover:text-[#718b33] transition-all flex items-center justify-center gap-2"
                  >
                    <Plus size={16} />
                    Add exercise
                  </button>
                </div>
              )}
            </div>
          ))}

          <button
            onClick={addDay}
            className="w-full border-2 border-dashed border-[#e5e7dd] rounded-xl py-4 text-sm text-[#969f96] hover:border-[#c0d568] hover:text-[#718b33] transition-all flex items-center justify-center gap-2"
          >
            <Plus size={18} />
            Add day
          </button>
        </div>
      </section>

      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={saving || !title.trim()}
          className="btn-primary flex-1"
        >
          {saving ? 'Saving...' : isEdit ? 'Update plan' : 'Save plan'}
        </button>
      </div>

      {/* Exercise Picker Modal */}
      {showExercisePicker !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50">
          <div className="card p-6 max-w-lg w-full">
            <h2 className="font-display text-xl font-semibold text-[#25342d] mb-6">Add exercise</h2>
            <div className="space-y-3">
              <p className="text-sm text-[#969f96]">Pick from common exercises or type your own:</p>
              <div className="flex flex-wrap gap-2">
                {EXERCISE_SUGGESTIONS.map((name) => (
                  <button
                    key={name}
                    onClick={() => showExercisePicker !== null && addExercise(showExercisePicker, name)}
                    className="badge bg-[#f8f8f4] text-[#3d4b40] hover:bg-[#edf3d5] hover:text-[#718b33] transition-all cursor-pointer"
                  >
                    {name}
                  </button>
                ))}
              </div>
              <div className="border-t border-[#eceee5] pt-3">
                <label className="label">Custom exercise</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    id="custom-exercise"
                    placeholder="Exercise name"
                    className="input"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && showExercisePicker !== null) {
                        const input = e.target as HTMLInputElement
                        if (input.value.trim()) {
                          addExercise(showExercisePicker, input.value.trim())
                          input.value = ''
                        }
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      const input = document.getElementById('custom-exercise') as HTMLInputElement
                      if (input?.value.trim() && showExercisePicker !== null) {
                        addExercise(showExercisePicker, input.value.trim())
                        input.value = ''
                      }
                    }}
                    className="btn-primary px-4"
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
