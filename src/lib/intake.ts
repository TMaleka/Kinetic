export type PrimaryGoal =
  | 'lose_fat' | 'build_muscle' | 'get_stronger' | 'endurance' | 'event'
  | 'mobility' | 'rehab' | 'sport' | 'health'

export const PRIMARY_GOALS: { id: PrimaryGoal; label: string; hint: string }[] = [
  { id: 'lose_fat', label: 'Lose body fat', hint: 'Drop weight, body fat % or waist size' },
  { id: 'build_muscle', label: 'Build muscle', hint: 'Gain size in specific areas' },
  { id: 'get_stronger', label: 'Get stronger', hint: 'Lift more on key exercises' },
  { id: 'endurance', label: 'Improve endurance', hint: 'Run, cycle or swim further/faster' },
  { id: 'event', label: 'Train for an event', hint: 'Race, wedding, competition, holiday' },
  { id: 'mobility', label: 'Mobility & flexibility', hint: 'Move better, reduce stiffness' },
  { id: 'rehab', label: 'Return from injury', hint: 'Rebuild after an injury or surgery' },
  { id: 'sport', label: 'Sport performance', hint: 'Speed, power, agility for a sport' },
  { id: 'health', label: 'Health & energy', hint: 'Blood pressure, energy, longevity' },
]

export const MUSCLE_AREAS = ['Chest', 'Back', 'Shoulders', 'Arms', 'Core', 'Glutes', 'Legs']
export const BODY_AREAS = ['Neck', 'Shoulder', 'Elbow', 'Wrist', 'Upper back', 'Lower back', 'Hip', 'Knee', 'Ankle']
export const EQUIPMENT = ['Full gym', 'Dumbbells', 'Barbell & rack', 'Kettlebells', 'Resistance bands', 'Pull-up bar', 'Cardio machine', 'None (bodyweight)']
export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
export const LIFTS = ['Squat', 'Bench press', 'Deadlift', 'Overhead press', 'Pull-ups']

export type LiftTarget = { lift: string; current: string; target: string }

export type IntakeDetails = {
  primaryGoal: PrimaryGoal | ''
  secondaryGoals: PrimaryGoal[]
  // goal-specific targets
  targetWeight: string
  targetBodyFat: string
  currentWaist: string
  targetWaist: string
  muscleAreas: string[]
  lifts: LiftTarget[]
  enduranceActivity: string
  enduranceDistance: string
  currentTime: string
  targetTime: string
  eventName: string
  eventDate: string
  sportName: string
  sportFocus: string
  mobilityAreas: string[]
  rehabInjury: string
  rehabCleared: '' | 'yes' | 'no'
  healthTarget: string
  // commitment
  targetDate: string
  successMeasure: string
  motivation: string
  pastAttempts: string
  // baseline
  age: string
  sex: '' | 'female' | 'male' | 'other'
  heightCm: string
  weightKg: string
  bodyFat: string
  experience: '' | 'beginner' | 'intermediate' | 'advanced'
  activityLevel: string
  currentTraining: string
  // health
  injuryAreas: string[]
  injuryDetails: string
  medicalConditions: string
  doctorRestriction: '' | 'yes' | 'no'
  painDuringExercise: '' | 'yes' | 'no'
  sleepHours: string
  stressLevel: string
  // logistics
  daysPerWeek: string
  sessionMinutes: string
  preferredDays: string[]
  location: string
  equipment: string[]
  enjoys: string
  dislikes: string
  nutritionHelp: '' | 'yes' | 'no'
}

export const EMPTY_INTAKE: IntakeDetails = {
  primaryGoal: '', secondaryGoals: [], targetWeight: '', targetBodyFat: '', currentWaist: '', targetWaist: '',
  muscleAreas: [], lifts: LIFTS.slice(0, 3).map((lift) => ({ lift, current: '', target: '' })),
  enduranceActivity: '', enduranceDistance: '', currentTime: '', targetTime: '', eventName: '', eventDate: '',
  sportName: '', sportFocus: '', mobilityAreas: [], rehabInjury: '', rehabCleared: '', healthTarget: '',
  targetDate: '', successMeasure: '', motivation: '', pastAttempts: '',
  age: '', sex: '', heightCm: '', weightKg: '', bodyFat: '', experience: '', activityLevel: '', currentTraining: '',
  injuryAreas: [], injuryDetails: '', medicalConditions: '', doctorRestriction: '', painDuringExercise: '',
  sleepHours: '', stressLevel: '', daysPerWeek: '', sessionMinutes: '', preferredDays: [], location: '',
  equipment: [], enjoys: '', dislikes: '', nutritionHelp: '',
}

export const goalLabel = (id: string) => PRIMARY_GOALS.find((g) => g.id === id)?.label || id

// A one-line, measurable summary used as client_goals.goal and on the trainer's lists.
export function buildGoalSummary(d: IntakeDetails): string {
  const by = d.targetDate ? ` by ${new Date(d.targetDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''
  switch (d.primaryGoal) {
    case 'lose_fat': {
      const parts = [d.weightKg && d.targetWeight && `${d.weightKg}kg → ${d.targetWeight}kg`, d.targetBodyFat && `${d.targetBodyFat}% body fat`, d.targetWaist && `${d.targetWaist}cm waist`].filter(Boolean)
      return `Lose body fat: ${parts.join(', ') || 'see details'}${by}`
    }
    case 'build_muscle':
      return `Build muscle${d.muscleAreas.length ? ` (${d.muscleAreas.join(', ')})` : ''}${d.targetWeight ? `, reach ${d.targetWeight}kg` : ''}${by}`
    case 'get_stronger': {
      const lifts = d.lifts.filter((l) => l.target).map((l) => `${l.lift} ${l.current || '?'}→${l.target}kg`)
      return `Get stronger: ${lifts.join(', ') || 'see details'}${by}`
    }
    case 'endurance':
      return `${d.enduranceActivity || 'Endurance'}: ${d.enduranceDistance}${d.targetTime ? ` in ${d.targetTime}` : ''}${d.currentTime ? ` (now ${d.currentTime})` : ''}${by}`
    case 'event':
      return `Prepare for ${d.eventName || 'event'}${d.eventDate ? ` on ${new Date(d.eventDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}`
    case 'mobility':
      return `Improve mobility${d.mobilityAreas.length ? `: ${d.mobilityAreas.join(', ')}` : ''}${by}`
    case 'rehab':
      return `Return from injury: ${d.rehabInjury || 'see details'}${by}`
    case 'sport':
      return `${d.sportName || 'Sport'} performance: ${d.sportFocus || 'see details'}${by}`
    case 'health':
      return `Health: ${d.healthTarget || 'see details'}${by}`
    default:
      return 'Goal not set'
  }
}

// Reads structured intake from a client_goals row (details column, or the pre-migration fallback).
export function intakeFromGoalRow(row: { details?: unknown; additional_targets?: string | null }): Partial<IntakeDetails> | null {
  if (row.details && typeof row.details === 'object') return row.details as Partial<IntakeDetails>
  if (row.additional_targets?.startsWith('INTAKE_JSON:')) {
    try {
      return JSON.parse(row.additional_targets.slice('INTAKE_JSON:'.length))
    } catch {
      return null
    }
  }
  return null
}
