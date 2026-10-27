import { supabase, type Profile } from './supabase'

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()
  if (error) {
    console.error('Error fetching profile:', error)
    return null
  }
  return data as Profile | null
}

export async function updateProfile(
  userId: string,
  updates: Partial<Pick<Profile, 'full_name' | 'avatar_url' | 'phone' | 'bio' | 'location' | 'specialization'>>,
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .maybeSingle()
  if (error) throw error
  return data as Profile | null
}

export async function fetchTrainerClients(trainerId: string) {
  const { data, error } = await supabase
    .from('trainer_client_links')
    .select(`
      *,
      client:profiles!client_id(id, full_name, avatar_url, phone, bio, created_at)
    `)
    .eq('trainer_id', trainerId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function fetchClientTrainer(clientId: string) {
  const { data, error } = await supabase
    .from('trainer_client_links')
    .select(`
      *,
      trainer:profiles!trainer_id(id, full_name, avatar_url, phone, bio, specialization, location)
    `)
    .eq('client_id', clientId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
  if (error) throw error
  return data?.[0] ?? null
}

export async function createClientLink(
  trainerId: string,
  clientId: string,
  goals?: string,
) {
  const { data, error } = await supabase
    .from('trainer_client_links')
    .insert({
      trainer_id: trainerId,
      client_id: clientId,
      goals: goals || null,
    })
    .select()
    .maybeSingle()
  if (error) throw error
  return data
}

export async function fetchClientMeasurements(clientId: string) {
  const { data, error } = await supabase
    .from('measurements')
    .select('*')
    .eq('client_id', clientId)
    .order('logged_at', { ascending: true })
        .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function fetchClientPhotos(clientId: string) {
  const { data, error } = await supabase
    .from('progress_photos')
    .select('*')
    .eq('client_id', clientId)
    .order('taken_at', { ascending: false })
  if (error) throw error
  return data
}

export async function fetchClientSessions(clientId: string) {
  const { data, error } = await supabase
    .from('workout_sessions')
    .select('*')
    .eq('client_id', clientId)
    .order('scheduled_date', { ascending: false })
  if (error) throw error
  return data
}

export async function fetchClientAchievements(clientId: string) {
  const { data, error } = await supabase
    .from('achievements')
    .select('*')
    .eq('client_id', clientId)
    .order('earned_at', { ascending: false })
  if (error) throw error
  return data
}

export async function fetchClientActivity(clientId: string, limit = 20) {
  const { data, error } = await supabase
    .from('activity_timeline')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data
}

export async function addActivityEvent(
  clientId: string,
  trainerId: string | null,
  eventType: string,
  title: string,
  description?: string,
  metadata?: Record<string, unknown>,
) {
  const { error } = await supabase.from('activity_timeline').insert({
    client_id: clientId,
    trainer_id: trainerId,
    event_type: eventType,
    title,
    description: description || null,
    metadata: metadata || null,
  })
  if (error) console.error('Failed to log activity:', error)
}

export async function fetchClientPlans(clientId: string) {
  const { data, error } = await supabase
    .from('workout_plans')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function fetchPlanDays(planId: string) {
  const { data, error } = await supabase
    .from('plan_days')
    .select('*')
    .eq('plan_id', planId)
    .order('day_order', { ascending: true })
  if (error) throw error
  return data
}

export async function fetchPlanExercises(planDayId: string) {
  const { data, error } = await supabase
    .from('plan_exercises')
    .select('*')
    .eq('plan_day_id', planDayId)
    .order('exercise_order', { ascending: true })
  if (error) throw error
  return data
}

export async function fetchSessionLogs(sessionId: string) {
  const { data, error } = await supabase
    .from('session_logs')
    .select('*')
    .eq('session_id', sessionId)
    .order('set_number', { ascending: true })
  if (error) throw error
  return data
}

export function formatDate(dateStr: string): string {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? parseLocalDate(dateStr) : new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatRelative(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return formatDate(dateStr)
}

export function getInitials(name: string): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

export function todayISO(): string {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function toLocalISO(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

export async function scheduleSessionsFromPlan(
  planId: string,
  clientId: string,
  trainerId: string,
  startDate?: string,
) {
  try {
    // Fetch plan days
    const { data: planDays, error: daysError } = await supabase
      .from('plan_days')
      .select('*')
      .eq('plan_id', planId)
      .order('day_order', { ascending: true })

    if (daysError) throw daysError
    if (!planDays || planDays.length === 0) return { success: false, message: 'No days in plan' }

    // Parse YYYY-MM-DD as a local date (new Date('YYYY-MM-DD') is UTC and can shift the day)
    const start = startDate ? parseLocalDate(startDate) : new Date()
    const sessionsToCreate = []

    // Day N of the plan (sorted by day_order) is scheduled N-1 days after the start date
    for (const [index, day] of planDays.entries()) {
      const sessionDate = addDays(start, index)
      const dateStr = toLocalISO(sessionDate)

      // Check if session already exists for this day
      const { data: existingSession } = await supabase
        .from('workout_sessions')
        .select('id')
        .eq('client_id', clientId)
        .eq('plan_day_id', day.id)
        .eq('scheduled_date', dateStr)
        .maybeSingle()

      if (!existingSession) {
        sessionsToCreate.push({
          plan_day_id: day.id,
          client_id: clientId,
          trainer_id: trainerId,
          title: day.title,
          scheduled_date: dateStr,
          status: 'scheduled',
        })
      }
    }

    // Insert all sessions
    if (sessionsToCreate.length > 0) {
      const { error: insertError } = await supabase
        .from('workout_sessions')
        .insert(sessionsToCreate)

      if (insertError) throw insertError

      // Log activity
      await addActivityEvent(
        clientId,
        trainerId,
        'plan_scheduled',
        `Workout plan scheduled`,
        `${sessionsToCreate.length} sessions scheduled from plan`,
      )

      return { success: true, count: sessionsToCreate.length }
    }

    return { success: true, count: 0, message: 'All sessions already scheduled' }
  } catch (error) {
    console.error('Error scheduling sessions:', error)
    const message = (error as { message?: string })?.message || 'Failed to schedule sessions'
    return { success: false, message }
  }
}

export async function createInvitation(trainerId: string, email: string) {
  try {
    // Try RPC function first
    const { data, error } = await supabase.rpc('create_invitation', {
      p_trainer_id: trainerId,
      p_email: email.toLowerCase(),
    })
    
    if (error) {
      console.error('Supabase RPC error:', error)
      
      // Fallback: direct insert if RPC fails
      const inviteCode = generateInviteCode()
      const { data: insertData, error: insertError } = await supabase
        .from('invitations')
        .insert({
          trainer_id: trainerId,
          email: email.toLowerCase(),
          invite_code: inviteCode,
          status: 'pending',
        })
        .select()
        .maybeSingle()
      
      if (insertError) {
        console.error('Fallback insert error:', insertError)
        return { success: false, message: insertError.message || 'Failed to create invitation' }
      }
      
      return { success: true, invitationId: insertData?.id }
    }
    
    return { success: true, invitationId: data }
  } catch (error) {
    console.error('Error creating invitation:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to create invitation'
    return { success: false, message: errorMessage }
  }
}

function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export async function fetchTrainerInvitations(trainerId: string) {
  const { data, error } = await supabase
    .from('invitations')
    .select('*')
    .eq('trainer_id', trainerId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function fetchClientInvitations(email: string) {
  const { data, error } = await supabase
    .from('invitations')
    .select('*, trainer:profiles!trainer_id(id, full_name, avatar_url)')
    .eq('email', email.toLowerCase())
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function acceptInvitation(invitationId: string, clientId: string) {
  try {
    const { data, error } = await supabase.rpc('accept_invitation', {
      p_invitation_id: invitationId,
      p_client_id: clientId,
    })
    if (error) throw error
    return { success: true, accepted: data }
  } catch (error) {
    console.error('Error accepting invitation:', error)
    return { success: false, message: 'Failed to accept invitation' }
  }
}

export async function cancelInvitation(invitationId: string) {
  const { error } = await supabase
    .from('invitations')
    .update({ status: 'cancelled' })
    .eq('id', invitationId)
  if (error) throw error
  return { success: true }
}

export type SessionStatus = 'scheduled' | 'in_progress' | 'completed' | 'missed'

// Sessions are never marked "missed" in the database, so treat past, unfinished ones as missed.
export function effectiveStatus(session: { status: string; scheduled_date: string }): SessionStatus {
  if ((session.status === 'scheduled' || session.status === 'in_progress') && session.scheduled_date < todayISO()) {
    return 'missed'
  }
  return session.status as SessionStatus
}

export function adherencePercent(sessions: { status: string; scheduled_date: string }[]): number {
  const due = sessions.filter((s) => s.scheduled_date <= todayISO())
  if (due.length === 0) return 0
  const done = due.filter((s) => s.status === 'completed').length
  return Math.round((done / due.length) * 100)
}

// Consecutive days (ending today or yesterday) with at least one completed session.
export function computeStreak(sessions: { status: string; scheduled_date: string }[]): number {
  const dates = new Set(sessions.filter((s) => s.status === 'completed').map((s) => s.scheduled_date))
  let cursor = new Date()
  if (!dates.has(toLocalISO(cursor))) cursor = addDays(cursor, -1)
  let streak = 0
  while (dates.has(toLocalISO(cursor))) {
    streak++
    cursor = addDays(cursor, -1)
  }
  return streak
}

const PHOTO_BUCKET = 'progress-photos'
const STORAGE_PREFIX = 'storage:'

export async function uploadProgressPhoto(clientId: string, file: File): Promise<string> {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
  const path = `${clientId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, file, {
    contentType: file.type || undefined,
    upsert: false,
  })
  if (error) throw error
  return `${STORAGE_PREFIX}${path}`
}

export async function deleteProgressPhotoFile(photoUrl: string) {
  if (!photoUrl.startsWith(STORAGE_PREFIX)) return
  const { error } = await supabase.storage.from(PHOTO_BUCKET).remove([photoUrl.slice(STORAGE_PREFIX.length)])
  if (error) console.error('Failed to delete photo file:', error)
}

// Replaces "storage:" paths with short-lived signed URLs; external URLs are kept as-is.
export async function withSignedPhotoUrls<T extends { photo_url: string }>(photos: T[]): Promise<(T & { display_url: string })[]> {
  const paths = photos.filter((p) => p.photo_url.startsWith(STORAGE_PREFIX)).map((p) => p.photo_url.slice(STORAGE_PREFIX.length))
  const signed = new Map<string, string>()
  if (paths.length) {
    const { data, error } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrls(paths, 60 * 60)
    if (error) console.error('Failed to sign photo URLs:', error)
    ;(data || []).forEach((d) => d.path && d.signedUrl && signed.set(d.path, d.signedUrl))
  }
  return photos.map((p) => ({
    ...p,
    display_url: p.photo_url.startsWith(STORAGE_PREFIX) ? signed.get(p.photo_url.slice(STORAGE_PREFIX.length)) || '' : p.photo_url,
  }))
}

export async function sendInvitationEmail(invitationId: string): Promise<{ success: boolean; message?: string }> {
  const { data, error } = await supabase.functions.invoke('send-invite', { body: { invitationId } })
  if (error) {
    let message = error.message
    try {
      const body = await (error as { context?: Response }).context?.json()
      if (body?.error) message = body.error
    } catch { /* keep default */ }
    return { success: false, message }
  }
  return data?.sent ? { success: true } : { success: false, message: data?.error || 'Failed to send email' }
}
