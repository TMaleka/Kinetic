import { goalLabel, type IntakeDetails, type PrimaryGoal } from './intake'

export type MetricSource = 'weight' | 'waist' | 'metric'

export type MetricDef = {
  key: string
  label: string
  unit: string
  goal: PrimaryGoal
  source: MetricSource
  lowerIsBetter: boolean
  baseline?: number
  target?: number
  hint?: string
}

const num = (v?: string) => {
  const n = parseFloat(v || '')
  return Number.isFinite(n) ? n : undefined
}

function defsFor(goal: PrimaryGoal, d: Partial<IntakeDetails>, isPrimary: boolean): MetricDef[] {
  // Secondary goals have no specific targets captured, so they get the generic metrics only.
  const t = isPrimary ? d : {}
  switch (goal) {
    case 'lose_fat':
      return [
        { key: 'weight', label: 'Body weight', unit: 'kg', goal, source: 'weight', lowerIsBetter: true, baseline: num(d.weightKg), target: num(t.targetWeight) },
        { key: 'body_fat', label: 'Body fat', unit: '%', goal, source: 'metric', lowerIsBetter: true, baseline: num(d.bodyFat), target: num(t.targetBodyFat) },
        { key: 'waist', label: 'Waist', unit: 'cm', goal, source: 'waist', lowerIsBetter: true, baseline: num(t.currentWaist), target: num(t.targetWaist) },
      ]
    case 'build_muscle':
      return [
        { key: 'weight', label: 'Body weight', unit: 'kg', goal, source: 'weight', lowerIsBetter: false, baseline: num(d.weightKg), target: num(t.targetWeight) },
        ...(t.muscleAreas?.length ? t.muscleAreas : ['Arms', 'Chest']).map((area): MetricDef => ({
          key: `size:${area}`, label: `${area} circumference`, unit: 'cm', goal, source: 'metric', lowerIsBetter: false, hint: 'Measure at the widest point',
        })),
      ]
    case 'get_stronger': {
      const lifts = (t.lifts || []).filter((l) => l.current || l.target)
      return (lifts.length ? lifts : [{ lift: 'Squat', current: '', target: '' }, { lift: 'Bench press', current: '', target: '' }, { lift: 'Deadlift', current: '', target: '' }]).map((l) => ({
        key: `lift:${l.lift}`, label: `${l.lift} best`, unit: l.lift === 'Pull-ups' ? 'reps' : 'kg', goal, source: 'metric' as const, lowerIsBetter: false,
        baseline: num(l.current), target: num(l.target), hint: 'Heaviest weight for a clean single, or max reps',
      }))
    }
    case 'endurance': {
      const what = [t.enduranceActivity, t.enduranceDistance].filter(Boolean).join(' ') || 'Benchmark'
      return [{ key: `time:${what}`, label: `${what} time`, unit: 'min', goal, source: 'metric', lowerIsBetter: true, baseline: num(t.currentTime), target: num(t.targetTime) }]
    }
    case 'event':
      return [{ key: 'readiness', label: `Readiness for ${t.eventName || 'event'}`, unit: '/10', goal, source: 'metric', lowerIsBetter: false, target: 10, hint: 'How ready do you feel? 1 = not at all, 10 = fully ready' }]
    case 'mobility':
      return (t.mobilityAreas?.length ? t.mobilityAreas : ['Overall']).map((area) => ({
        key: `mobility:${area}`, label: `${area} mobility`, unit: '/10', goal, source: 'metric' as const, lowerIsBetter: false, target: 10, hint: '1 = very stiff, 10 = moves freely',
      }))
    case 'rehab':
      return [
        { key: 'pain', label: 'Pain level', unit: '/10', goal, source: 'metric', lowerIsBetter: true, target: 0, hint: '0 = no pain, 10 = worst pain' },
        { key: 'function', label: 'Function', unit: '/10', goal, source: 'metric', lowerIsBetter: false, target: 10, hint: 'How normally can you use the injured area?' },
      ]
    case 'sport':
      return [{ key: 'performance', label: `${t.sportName || 'Sport'} performance`, unit: '/10', goal, source: 'metric', lowerIsBetter: false, target: 10, hint: t.sportFocus ? `Rate your ${t.sportFocus}` : undefined }]
    case 'health':
      return [
        { key: 'resting_hr', label: 'Resting heart rate', unit: 'bpm', goal, source: 'metric', lowerIsBetter: true },
        { key: 'bp_systolic', label: 'Blood pressure (systolic)', unit: 'mmHg', goal, source: 'metric', lowerIsBetter: true, target: 120 },
        { key: 'steps', label: 'Daily steps', unit: 'steps', goal, source: 'metric', lowerIsBetter: false, target: 10000 },
      ]
  }
}

export function metricsForGoal(details: Partial<IntakeDetails> | null, fallback?: { starting_weight?: number | null; target_weight?: number | null }): MetricDef[] {
  if (!details?.primaryGoal) {
    return [{ key: 'weight', label: 'Body weight', unit: 'kg', goal: 'health', source: 'weight', lowerIsBetter: (fallback?.target_weight ?? 0) < (fallback?.starting_weight ?? 0), baseline: fallback?.starting_weight ?? undefined, target: fallback?.target_weight ?? undefined }]
  }
  const seen = new Set<string>()
  return [details.primaryGoal, ...(details.secondaryGoals || [])]
    .flatMap((g, i) => defsFor(g as PrimaryGoal, details, i === 0))
    .filter((m) => (seen.has(m.key) ? false : (seen.add(m.key), true)))
}

export function progressPercent(def: MetricDef, latest?: number): number | null {
  if (latest === undefined || def.target === undefined) return null
  const start = def.baseline
  if (start === undefined || start === def.target) {
    const hit = def.lowerIsBetter ? latest <= def.target : latest >= def.target
    return hit ? 100 : null
  }
  const pct = ((latest - start) / (def.target - start)) * 100
  return Math.max(0, Math.min(100, Math.round(pct)))
}

export const goalGroupLabel = goalLabel
