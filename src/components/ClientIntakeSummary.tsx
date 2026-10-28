import type { ReactNode } from 'react'
import { goalLabel, type IntakeDetails } from '../lib/intake'

function Row({ label, value }: { label: string; value: ReactNode }) {
  if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) return null
  return (
    <div className="flex gap-3 py-1.5 text-sm">
      <span className="w-40 shrink-0 text-xs text-[#64748b]">{label}</span>
      <span className="flex-1 font-medium text-[#0f2a3a]">{Array.isArray(value) ? value.join(', ') : value}</span>
    </div>
  )
}

function Section({ title, children, tone = 'blue' }: { title: string; children: ReactNode; tone?: 'blue' | 'red' | 'green' }) {
  const color = tone === 'red' ? 'text-[#f3263a]' : tone === 'green' ? 'text-[#075a38]' : 'text-[#1787c4]'
  return (
    <div className="rounded-xl border border-[#e3eff6] p-4">
      <p className={`mb-2 text-[10px] font-semibold uppercase tracking-[.14em] ${color}`}>{title}</p>
      {children}
    </div>
  )
}

const yn = (v: string) => (v === 'yes' ? 'Yes' : v === 'no' ? 'No' : '')

export function ClientIntakeSummary({ details }: { details: Partial<IntakeDetails> }) {
  const d = details
  const lifts = (d.lifts || []).filter((l) => l.current || l.target).map((l) => `${l.lift}: ${l.current || '?'} → ${l.target || '?'} kg`)
  const healthFlags = d.doctorRestriction === 'yes' || d.painDuringExercise === 'yes'
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Section title="Goal & targets" tone="green">
        <Row label="Main goal" value={d.primaryGoal ? goalLabel(d.primaryGoal) : ''} />
        <Row label="Also wants" value={(d.secondaryGoals || []).map(goalLabel)} />
        <Row label="Target weight" value={d.targetWeight && `${d.targetWeight} kg`} />
        <Row label="Target body fat" value={d.targetBodyFat && `${d.targetBodyFat}%`} />
        <Row label="Waist" value={(d.currentWaist || d.targetWaist) && `${d.currentWaist || '?'} → ${d.targetWaist || '?'} cm`} />
        <Row label="Muscle focus" value={d.muscleAreas} />
        <Row label="Strength targets" value={lifts} />
        <Row label="Endurance" value={[d.enduranceActivity, d.enduranceDistance].filter(Boolean).join(' · ')} />
        <Row label="Current → target time" value={(d.currentTime || d.targetTime) && `${d.currentTime || '?'} → ${d.targetTime || '?'}`} />
        <Row label="Event" value={[d.eventName, d.eventDate && new Date(d.eventDate).toLocaleDateString()].filter(Boolean).join(' · ')} />
        <Row label="Sport" value={[d.sportName, d.sportFocus].filter(Boolean).join(' · ')} />
        <Row label="Mobility focus" value={d.mobilityAreas} />
        <Row label="Injury to recover from" value={d.rehabInjury} />
        <Row label="Cleared by doctor/physio" value={yn(d.rehabCleared || '')} />
        <Row label="Health target" value={d.healthTarget} />
        <Row label="Deadline" value={d.targetDate && new Date(d.targetDate).toLocaleDateString()} />
        <Row label="Success looks like" value={d.successMeasure} />
        <Row label="Why it matters" value={d.motivation} />
        <Row label="Tried before" value={d.pastAttempts} />
      </Section>
      <Section title="Baseline">
        <Row label="Age / sex" value={[d.age && `${d.age} yrs`, d.sex].filter(Boolean).join(' · ')} />
        <Row label="Height / weight" value={[d.heightCm && `${d.heightCm} cm`, d.weightKg && `${d.weightKg} kg`].filter(Boolean).join(' · ')} />
        <Row label="Body fat" value={d.bodyFat && `${d.bodyFat}%`} />
        <Row label="Experience" value={d.experience} />
        <Row label="Activity level" value={d.activityLevel} />
        <Row label="Current training" value={d.currentTraining} />
        <Row label="Sleep" value={d.sleepHours && `${d.sleepHours} h/night`} />
        <Row label="Stress (1–5)" value={d.stressLevel} />
      </Section>
      <Section title={healthFlags ? 'Health — check before training' : 'Health & limitations'} tone={healthFlags ? 'red' : 'blue'}>
        <Row label="Injury areas" value={d.injuryAreas} />
        <Row label="Injury details" value={d.injuryDetails} />
        <Row label="Medical conditions" value={d.medicalConditions} />
        <Row label="Told to limit exercise" value={yn(d.doctorRestriction || '')} />
        <Row label="Pain during exercise" value={yn(d.painDuringExercise || '')} />
        {!d.injuryAreas?.length && !d.injuryDetails && !d.medicalConditions && !healthFlags && (
          <p className="text-sm text-[#64748b]">No injuries or conditions reported.</p>
        )}
      </Section>
      <Section title="Schedule & preferences">
        <Row label="Days per week" value={d.daysPerWeek} />
        <Row label="Session length" value={d.sessionMinutes && `${d.sessionMinutes} min`} />
        <Row label="Preferred days" value={d.preferredDays} />
        <Row label="Trains at" value={d.location} />
        <Row label="Equipment" value={d.equipment} />
        <Row label="Enjoys" value={d.enjoys} />
        <Row label="Dislikes" value={d.dislikes} />
        <Row label="Wants nutrition help" value={yn(d.nutritionHelp || '')} />
      </Section>
    </div>
  )
}
