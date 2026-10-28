import { supabase } from './supabase'
import { intakeFromGoalRow } from './intake'

const goalIdentity = (row: any) => {
  const d = intakeFromGoalRow(row)
  return d?.primaryGoal ? [d.primaryGoal, d.eventName || '', d.sportName || '', d.enduranceActivity || ''].join('|') : 'legacy'
}

// Active goal = newest non-rejected row. `since` = when the client started working on this
// goal (oldest consecutive non-rejected row with the same goal), so readings logged for an
// earlier, different goal aren't counted towards this one.
export async function fetchGoalHistory(clientId: string) {
  const { data, error } = await supabase
    .from('client_goals')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
  if (error) throw error
  const rows = data || []
  const live = rows.filter((g) => g.status !== 'rejected')
  const active = live[0] || null
  let since: string | null = null
  if (active) {
    const id = goalIdentity(active)
    for (const g of live) {
      if (goalIdentity(g) !== id) break
      since = (g.created_at as string).slice(0, 10)
    }
  }
  return { rows, active, since }
}
