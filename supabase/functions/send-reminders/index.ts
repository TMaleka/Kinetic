// Daily reminder job: emails clients about today's workout and, on check-in day,
// their weekly check-in. Also writes the matching in-app notifications.
// Triggered by pg_cron (see supabase/setup/reminders_cron.sql) with header x-cron-secret.
// POST ?dry=1 returns what would be sent without sending anything.
import { createClient } from 'npm:@supabase/supabase-js@2'

const TZ = Deno.env.get('REMINDER_TZ') || 'Africa/Johannesburg'
// 0 = Sunday … 6 = Saturday
const CHECKIN_DAY = Number(Deno.env.get('CHECKIN_REMINDER_DAY') ?? '5')

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

function localParts(now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  )
  const date = `${parts.year}-${parts.month}-${parts.day}`
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday as string)
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + (weekday === 0 ? -6 : 1 - weekday))
  return { date, weekday, weekStart: d.toISOString().slice(0, 10) }
}

function emailHtml(title: string, body: string, cta: string, url: string) {
  return `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;color:#0f2a3a">
  <p style="font-size:20px;font-weight:700;margin:0 0 16px">kinetic<span style="color:#f3263a">.</span></p>
  <h1 style="font-size:20px;margin:0 0 8px">${escapeHtml(title)}</h1>
  <p style="font-size:15px;line-height:1.5;color:#334155">${escapeHtml(body)}</p>
  ${url ? `<p style="margin:24px 0"><a href="${url}" style="background:#f3263a;color:#fff;padding:12px 20px;border-radius:12px;text-decoration:none;font-weight:600">${escapeHtml(cta)}</a></p>` : ''}
  <p style="font-size:12px;color:#94a3b8">You get these because your trainer coaches you on KineTic. Turn them off on your Profile page.</p>
</div>`
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  const secret = Deno.env.get('CRON_SECRET')
  if (!secret || req.headers.get('x-cron-secret') !== secret) return json({ error: 'Unauthorized' }, 401)

  const dry = new URL(req.url).searchParams.get('dry') === '1'
  const resendKey = Deno.env.get('RESEND_API_KEY')
  const fromEmail = Deno.env.get('INVITE_FROM_EMAIL') || 'KineTic <onboarding@resend.dev>'
  const appUrl = (Deno.env.get('APP_URL') || '').replace(/\/$/, '')
  if (!resendKey && !dry) return json({ error: 'RESEND_API_KEY missing' }, 500)

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { date, weekday, weekStart } = localParts()

  type Reminder = { userId: string; email: string; name: string; type: 'workout_reminder' | 'checkin_due'; title: string; body: string; cta: string; url: string; metadata: Record<string, string> }
  const reminders: Reminder[] = []

  const { data: sessions, error: sErr } = await db
    .from('workout_sessions')
    .select('id, title, client_id, client:profiles!client_id(email, full_name, email_reminders)')
    .eq('scheduled_date', date)
    .eq('status', 'scheduled')
  if (sErr) return json({ error: sErr.message }, 500)
  for (const s of sessions || []) {
    const c = s.client as { email?: string; full_name?: string; email_reminders?: boolean } | null
    if (!c?.email || c.email_reminders === false) continue
    reminders.push({
      userId: s.client_id, email: c.email, name: c.full_name || '', type: 'workout_reminder',
      title: `Today's workout: ${s.title}`,
      body: `Hi ${(c.full_name || '').split(' ')[0] || 'there'}, ${s.title} is on your plan for today. Log your sets in KineTic so your trainer can see how it went.`,
      cta: 'Open workout', url: appUrl ? `${appUrl}/app/workouts/${s.id}` : '',
      metadata: { session_id: s.id, reminder_date: date },
    })
  }

  if (weekday === CHECKIN_DAY) {
    const { data: links, error: lErr } = await db
      .from('trainer_client_links')
      .select('client_id, client:profiles!client_id(email, full_name, email_reminders)')
      .eq('status', 'active')
    if (lErr) return json({ error: lErr.message }, 500)
    const { data: done } = await db.from('weekly_checkins').select('client_id').eq('week_start', weekStart)
    const doneIds = new Set((done || []).map((d) => d.client_id))
    for (const l of links || []) {
      const c = l.client as { email?: string; full_name?: string; email_reminders?: boolean } | null
      if (doneIds.has(l.client_id) || !c?.email || c.email_reminders === false) continue
      reminders.push({
        userId: l.client_id, email: c.email, name: c.full_name || '', type: 'checkin_due',
        title: 'Your weekly check-in',
        body: `Hi ${(c.full_name || '').split(' ')[0] || 'there'}, how was your week? Your 30-second check-in helps your trainer plan next week.`,
        cta: 'Check in', url: appUrl ? `${appUrl}/app/checkin` : '',
        metadata: { week_start: weekStart },
      })
    }
  }

  // Skip anything already notified (re-runs, or the app created the in-app reminder first).
  const userIds = [...new Set(reminders.map((r) => r.userId))]
  const { data: existing } = userIds.length
    ? await db.from('notifications').select('user_id, type, metadata').in('user_id', userIds).in('type', ['workout_reminder', 'checkin_due']).gte('created_at', new Date(Date.now() - 8 * 864e5).toISOString())
    : { data: [] }
  const emailed = (r: Reminder) =>
    (existing || []).some((n: any) => n.user_id === r.userId && n.type === r.type && n.metadata?.emailed &&
      (r.type === 'workout_reminder' ? n.metadata?.session_id === r.metadata.session_id : n.metadata?.week_start === r.metadata.week_start))
  const pending = reminders.filter((r) => !emailed(r))

  if (dry) return json({ date, weekday, weekStart, wouldSend: pending.map((r) => ({ email: r.email, type: r.type, title: r.title })) })

  let sent = 0
  const failures: string[] = []
  for (const r of pending) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: fromEmail, to: [r.email], subject: r.title, html: emailHtml(r.title, r.body, r.cta, r.url) }),
    })
    if (!res.ok) {
      failures.push(`${r.email}: ${res.status}`)
      continue
    }
    sent++
    const metadata = { ...r.metadata, emailed: true }
    const { error: insertError } = await db.from('notifications').insert({ user_id: r.userId, type: r.type, title: r.title, message: r.body, metadata, read: false })
    if (insertError) {
      // The app already created the in-app reminder: mark it as emailed instead.
      const keyField = r.type === 'workout_reminder' ? 'session_id' : 'week_start'
      await db.from('notifications').update({ metadata }).eq('user_id', r.userId).eq('type', r.type).eq(`metadata->>${keyField}`, r.metadata[keyField])
    }
  }
  return json({ date, sent, failures })
})
