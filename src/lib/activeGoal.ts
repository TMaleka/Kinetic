import { supabase } from './supabase'

// Latest confirmed/adjusted goal, else the latest pending one (skips rejected).
export async function fetchGoalHistory(clientId: string) {
  const { data, error } = await supabase
    .from('client_goals')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
  if (error) throw error
  const rows = data || []
  const active = rows.find((g) => g.status === 'confirmed' || g.status === 'adjusted') || rows.find((g) => g.status === 'pending') || null
  return { rows, active }
}
