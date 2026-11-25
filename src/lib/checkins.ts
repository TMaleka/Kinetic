import { supabase } from './supabase'
import { addDays, toLocalISO } from './queries'

export type WeeklyCheckin = {
  id: string
  client_id: string
  trainer_id: string | null
  week_start: string
  energy: number
  sleep: number
  stress: number
  soreness: number
  training: number
  wins: string | null
  struggles: string | null
  body_weight: number | null
  trainer_reply: string | null
  replied_at: string | null
  created_at: string
}

export type CheckinScores = Pick<WeeklyCheckin, 'energy' | 'sleep' | 'stress' | 'soreness' | 'training'>

/** Questions in display order. `highIsBad` marks scales where 5 is the worst answer. */
export const CHECKIN_QUESTIONS: { key: keyof CheckinScores; label: string; low: string; high: string; highIsBad?: boolean }[] = [
  { key: 'training', label: 'How did training go?', low: 'Rough', high: 'Great' },
  { key: 'energy', label: 'Energy', low: 'Drained', high: 'Full of energy' },
  { key: 'sleep', label: 'Sleep', low: 'Poor', high: 'Great' },
  { key: 'stress', label: 'Stress', low: 'Calm', high: 'Very stressed', highIsBad: true },
  { key: 'soreness', label: 'Soreness', low: 'None', high: 'Very sore', highIsBad: true },
]

/** Monday of the week containing `date`, as YYYY-MM-DD. */
export function weekStartISO(date = new Date()): string {
  const day = date.getDay()
  return toLocalISO(addDays(date, day === 0 ? -6 : 1 - day))
}

/** Short labels for scores that need the trainer's attention. */
export function checkinFlags(c: CheckinScores): string[] {
  const flags: string[] = []
  if (c.training <= 2) flags.push('Tough training week')
  if (c.energy <= 2) flags.push('Low energy')
  if (c.sleep <= 2) flags.push('Poor sleep')
  if (c.stress >= 4) flags.push('High stress')
  if (c.soreness >= 4) flags.push('Very sore')
  return flags
}

export function scoreTone(value: number, highIsBad = false): 'good' | 'ok' | 'bad' {
  const v = highIsBad ? 6 - value : value
  return v >= 4 ? 'good' : v === 3 ? 'ok' : 'bad'
}

function isMissingTable(error: { code?: string; message?: string } | null) {
  return !!error && (error.code === '42P01' || error.code === 'PGRST205' || /weekly_checkins/.test(error.message || ''))
}

/** Returns null when the weekly_checkins migration hasn't been applied yet. */
export async function fetchCheckins(clientIds: string[], limit = 12): Promise<WeeklyCheckin[] | null> {
  if (!clientIds.length) return []
  const { data, error } = await supabase
    .from('weekly_checkins')
    .select('*')
    .in('client_id', clientIds)
    .order('week_start', { ascending: false })
    .limit(limit)
  if (isMissingTable(error)) return null
  if (error) throw error
  return (data || []) as WeeklyCheckin[]
}

export async function saveCheckin(
  input: CheckinScores & { client_id: string; trainer_id: string | null; week_start: string; wins: string; struggles: string; body_weight: number | null },
): Promise<WeeklyCheckin> {
  const { data, error } = await supabase
    .from('weekly_checkins')
    .upsert({ ...input, wins: input.wins.trim() || null, struggles: input.struggles.trim() || null }, { onConflict: 'client_id,week_start' })
    .select()
    .single()
  if (error) throw error
  return data as WeeklyCheckin
}

export async function replyToCheckin(checkinId: string, reply: string) {
  const { error } = await supabase.rpc('reply_to_checkin', { p_checkin_id: checkinId, p_reply: reply })
  if (error) throw error
}

export function formatWeek(weekStart: string): string {
  const [y, m, d] = weekStart.split('-').map(Number)
  return `Week of ${new Date(y, m - 1, d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}`
}
