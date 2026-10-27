// Emails an invitation code to a client using Resend.
// Body: { invitationId: string }. Caller must be the trainer who owns the invitation.
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const resendKey = Deno.env.get('RESEND_API_KEY')
  const fromEmail = Deno.env.get('INVITE_FROM_EMAIL') || 'KineTic <onboarding@resend.dev>'
  const appUrl = (Deno.env.get('APP_URL') || '').replace(/\/$/, '')
  if (!resendKey) return json({ error: 'Email is not configured (RESEND_API_KEY missing)' }, 500)

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Not signed in' }, 401)

  // Use the caller's JWT so row-level security applies: trainers can only read their own invitations.
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  })

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return json({ error: 'Not signed in' }, 401)

  let invitationId: string | undefined
  try {
    ;({ invitationId } = await req.json())
  } catch {
    return json({ error: 'Invalid request body' }, 400)
  }
  if (!invitationId) return json({ error: 'invitationId is required' }, 400)

  const { data: invitation, error: invError } = await supabase
    .from('invitations')
    .select('id, email, invite_code, status, expires_at, trainer_id, trainer:profiles!trainer_id(full_name)')
    .eq('id', invitationId)
    .maybeSingle()
  if (invError) return json({ error: invError.message }, 500)
  if (!invitation || invitation.trainer_id !== user.id) return json({ error: 'Invitation not found' }, 404)
  if (invitation.status !== 'pending') return json({ error: `Invitation is ${invitation.status}` }, 400)

  const trainerName = (invitation.trainer as { full_name?: string } | null)?.full_name || 'Your trainer'
  const signUpUrl = appUrl ? `${appUrl}/auth` : ''
  const expires = new Date(invitation.expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;color:#25342d">
      <h2 style="margin-bottom:8px">${escapeHtml(trainerName)} invited you to KineTic</h2>
      <p>KineTic is where your trainer shares your workout plans and tracks your progress.</p>
      <ol style="line-height:1.6">
        <li>${signUpUrl ? `<a href="${signUpUrl}" style="color:#718b33">Create your account</a>` : 'Create your KineTic account'} as a <b>Client</b> using this email address (${escapeHtml(invitation.email)}).</li>
        <li>Open your <b>Profile</b> page and accept the invitation.</li>
      </ol>
      <p>Your invite code:</p>
      <p style="font-size:28px;font-weight:bold;letter-spacing:4px;background:#edf3d5;padding:12px 16px;border-radius:12px;display:inline-block">${escapeHtml(invitation.invite_code)}</p>
      <p style="color:#969f96;font-size:12px">This invitation expires on ${expires}.</p>
    </div>`

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: fromEmail,
      to: [invitation.email],
      subject: `${trainerName} invited you to KineTic`,
      html,
    }),
  })
  if (!res.ok) {
    const detail = await res.text()
    console.error('Resend error', res.status, detail)
    let message = 'Failed to send email'
    try {
      message = JSON.parse(detail).message || message
    } catch { /* keep default */ }
    return json({ error: message }, 502)
  }

  return json({ sent: true })
})
