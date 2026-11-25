import { supabase } from './supabase'
import { addDays, parseLocalDate, toLocalISO, todayISO } from './queries'
import { createNotification } from './notifications'

const APP_URL = typeof window !== 'undefined' ? window.location.origin : 'https://kinetic-flax-nine.vercel.app'

/** Converts a phone number to WhatsApp's international digits format (SA numbers default to +27). */
export function whatsappNumber(phone: string | null | undefined): string | null {
  if (!phone) return null
  let digits = phone.replace(/[^\d+]/g, '')
  if (digits.startsWith('+')) digits = digits.slice(1)
  else if (digits.startsWith('00')) digits = digits.slice(2)
  else if (digits.startsWith('0')) digits = '27' + digits.slice(1)
  return digits.length >= 10 && digits.length <= 15 ? digits : null
}

/** wa.me link; without a valid number WhatsApp asks the trainer to pick the contact. */
export function whatsappLink(phone: string | null | undefined, text: string): string {
  const number = whatsappNumber(phone)
  return `https://wa.me/${number ?? ''}?text=${encodeURIComponent(text)}`
}

export type NudgeReason = 'missed_workout' | 'no_activity' | 'checkin_due' | 'checkin_flag' | 'general'

export function nudgeMessage(reason: NudgeReason, clientName: string, trainerName: string): string {
  const first = clientName.split(' ')[0] || 'there'
  const sign = trainerName ? `\n\n– ${trainerName.split(' ')[0]}` : ''
  switch (reason) {
    case 'missed_workout':
      return `Hi ${first}! I noticed you missed a session or two this week. No stress, it happens. Can you fit one in today or tomorrow? Your workouts are waiting in KineTic: ${APP_URL}/app/workouts${sign}`
    case 'no_activity':
      return `Hi ${first}, checking in! I haven't seen any training from you in a few days. How are you doing? Anything I can adjust in your plan to make it easier?${sign}`
    case 'checkin_due':
      return `Hi ${first}! Quick reminder to do your weekly check-in on KineTic. It takes 30 seconds and helps me plan your next week: ${APP_URL}/app/checkin${sign}`
    case 'checkin_flag':
      return `Hi ${first}, thanks for your check-in. I saw it's been a tough week. Want to chat about it? We can adjust your training so it fits better.${sign}`
    default:
      return `Hi ${first}! How's training going this week?${sign}`
  }
}

function icsEscape(text: string) {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
}

function icsDateTime(date: Date) {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}T${p(date.getHours())}${p(date.getMinutes())}00`
}

/** Builds an .ics calendar with one timed event per session and an alert `alertMinutes` before. */
export function buildSessionsCalendar(
  sessions: { id: string; title: string; scheduled_date: string }[],
  time: string,
  durationMinutes = 60,
  alertMinutes = 60,
): string {
  const [hh, mm] = time.split(':').map(Number)
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const events = sessions.map((s) => {
    const start = parseLocalDate(s.scheduled_date)
    start.setHours(hh, mm, 0, 0)
    const end = new Date(start.getTime() + durationMinutes * 60000)
    return [
      'BEGIN:VEVENT',
      `UID:${s.id}@kinetic`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${icsDateTime(start)}`,
      `DTEND:${icsDateTime(end)}`,
      `SUMMARY:${icsEscape(`KineTic: ${s.title}`)}`,
      `DESCRIPTION:${icsEscape(`Open your workout: ${APP_URL}/app/workouts/${s.id}`)}`,
      `URL:${APP_URL}/app/workouts/${s.id}`,
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${icsEscape(`${s.title} starts soon`)}`,
      `TRIGGER:-PT${alertMinutes}M`,
      'END:VALARM',
      'END:VEVENT',
    ].join('\r\n')
  })
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//KineTic//Workouts//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:KineTic workouts', ...events, 'END:VCALENDAR'].join('\r\n')
}

export function downloadCalendar(ics: string, filename = 'kinetic-workouts.ics') {
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * Creates today's in-app reminders for a client: today's workout, yesterday's missed
 * session, and the weekly check-in from Friday onwards. Safe to call on every app load:
 * existing reminders are detected via metadata (and a unique index), so a plan assigned
 * later the same day still gets its reminder.
 */
const inFlight = new Map<string, Promise<void>>()

export function ensureClientReminders(clientId: string, checkinWeekStart: string | null, hasCheckin: boolean | null) {
  const running = inFlight.get(clientId)
  if (running) return running
  const job = createClientReminders(clientId, checkinWeekStart, hasCheckin).finally(() => inFlight.delete(clientId))
  inFlight.set(clientId, job)
  return job
}

async function createClientReminders(clientId: string, checkinWeekStart: string | null, hasCheckin: boolean | null) {
  const today = todayISO()
  const yesterday = toLocalISO(addDays(new Date(), -1))

  const { data: existing } = await supabase
    .from('notifications')
    .select('type, metadata')
    .eq('user_id', clientId)
    .gte('created_at', addDays(new Date(), -8).toISOString())
  const has = (type: string, field: string, value: string) =>
    (existing || []).some((n: any) => n.type === type && n.metadata?.[field] === value)

  const { data: sessions } = await supabase
    .from('workout_sessions')
    .select('id, title, scheduled_date, status')
    .eq('client_id', clientId)
    .in('scheduled_date', [today, yesterday])

  for (const s of sessions || []) {
    if (s.scheduled_date === today && s.status !== 'completed' && !has('workout_reminder', 'session_id', s.id)) {
      await createNotification(clientId, 'workout_reminder', "Today's workout", `${s.title} is on for today. Tap Workouts to start.`, { session_id: s.id, reminder_date: today })
    }
    if (s.scheduled_date === yesterday && (s.status === 'scheduled' || s.status === 'in_progress') && !has('workout_missed', 'session_id', s.id)) {
      await createNotification(clientId, 'workout_missed', 'Missed yesterday', `You missed ${s.title}. You can still do it today. It's in Workouts.`, { session_id: s.id })
    }
  }

  const day = new Date().getDay()
  if (checkinWeekStart && hasCheckin === false && (day === 5 || day === 6 || day === 0) && !has('checkin_due', 'week_start', checkinWeekStart)) {
    await createNotification(clientId, 'checkin_due', 'Weekly check-in', 'How was your week? Your 30-second check-in helps your trainer plan next week.', { week_start: checkinWeekStart })
  }
}
