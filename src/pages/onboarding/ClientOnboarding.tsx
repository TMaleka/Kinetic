import { useEffect, useState, type ReactNode } from 'react'
import { ChevronRight, ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import {
  BODY_AREAS, EMPTY_INTAKE, EQUIPMENT, LIFTS, MUSCLE_AREAS, PRIMARY_GOALS, WEEKDAYS,
  buildGoalSummary, pruneIntake, type IntakeDetails, type PrimaryGoal,
} from '../../lib/intake'
import { ClientIntakeSummary } from '../../components/ClientIntakeSummary'
import { fetchGoalHistory } from '../../lib/activeGoal'
import { intakeFromGoalRow } from '../../lib/intake'
import { createNotification } from '../../lib/notifications'

const STEPS = ['goal', 'targets', 'baseline', 'health', 'schedule', 'review'] as const
type Step = (typeof STEPS)[number]
const STEP_TITLES: Record<Step, [string, string]> = {
  goal: ['What do you want to achieve?', 'Pick the one goal that matters most right now.'],
  targets: ['Make it measurable', 'Specific numbers and a deadline help your trainer build the right plan.'],
  baseline: ['Where you are today', 'Your starting point, so progress can be tracked.'],
  health: ['Health & limitations', 'Keeps your training safe. Only your trainer sees this.'],
  schedule: ['Your schedule & preferences', 'So your plan fits your life.'],
  review: ['Check your answers', 'Your trainer will review this and confirm or adjust your goal.'],
}

function Field({ label, required, children, hint }: { label: string; required?: boolean; children: ReactNode; hint?: string }) {
  return (
    <div>
      <label className="label">{label}{required && <span className="text-[#f3263a]"> *</span>}</label>
      <div className="mt-1">{children}</div>
      {hint && <p className="mt-1 text-[11px] text-[#64748b]">{hint}</p>}
    </div>
  )
}

function Chips({ options, value, onChange, single }: { options: string[]; value: string[]; onChange: (v: string[]) => void; single?: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = value.includes(o)
        return (
          <button
            key={o}
            type="button"
            onClick={() => onChange(single ? [o] : on ? value.filter((v) => v !== o) : [...value, o])}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${on ? 'border-[#28a9e8] bg-[#28a9e8] text-white' : 'border-[#d9e9f2] bg-white text-[#334155] hover:border-[#28a9e8]'}`}
          >
            {o}
          </button>
        )
      })}
    </div>
  )
}

function YesNo({ value, onChange }: { value: string; onChange: (v: 'yes' | 'no') => void }) {
  return <Chips single options={['Yes', 'No']} value={value ? [value === 'yes' ? 'Yes' : 'No'] : []} onChange={(v) => onChange(v[0] === 'Yes' ? 'yes' : 'no')} />
}

export function ClientOnboarding({ mode = 'onboarding' }: { mode?: 'onboarding' | 'edit' }) {
  const editing = mode === 'edit'
  const { profile, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('goal')
  const [d, setD] = useState<IntakeDetails>(EMPTY_INTAKE)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  // Edit mode: keep the old starting weight while continuing the same goal; a new goal starts from the latest weight.
  const [weightBaseline, setWeightBaseline] = useState<{ primary: string; previous: string; latest: string } | null>(null)
  useEffect(() => {
    if (!editing || !profile) return
    fetchGoalHistory(profile.id)
      .then(async ({ active }) => {
        const prev = active ? intakeFromGoalRow(active) : null
        const { data: m } = await supabase.from('measurements').select('body_weight').eq('client_id', profile.id).not('body_weight', 'is', null).order('logged_at', { ascending: false }).order('created_at', { ascending: false }).limit(1)
        const latest = m?.[0]?.body_weight != null ? String(m[0].body_weight) : ''
        setWeightBaseline({ primary: prev?.primaryGoal || '', previous: prev?.weightKg || latest, latest: latest || prev?.weightKg || '' })
        setD((cur) => ({ ...cur, ...(prev || {}), weightKg: prev?.weightKg || latest || cur.weightKg }))
      })
      .catch((err) => console.error('Failed to load current goal:', err))
  }, [editing, profile])
  const set = <K extends keyof IntakeDetails>(key: K, value: IntakeDetails[K]) => setD((prev) => ({ ...prev, [key]: value }))
  const text = (key: keyof IntakeDetails, placeholder = '', type = 'text') => (
    <input type={type} value={d[key] as string} onChange={(e) => set(key, e.target.value as never)} placeholder={placeholder} className="input" />
  )
  const area = (key: keyof IntakeDetails, placeholder = '') => (
    <textarea value={d[key] as string} onChange={(e) => set(key, e.target.value as never)} placeholder={placeholder} rows={2} className="input h-auto resize-none py-2" />
  )
  const select = (key: keyof IntakeDetails, options: [string, string][]) => (
    <select value={d[key] as string} onChange={(e) => set(key, e.target.value as never)} className="input">
      <option value="">Select…</option>
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  )

  const goalTargetsValid = () => {
    switch (d.primaryGoal) {
      case 'lose_fat': return !!(d.targetWeight || d.targetBodyFat || d.targetWaist)
      case 'build_muscle': return d.muscleAreas.length > 0
      case 'get_stronger': return d.lifts.some((l) => l.target)
      case 'endurance': return !!(d.enduranceActivity && d.enduranceDistance)
      case 'event': return !!(d.eventName && d.eventDate)
      case 'mobility': return d.mobilityAreas.length > 0
      case 'rehab': return !!(d.rehabInjury && d.rehabCleared)
      case 'sport': return !!(d.sportName && d.sportFocus)
      case 'health': return !!d.healthTarget
      default: return false
    }
  }
  const valid: Record<Step, boolean> = {
    goal: !!d.primaryGoal,
    targets: goalTargetsValid() && !!(d.targetDate || d.primaryGoal === 'event') && d.successMeasure.trim().length > 3 && d.motivation.trim().length > 3,
    baseline: !!(d.heightCm && d.weightKg && d.experience && d.activityLevel),
    health: !!(d.doctorRestriction && d.painDuringExercise),
    schedule: !!(d.daysPerWeek && d.sessionMinutes && d.location),
    review: true,
  }
  const index = STEPS.indexOf(step)

  const handleSubmit = async () => {
    if (!profile) return
    setLoading(true)
    setError('')
    const details = pruneIntake(d)
    const base = {
      client_id: profile.id,
      goal: buildGoalSummary(details),
      starting_weight: d.weightKg ? parseFloat(d.weightKg) : null,
      target_weight: details.targetWeight ? parseFloat(details.targetWeight) : null,
      timeline: details.targetDate || null,
      starting_height: d.heightCm ? parseFloat(d.heightCm) : null,
      activity_level: d.activityLevel || null,
      injuries: [d.injuryAreas.join(', '), d.injuryDetails].filter(Boolean).join(' — ') || null,
    }
    try {
      let { error: goalError } = await supabase.from('client_goals').insert({
        ...base, additional_targets: d.successMeasure, details, target_date: details.targetDate || null,
      })
      if (goalError && /details|target_date/.test(goalError.message)) {
        // Migration 008 not applied yet: keep the full answers in additional_targets.
        ;({ error: goalError } = await supabase.from('client_goals').insert({ ...base, additional_targets: `INTAKE_JSON:${JSON.stringify(details)}` }))
      }
      if (goalError) throw goalError

      if (editing) {
        const { data: links } = await supabase.from('trainer_client_links').select('trainer_id').eq('client_id', profile.id).eq('status', 'active')
        await Promise.all((links || []).map((l) => createNotification(l.trainer_id, 'goal_updated', 'Goal update to review', `${profile.full_name || 'Your client'} updated their goal: ${base.goal}`, { client_id: profile.id })))
        navigate('/app/goals')
        return
      }

      if (d.weightKg) {
        const { error: mError } = await supabase.from('measurements').insert({ client_id: profile.id, body_weight: parseFloat(d.weightKg) })
        if (mError) console.error('Failed to save starting weight:', mError)
      }
      const { error: profileError } = await supabase.from('profiles').update({ onboarding_completed: true }).eq('id', profile.id)
      if (profileError) throw profileError
      await refreshProfile()
      navigate('/app')
    } catch (err: any) {
      console.error('Onboarding error:', err)
      setError(`Could not save your details: ${err?.message || 'Unknown error'}. Please try again.`)
    } finally {
      setLoading(false)
    }
  }

  const renderTargets = () => {
    switch (d.primaryGoal) {
      case 'lose_fat':
        return (
          <div className="grid grid-cols-2 gap-4">
            <Field label="Target weight (kg)">{text('targetWeight', '75', 'number')}</Field>
            <Field label="Target body fat (%)">{text('targetBodyFat', '18', 'number')}</Field>
            <Field label="Current waist (cm)">{text('currentWaist', '92', 'number')}</Field>
            <Field label="Target waist (cm)">{text('targetWaist', '84', 'number')}</Field>
            <p className="col-span-2 text-[11px] text-[#64748b]">Fill in at least one target.</p>
          </div>
        )
      case 'build_muscle':
        return (
          <>
            <Field label="Areas to build" required><Chips options={MUSCLE_AREAS} value={d.muscleAreas} onChange={(v) => set('muscleAreas', v)} /></Field>
            <Field label="Target body weight (kg)" hint="Optional">{text('targetWeight', '80', 'number')}</Field>
          </>
        )
      case 'get_stronger':
        return (
          <Field label="Lifts — current best and target (kg)" required hint="Leave blank any lift you don't do. Use reps for pull-ups.">
            <div className="space-y-2">
              {d.lifts.map((l, i) => (
                <div key={i} className="grid grid-cols-[1.4fr_1fr_1fr] gap-2">
                  <select value={l.lift} onChange={(e) => set('lifts', d.lifts.map((x, j) => (j === i ? { ...x, lift: e.target.value } : x)))} className="input">
                    {LIFTS.map((n) => <option key={n}>{n}</option>)}
                  </select>
                  <input type="number" placeholder="Now" value={l.current} onChange={(e) => set('lifts', d.lifts.map((x, j) => (j === i ? { ...x, current: e.target.value } : x)))} className="input" />
                  <input type="number" placeholder="Target" value={l.target} onChange={(e) => set('lifts', d.lifts.map((x, j) => (j === i ? { ...x, target: e.target.value } : x)))} className="input" />
                </div>
              ))}
            </div>
          </Field>
        )
      case 'endurance':
        return (
          <div className="grid grid-cols-2 gap-4">
            <Field label="Activity" required>{select('enduranceActivity', [['Running', 'Running'], ['Cycling', 'Cycling'], ['Swimming', 'Swimming'], ['Rowing', 'Rowing'], ['Walking/hiking', 'Walking/hiking']])}</Field>
            <Field label="Distance" required>{text('enduranceDistance', '10 km')}</Field>
            <Field label="Current time">{text('currentTime', '62 min')}</Field>
            <Field label="Target time">{text('targetTime', '50 min')}</Field>
          </div>
        )
      case 'event':
        return (
          <div className="grid grid-cols-2 gap-4">
            <Field label="Event" required>{text('eventName', 'Comrades half, wedding…')}</Field>
            <Field label="Event date" required>{text('eventDate', '', 'date')}</Field>
          </div>
        )
      case 'mobility':
        return <Field label="Areas that feel tight or restricted" required><Chips options={BODY_AREAS} value={d.mobilityAreas} onChange={(v) => set('mobilityAreas', v)} /></Field>
      case 'rehab':
        return (
          <>
            <Field label="Injury or surgery" required>{area('rehabInjury', 'e.g. ACL reconstruction left knee, March 2026')}</Field>
            <Field label="Cleared to train by a doctor/physio?" required><YesNo value={d.rehabCleared} onChange={(v) => set('rehabCleared', v)} /></Field>
          </>
        )
      case 'sport':
        return (
          <div className="grid grid-cols-2 gap-4">
            <Field label="Sport" required>{text('sportName', 'Soccer')}</Field>
            <Field label="What to improve" required>{text('sportFocus', 'Sprint speed, stamina')}</Field>
          </div>
        )
      case 'health':
        return <Field label="Specific health target" required>{area('healthTarget', 'e.g. Lower blood pressure to 120/80, walk 10k steps daily')}</Field>
      default:
        return null
    }
  }

  const renderStep = () => {
    switch (step) {
      case 'goal':
        return (
          <>
            <div className="grid gap-2 sm:grid-cols-3">
              {PRIMARY_GOALS.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setD((prev) => ({
                    ...prev,
                    primaryGoal: g.id,
                    secondaryGoals: prev.secondaryGoals.filter((s) => s !== g.id),
                    ...(weightBaseline && [weightBaseline.previous, weightBaseline.latest].includes(prev.weightKg) ? { weightKg: g.id === weightBaseline.primary ? weightBaseline.previous : weightBaseline.latest } : {}),
                  }))}
                  className={`rounded-xl border p-3 text-left transition ${d.primaryGoal === g.id ? 'border-[#28a9e8] bg-[#e0f3fc]' : 'border-[#d9e9f2] hover:border-[#28a9e8]'}`}
                >
                  <p className="text-sm font-semibold text-[#0f2a3a]">{g.label}</p>
                  <p className="mt-0.5 text-[11px] text-[#64748b]">{g.hint}</p>
                </button>
              ))}
            </div>
            {d.primaryGoal && (
              <Field label="Anything else you'd like to work on?" hint="Optional">
                <Chips
                  options={PRIMARY_GOALS.filter((g) => g.id !== d.primaryGoal).map((g) => g.label)}
                  value={d.secondaryGoals.map((s) => PRIMARY_GOALS.find((g) => g.id === s)!.label)}
                  onChange={(labels) => set('secondaryGoals', labels.map((l) => PRIMARY_GOALS.find((g) => g.label === l)!.id as PrimaryGoal))}
                />
              </Field>
            )}
          </>
        )
      case 'targets':
        return (
          <>
            {renderTargets()}
            {d.primaryGoal !== 'event' && <Field label="Target date" required>{text('targetDate', '', 'date')}</Field>}
            <Field label="How will you know you've succeeded?" required hint="Be specific, e.g. “Fit into size 32 jeans” or “Run 5 km without stopping”.">{area('successMeasure')}</Field>
            <Field label="Why does this matter to you?" required hint="Your trainer uses this to keep you motivated.">{area('motivation', 'e.g. Keep up with my kids, doctor said lose weight…')}</Field>
            <Field label="What have you tried before, and what got in the way?">{area('pastAttempts')}</Field>
          </>
        )
      case 'baseline':
        return (
          <div className="grid grid-cols-2 gap-4">
            <Field label="Height (cm)" required>{text('heightCm', '175', 'number')}</Field>
            <Field label="Weight (kg)" required>{text('weightKg', '82', 'number')}</Field>
            <Field label="Age">{text('age', '32', 'number')}</Field>
            <Field label="Sex">{select('sex', [['female', 'Female'], ['male', 'Male'], ['other', 'Other / prefer not to say']])}</Field>
            <Field label="Body fat % (if known)">{text('bodyFat', '', 'number')}</Field>
            <Field label="Training experience" required>{select('experience', [['beginner', 'Beginner (< 6 months)'], ['intermediate', 'Intermediate (6 months – 2 years)'], ['advanced', 'Advanced (2+ years)']])}</Field>
            <div className="col-span-2">
              <Field label="Current activity level" required>{select('activityLevel', [['Sedentary', 'Sedentary — desk job, little exercise'], ['Light', 'Light — 1–2 workouts/week'], ['Moderate', 'Moderate — 3–4 workouts/week'], ['Active', 'Active — 5+ workouts/week'], ['Very active', 'Very active — physical job + training']])}</Field>
            </div>
            <div className="col-span-2"><Field label="What does your training look like now?">{area('currentTraining', 'e.g. Gym 2x/week (machines), 5 km run on Sundays')}</Field></div>
            <Field label="Average sleep (hours)">{text('sleepHours', '7', 'number')}</Field>
            <Field label="Stress level">{select('stressLevel', [['1', '1 — very low'], ['2', '2'], ['3', '3 — moderate'], ['4', '4'], ['5', '5 — very high']])}</Field>
          </div>
        )
      case 'health':
        return (
          <>
            <Field label="Has a doctor ever told you to limit physical activity?" required><YesNo value={d.doctorRestriction} onChange={(v) => set('doctorRestriction', v)} /></Field>
            <Field label="Do you feel pain during or after exercise?" required><YesNo value={d.painDuringExercise} onChange={(v) => set('painDuringExercise', v)} /></Field>
            <Field label="Current or past injuries"><Chips options={BODY_AREAS} value={d.injuryAreas} onChange={(v) => set('injuryAreas', v)} /></Field>
            {d.injuryAreas.length > 0 && <Field label="Tell us more about the injury">{area('injuryDetails', 'What happened, when, and what movements hurt')}</Field>}
            <Field label="Medical conditions or medication">{area('medicalConditions', 'e.g. Asthma, high blood pressure, diabetes — or leave blank')}</Field>
          </>
        )
      case 'schedule':
        return (
          <>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Days per week you can train" required>{select('daysPerWeek', ['1', '2', '3', '4', '5', '6', '7'].map((n) => [n, n]))}</Field>
              <Field label="Time per session" required>{select('sessionMinutes', [['20', '20 min'], ['30', '30 min'], ['45', '45 min'], ['60', '60 min'], ['90', '90+ min']])}</Field>
            </div>
            <Field label="Preferred days"><Chips options={WEEKDAYS} value={d.preferredDays} onChange={(v) => set('preferredDays', v)} /></Field>
            <Field label="Where will you train?" required>{select('location', [['Commercial gym', 'Commercial gym'], ['Home', 'Home'], ['Outdoors', 'Outdoors'], ['Mix', 'A mix']])}</Field>
            <Field label="Equipment you have access to"><Chips options={EQUIPMENT} value={d.equipment} onChange={(v) => set('equipment', v)} /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Exercises you enjoy">{area('enjoys')}</Field>
              <Field label="Exercises you dislike">{area('dislikes')}</Field>
            </div>
            <Field label="Would you like nutrition guidance too?"><YesNo value={d.nutritionHelp} onChange={(v) => set('nutritionHelp', v)} /></Field>
          </>
        )
      case 'review':
        return (
          <>
            <div className="rounded-xl bg-[#e0f3fc] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#1787c4]">Your goal</p>
              <p className="mt-1 text-sm font-semibold text-[#0f2a3a]">{buildGoalSummary(pruneIntake(d))}</p>
            </div>
            <ClientIntakeSummary details={pruneIntake(d)} />
          </>
        )
    }
  }

  return (
    <div className="min-h-screen bg-[#f7fbfd] flex items-start justify-center p-4">
      <div className={`w-full ${step === 'review' ? 'max-w-3xl' : 'max-w-xl'}`}>
        <div className="mb-6 flex items-center justify-between">
          <span className="text-xs font-semibold text-[#1787c4]">Step {index + 1} of {STEPS.length}</span>
          <div className="flex gap-1">
            {STEPS.map((s, i) => <div key={s} className={`h-1.5 w-8 rounded-full ${i <= index ? 'bg-[#28a9e8]' : 'bg-[#d9e9f2]'}`} />)}
          </div>
        </div>
        <div className="card p-6 sm:p-8">
          <h2 className="font-display text-2xl font-semibold text-[#0f2a3a]">{STEP_TITLES[step][0]}</h2>
          <p className="mt-1 mb-6 text-sm text-[#64748b]">{STEP_TITLES[step][1]}</p>
          <div className="space-y-5">{renderStep()}</div>
        </div>
        {error && <p className="mt-4 rounded-lg bg-[#fde3e6] px-4 py-3 text-sm text-[#f3263a]">{error}</p>}
        <div className="mt-6 flex gap-3">
          {index > 0 && (
            <button onClick={() => setStep(STEPS[index - 1])} className="btn-secondary flex-1 py-3">
              <ChevronLeft className="size-4" />Back
            </button>
          )}
          <button
            onClick={step === 'review' ? handleSubmit : () => setStep(STEPS[index + 1])}
            disabled={loading || !valid[step]}
            className="btn-primary flex-1 py-3 disabled:opacity-50"
          >
            {loading ? 'Saving…' : step === 'review' ? (editing ? 'Send update to my trainer' : 'Send to my trainer') : 'Next'}
            {step !== 'review' && <ChevronRight className="size-4" />}
          </button>
        </div>
        {!valid[step] && <p className="mt-2 text-center text-[11px] text-[#64748b]">Fill in the fields marked * to continue.</p>}
      </div>
    </div>
  )
}
