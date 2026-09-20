import { supabase } from './supabase'

export type Notification = {
  id: string
  user_id: string
  type: 'workout_reminder' | 'workout_completed' | 'workout_missed' | 'measurement_logged' | 'photo_uploaded' | 'client_linked' | 'plan_assigned'
  title: string
  message: string
  metadata: Record<string, unknown> | null
  read: boolean
  created_at: string
}

export async function fetchNotifications(userId: string, limit = 20) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data as Notification[]
}

export async function markNotificationRead(notificationId: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId)
  if (error) throw error
}

export async function markAllNotificationsRead(userId: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
  if (error) throw error
}

export async function createNotification(
  userId: string,
  type: Notification['type'],
  title: string,
  message: string,
  metadata?: Record<string, unknown>
) {
  const { error } = await supabase.from('notifications').insert({
    user_id: userId,
    type,
    title,
    message,
    metadata: metadata || null,
    read: false,
  })
  if (error) console.error('Failed to create notification:', error)
}

export async function subscribeToNotifications(
  userId: string,
  callback: (notification: Notification) => void
) {
  return supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        callback(payload.new as Notification)
      }
    )
    .subscribe()
}
