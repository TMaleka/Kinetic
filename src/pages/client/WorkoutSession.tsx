import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Check, Plus, Dumbbell, Trophy, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { Spinner } from '../../components/ui'
import { addActivityEvent } from '../../lib/queries'
import { createNotification } from '../../lib/notifications'

type LogEntry = {
  id?: string
  exercise_name: string
  set_number: number
  reps: number | null
  weight: number | null
  completed: boolean
}

export function WorkoutSession() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [session, setSession] = useState<any>(null)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0)
  const [completed, setCompleted] = useState(false)
  const [showCompletion, setShowCompletion] = useState(false)
  const [feeling, setFeeling] = useState<number>(0)
  const [error, setError] = useState('')
  const [savedMessage, setSavedMessage] = useState('')
  const [useMockData] = useState(false) // Set to false for production

  useEffect(() => {
    if (sessionId) loadSession()
  }, [sessionId])

  const loadSession = async () => {
    if (!sessionId) return
    
    // Mock data for testing (disabled in production)
    /*
    if (useMockData) {
      setSession({
        id: sessionId,
        title: 'Upper Body Strength',
        status: 'scheduled',
        scheduled_date: new Date().toISOString(),
        feeling: 0
      })
      
      setLogs([
        {
          exercise_name: 'Bench Press',
          set_number: 1,
          reps: 12,
          weight: 60,
          completed: false
        },
        {
          exercise_name: 'Bench Press',
          set_number: 2,
          reps: 10,
          weight: 65,
          completed: false
        },
        {
          exercise_name: 'Bench Press',
          set_number: 3,
          reps: 8,
          weight: 70,
          completed: false
        },
        {
          exercise_name: 'Shoulder Press',
          set_number: 4,
          reps: 12,
          weight: 20,
          completed: false
        },
        {
          exercise_name: 'Shoulder Press',
          set_number: 5,
          reps: 10,
          weight: 22,
          completed: false
        },
        {
          exercise_name: 'Lat Pulldown',
          set_number: 6,
          reps: 12,
          weight: 40,
          completed: false
        },
        {
          exercise_name: 'Lat Pulldown',
          set_number: 7,
          reps: 10,
          weight: 45,
          completed: false
        }
      ])
      
      setLoading(false)
      return
    }
    */
    
    try {
      const { data: sessionData } = await supabase
        .from('workout_sessions')
        .select('*')
        .eq('id', sessionId)
        .maybeSingle()

      setSession(sessionData)
      setFeeling(sessionData?.feeling || 0)

      // Load plan exercises if linked
      if (sessionData?.plan_day_id) {
        const { data: exercises } = await supabase
          .from('plan_exercises')
          .select('*')
          .eq('plan_day_id', sessionData.plan_day_id)
          .order('exercise_order', { ascending: true })

        // Initialize logs from plan exercises
        const { data: existingLogs } = await supabase
          .from('session_logs')
          .select('*')
          .eq('session_id', sessionId)
          .order('set_number', { ascending: true })

        if (existingLogs && existingLogs.length > 0) {
          setLogs(existingLogs)
        } else if (exercises && exercises.length > 0) {
          const initialLogs: LogEntry[] = []
          let setNum = 1
          for (const ex of exercises) {
            for (let s = 0; s < ex.target_sets; s++) {
              initialLogs.push({
                exercise_name: ex.name,
                set_number: setNum++,
                reps: ex.target_reps,
                weight: ex.target_weight || null,
                completed: false,
              })
            }
          }
          setLogs(initialLogs)
        }
      }

      if (sessionData?.status === 'completed') {
        setCompleted(true)
      }
    } catch (err) {
      console.error(err)
      setError('Failed to load workout session. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Group logs by exercise
  const exerciseGroups: { name: string; logs: LogEntry[] }[] = []
  logs.forEach((log) => {
    let group = exerciseGroups.find((g) => g.name === log.exercise_name)
    if (!group) {
      group = { name: log.exercise_name, logs: [] }
      exerciseGroups.push(group)
    }
    group.logs.push(log)
  })

  const currentExercise = exerciseGroups[currentExerciseIndex]
  const currentLogs = currentExercise?.logs || []

  const updateLog = (setIndex: number, field: keyof LogEntry, value: any) => {
    const logIndex = logs.findIndex(l => 
      l.exercise_name === currentExercise.name && 
      l.set_number === currentLogs[setIndex].set_number
    )
    if (logIndex === -1) return
    
    const updated = [...logs]
    ;(updated[logIndex] as any)[field] = value
    setLogs(updated)
  }

  const toggleComplete = (setIndex: number) => {
    const logIndex = logs.findIndex(l => 
      l.exercise_name === currentExercise.name && 
      l.set_number === currentLogs[setIndex].set_number
    )
    if (logIndex === -1) return
    
    const updated = [...logs]
    updated[logIndex].completed = !updated[logIndex].completed
    setLogs(updated)
  }

  const addSet = () => {
    const exerciseLogs = logs.filter((l) => l.exercise_name === currentExercise.name)
    const maxSet = Math.max(...exerciseLogs.map((l) => l.set_number), 0)
    setLogs([
      ...logs,
      {
        exercise_name: currentExercise.name,
        set_number: maxSet + 1,
        reps: exerciseLogs[0]?.reps ?? 10,
        weight: exerciseLogs[0]?.weight ?? null,
        completed: false,
      },
    ])
  }

  const persistLogs = async () => {
    const { error: deleteError } = await supabase.from('session_logs').delete().eq('session_id', sessionId)
    if (deleteError) throw deleteError
    if (logs.length > 0) {
      const { error: insertError } = await supabase.from('session_logs').insert(
        logs.map((l) => ({
          session_id: sessionId,
          exercise_name: l.exercise_name,
          set_number: l.set_number,
          reps: l.reps,
          weight: l.weight,
          completed: l.completed,
        })),
      )
      if (insertError) throw insertError
    }
  }

  const handleSave = async () => {
    if (!sessionId || !profile) return
    setSaving(true)
    try {
      await persistLogs()
      const { error: updateError } = await supabase
        .from('workout_sessions')
        .update({ status: 'in_progress' })
        .eq('id', sessionId)
      if (updateError) throw updateError
      setSavedMessage('Progress saved')
      setTimeout(() => setSavedMessage(''), 2500)
    } catch (err: any) {
      console.error(err)
      alert(`Failed to save progress: ${err?.message || 'Unknown error'}`)
    } finally {
      setSaving(false)
    }
  }

  const handleOpenCompletion = () => {
    const remaining = logs.filter((l) => !l.completed).length
    if (remaining > 0 && !confirm(`${remaining} set${remaining === 1 ? '' : 's'} not ticked off yet. Finish the workout anyway?`)) return
    setShowCompletion(true)
  }

  const handleComplete = async () => {
    if (!sessionId || !profile) return
    setSaving(true)
    try {
      await persistLogs()
      const { error: updateError } = await supabase
        .from('workout_sessions')
        .update({
          feeling: feeling || null,
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', sessionId)
      if (updateError) throw updateError
      await addActivityEvent(profile.id, session?.trainer_id || null, 'workout_completed', `Completed: ${session?.title}`)
      if (session?.trainer_id) {
        await createNotification(
          session.trainer_id,
          'workout_completed',
          'Workout completed',
          `${profile.full_name} completed "${session.title}".`,
          { session_id: sessionId },
        )
      }
      setCompleted(true)
      setShowCompletion(false)
    } catch (err: any) {
      console.error(err)
      alert(`Failed to complete workout: ${err?.message || 'Unknown error'}`)
    } finally {
      setSaving(false)
    }
  }

  const completionModal = showCompletion && (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50">
      <div className="card p-6 max-w-sm w-full">
        <div className="grid size-16 place-items-center rounded-full bg-[#d6f0e3] text-[#075a38] mx-auto mb-4">
          <Trophy size={32} />
        </div>
        <h2 className="font-display text-xl font-semibold text-[#0f2a3a] text-center mb-2">Finish workout</h2>
        <p className="text-sm text-[#64748b] text-center mb-6">
          {logs.filter(l => l.completed).length} of {logs.length} sets completed
        </p>

        <p className="text-[10px] font-semibold uppercase tracking-[.12em] text-[#94a3b8] mb-3">How did it feel?</p>
        <div className="flex gap-2 mb-6">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => setFeeling(n)}
              aria-label={`${n} star${n === 1 ? '' : 's'}`}
              className={`flex-1 py-3 text-2xl ${feeling >= n ? 'text-[#1787c4]' : 'text-[#cbd5e1]'}`}
            >
              ★
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <button onClick={() => setShowCompletion(false)} disabled={saving} className="btn-secondary flex-1">
            Cancel
          </button>
          <button onClick={handleComplete} disabled={saving} className="btn-primary flex-1">
            {saving ? 'Completing...' : 'Done'}
          </button>
        </div>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size={40} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-sm text-[#f3263a] bg-[#fde3e6] rounded-lg px-4 py-3 mb-4">{error}</p>
          <button onClick={loadSession} className="btn-primary">Retry</button>
        </div>
      </div>
    )
  }

  if (completed) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-20">
        <div className="text-center">
          <div className="grid size-20 place-items-center rounded-full bg-[#d6f0e3] text-[#075a38] mx-auto mb-6">
            <Trophy size={40} />
          </div>
          <h1 className="font-display text-4xl font-semibold tracking-tight text-[#0f2a3a] mb-2">Workout complete!</h1>
          <p className="text-sm text-[#64748b] mb-6">
            {logs.filter(l => l.completed).length} sets completed
          </p>
          <Link to="/app/workouts" className="btn-primary">
            Done
          </Link>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 px-6 py-20">
        <p className="text-sm text-[#64748b]">Workout not found</p>
        <Link to="/app/workouts" className="btn-primary">Back to workouts</Link>
      </div>
    )
  }

  if (!currentExercise) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 px-6 py-20 text-center">
        <h1 className="font-display text-2xl font-semibold text-[#0f2a3a]">{session.title}</h1>
        <p className="text-sm text-[#64748b]">Your trainer hasn't added exercises to this workout.</p>
        <div className="flex gap-3">
          <Link to="/app/workouts" className="btn-secondary">Back to workouts</Link>
          <button onClick={() => setShowCompletion(true)} className="btn-primary">Mark as done</button>
        </div>
        {completionModal}
      </div>
    )
  }

  const completedInExercise = currentLogs.filter(l => l.completed).length
  const totalInExercise = currentLogs.length
  const isLastExercise = currentExerciseIndex === exerciseGroups.length - 1

  return (
    <div className="flex flex-col gap-7">
      <button
        onClick={() => navigate('/app/workouts')}
        className="flex w-fit items-center gap-2 text-xs font-semibold text-[#1787c4]"
      >
        ← Back to workouts
      </button>

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[.14em] text-[#1787c4]">
            Exercise {currentExerciseIndex + 1} of {exerciseGroups.length}
          </p>
          <h1 className="font-display text-4xl font-semibold tracking-tight text-[#0f2a3a]">{currentExercise.name}</h1>
        </div>
        <div className="flex items-center gap-2 text-sm text-[#64748b]">
          <Dumbbell className="size-4" />
          {totalInExercise} sets
        </div>
      </div>

      <section className="card p-6">
        <div className="flex items-center justify-between border-b border-[#dceaf2] pb-3">
          <span className="text-[10px] font-semibold uppercase tracking-[.12em] text-[#94a3b8] w-12">Set</span>
          <span className="text-[10px] font-semibold uppercase tracking-[.12em] text-[#94a3b8] flex-1">Reps</span>
          <span className="text-[10px] font-semibold uppercase tracking-[.12em] text-[#94a3b8] w-20">Weight</span>
          <span className="text-[10px] font-semibold uppercase tracking-[.12em] text-[#94a3b8] w-12 text-right">Done</span>
        </div>
        
        {currentLogs.map((log, idx) => (
          <div 
            key={log.set_number} 
            className={`flex items-center py-4 border-b border-[#dceaf2] ${
              idx === currentLogs.length - 1 ? 'bg-[#eef7fc]' : ''
            }`}
          >
            <span className="w-12 text-lg font-semibold text-[#0f2a3a]">{log.set_number}</span>
            <div className="flex-1">
              <input
                type="number"
                value={log.reps ?? ''}
                onChange={(e) => updateLog(idx, 'reps', e.target.value ? parseInt(e.target.value) : null)}
                className="w-full bg-transparent text-lg font-semibold text-[#0f2a3a] outline-none"
                placeholder="-"
              />
            </div>
            <div className="w-20">
              <input
                type="number"
                step="0.5"
                value={log.weight ?? ''}
                onChange={(e) => updateLog(idx, 'weight', e.target.value ? parseFloat(e.target.value) : null)}
                className="w-full bg-transparent text-lg font-semibold text-[#0f2a3a] outline-none text-right"
                placeholder="-"
              />
              <span className="text-[10px] text-[#64748b] ml-1">kg</span>
            </div>
            <div className="w-12 text-right">
              <button
                onClick={() => toggleComplete(idx)}
                className={`grid size-10 place-items-center ${
                  log.completed ? 'bg-[#075a38] text-white' : 'bg-[#f1f5f9] text-[#64748b]'
                }`}
              >
                {log.completed && <Check size={20} />}
              </button>
            </div>
          </div>
        ))}
        
        <button
          onClick={addSet}
          className="w-full py-4 text-sm text-[#64748b] hover:text-[#0f2a3a] flex items-center justify-center gap-2"
        >
          <Plus size={20} />
          Add set
        </button>
      </section>

      <p className="text-xs text-[#64748b]">
        {completedInExercise} of {totalInExercise} sets done for this exercise
        {savedMessage && <span className="ml-2 font-semibold text-[#075a38]">· {savedMessage}</span>}
      </p>

      <div className="flex flex-wrap gap-3">
        {currentExerciseIndex > 0 && (
          <button onClick={() => setCurrentExerciseIndex(i => i - 1)} className="btn-secondary flex-1">
            <ChevronLeft className="size-4" />Previous
          </button>
        )}
        <button onClick={handleSave} disabled={saving} className="btn-secondary flex-1">
          {saving ? 'Saving...' : 'Save progress'}
        </button>
        {isLastExercise ? (
          <button onClick={handleOpenCompletion} className="btn-primary flex-1">
            Complete workout
          </button>
        ) : (
          <button onClick={() => setCurrentExerciseIndex(i => i + 1)} className="btn-primary flex-1">
            Next exercise<ChevronRight className="size-4" />
          </button>
        )}
      </div>

      {completionModal}
    </div>
  )
}
