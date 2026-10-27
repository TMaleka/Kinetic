import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, UserPlus, ChevronRight, Mail, Copy, Check } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { Spinner } from '../../components/ui'
import { createInvitation, fetchTrainerInvitations, cancelInvitation, effectiveStatus, todayISO, sendInvitationEmail } from '../../lib/queries'

type ClientRow = {
  id: string
  full_name: string
  avatar_url: string | null
  goals: string | null
  started_at: string
  last_session?: any
  total_sessions?: number
  completed_sessions?: number
  status: 'on_track' | 'at_risk' | 'inactive' | 'new'
}

export function TrainerClients() {
  const { profile } = useAuth()
  const [clients, setClients] = useState<ClientRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'on_track' | 'at_risk' | 'inactive' | 'new'>('all')
  const [showAdd, setShowAdd] = useState(false)
  const [clientEmail, setClientEmail] = useState('')
  const [clientGoals, setClientGoals] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')
  const [invitations, setInvitations] = useState<any[]>([])
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [sendingEmail, setSendingEmail] = useState<string | null>(null)
  const [inviteNotice, setInviteNotice] = useState('')
  const [useMockData] = useState(false) // Set to false for production

  useEffect(() => {
    if (profile) {
      loadClients()
      loadInvitations()
    }
  }, [profile])

  const loadInvitations = async () => {
    if (!profile) return
    try {
      const data = await fetchTrainerInvitations(profile.id)
      setInvitations(data || [])
    } catch (err) {
      console.error(err)
    }
  }

  const loadClients = async () => {
    if (!profile) return
    
    // Mock data for testing (disabled in production)
    /*
    if (useMockData) {
      setClients([
        {
          id: '1',
          full_name: 'Sarah Johnson',
          avatar_url: null,
          goals: 'Weight loss and muscle toning',
          started_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          total_sessions: 12,
          completed_sessions: 10,
          status: 'on_track'
        },
        {
          id: '2',
          full_name: 'Mike Chen',
          avatar_url: null,
          goals: 'Build muscle mass',
          started_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
          total_sessions: 15,
          completed_sessions: 12,
          status: 'at_risk'
        },
        {
          id: '3',
          full_name: 'Emma Wilson',
          avatar_url: null,
          goals: 'Increase strength and endurance',
          started_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          total_sessions: 3,
          completed_sessions: 3,
          status: 'new'
        },
        {
          id: '4',
          full_name: 'James Rodriguez',
          avatar_url: null,
          goals: 'General fitness and health',
          started_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
          total_sessions: 20,
          completed_sessions: 18,
          status: 'on_track'
        }
      ])
      setInvitations([
        {
          id: 'inv-1',
          email: 'newclient@example.com',
          code: 'FIT2024',
          status: 'pending',
          created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
        }
      ])
      setLoading(false)
      return
    }
    */
    
    try {
      const { data: links } = await supabase
        .from('trainer_client_links')
        .select(`
          id,
          goals,
          started_at,
          client:profiles!client_id(id, full_name, avatar_url, created_at)
        `)
        .eq('trainer_id', profile.id)
        .order('created_at', { ascending: false })

      if (!links) {
        setClients([])
        return
      }

      const clientIds = links.map((l: any) => l.client.id)

      // Fetch session stats per client
      const { data: sessions } = await supabase
        .from('workout_sessions')
        .select('client_id, status, scheduled_date')
        .in('client_id', clientIds.length ? clientIds : ['00000000-0000-0000-0000-000000000000'])
        .order('scheduled_date', { ascending: false })

      const sessionMap = new Map<string, { total: number; completed: number; last?: any; missed: number }>()
      ;(sessions || []).forEach((s: any) => {
        const existing = sessionMap.get(s.client_id) || { total: 0, completed: 0, missed: 0 }
        const status = effectiveStatus(s)
        const isDue = s.scheduled_date <= todayISO()
        if (isDue) existing.total++
        if (status === 'completed') existing.completed++
        if (status === 'missed') existing.missed++
        if (!existing.last && isDue) existing.last = s
        sessionMap.set(s.client_id, existing)
      })

      // Calculate status for each client
      const rows: ClientRow[] = links.map((l: any) => {
        const stats = sessionMap.get(l.client.id) || { total: 0, completed: 0, missed: 0 }
        const daysSinceStart = Math.floor((new Date().getTime() - new Date(l.started_at).getTime()) / (24 * 60 * 60 * 1000))
        
        let status: ClientRow['status'] = 'on_track'
        
        if (daysSinceStart < 7) {
          status = 'new'
        } else if (stats.missed >= 2) {
          status = 'at_risk'
        } else if (stats.last) {
          const daysSinceLast = Math.floor((new Date().getTime() - new Date(stats.last.scheduled_date).getTime()) / (24 * 60 * 60 * 1000))
          if (daysSinceLast > 7) {
            status = 'inactive'
          } else if (stats.total > 0 && stats.completed / stats.total < 0.7) {
            status = 'at_risk'
          }
        } else {
          status = 'inactive'
        }

        return {
          id: l.client.id,
          full_name: l.client.full_name,
          avatar_url: l.client.avatar_url,
          goals: l.goals,
          started_at: l.started_at,
          last_session: stats.last,
          total_sessions: stats.total,
          completed_sessions: stats.completed,
          status,
        }
      })

      setClients(rows)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSendInvitation = async () => {
    setAddError('')
    setAdding(true)
    try {
      if (!clientEmail || !clientEmail.includes('@')) {
        setAddError('Please enter a valid email address')
        setAdding(false)
        return
      }

      const result = await createInvitation(profile!.id, clientEmail)
      
      if (!result.success) {
        setAddError(result.message || 'Failed to send invitation')
        setAdding(false)
        return
      }

      const invitedEmail = clientEmail.trim()
      setShowAdd(false)
      setClientEmail('')
      setClientGoals('')
      setAddError('')
      loadInvitations()

      if (result.invitationId) {
        const emailResult = await sendInvitationEmail(result.invitationId)
        setInviteNotice(
          emailResult.success
            ? `Invitation emailed to ${invitedEmail}.`
            : `Invitation created, but the email could not be sent (${emailResult.message}). Copy the code below and share it yourself.`,
        )
      }
    } catch (err) {
      console.error('Invitation error:', err)
      setAddError(err instanceof Error ? err.message : 'Failed to send invitation')
    } finally {
      setAdding(false)
    }
  }

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
    } catch {
      window.prompt('Copy this invite code:', code)
      return
    }
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const handleResendEmail = async (invitation: { id: string; email: string }) => {
    setSendingEmail(invitation.id)
    const result = await sendInvitationEmail(invitation.id)
    setSendingEmail(null)
    setInviteNotice(
      result.success
        ? `Invitation emailed to ${invitation.email}.`
        : `Could not email ${invitation.email}: ${result.message}`,
    )
  }

  const handleCancelInvitation = async (invitationId: string) => {
    if (!confirm('Cancel this invitation?')) return
    try {
      await cancelInvitation(invitationId)
      loadInvitations()
    } catch (err: any) {
      console.error(err)
      alert(`Failed to cancel invitation: ${err?.message || 'Unknown error'}`)
    }
  }

  const filtered = clients.filter((c) => {
    const matchesSearch = c.full_name.toLowerCase().includes(search.toLowerCase())
    const matchesFilter = filter === 'all' || c.status === filter
    return matchesSearch && matchesFilter
  })

  const getStatusLabel = (status: ClientRow['status']) => {
    switch (status) {
      case 'on_track': return 'On Track'
      case 'at_risk': return 'At Risk'
      case 'inactive': return 'Inactive'
      case 'new': return 'New'
    }
  }

  const getAdherence = (client: ClientRow) => {
    if (!client.total_sessions || client.total_sessions === 0) return 0
    return Math.round(((client.completed_sessions || 0) / client.total_sessions) * 100)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size={40} />
      </div>
    )
  }

  const filters = [
    { id: 'all', label: 'All' },
    { id: 'on_track', label: 'On Track' },
    { id: 'at_risk', label: 'Needs Attention' },
    { id: 'inactive', label: 'Inactive' },
    { id: 'new', label: 'New' },
  ]

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[.14em] text-[#7c3aed]">Your people</p>
          <h1 className="font-display text-4xl font-semibold tracking-tight text-[#1c1446]">Clients</h1>
          <p className="mt-2 text-sm text-[#64748b]">{clients.length} people in your coaching practice.</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex w-fit items-center gap-2 rounded-xl bg-[#ff4f1f] px-4 py-3 text-xs font-semibold text-white">
          <Plus className="size-4" />Invite client
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#94a3b8]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clients..."
            className="input pl-10"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id as any)}
              className={`rounded-xl border px-4 py-2 text-xs font-semibold transition ${
                filter === f.id
                  ? 'border-[#ff4f1f] bg-[#ff4f1f] text-white'
                  : 'border-[#f3dccf] bg-white text-[#64748b] hover:bg-[#fff4ec]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      {inviteNotice && (
        <div className="flex items-start justify-between gap-4 rounded-xl bg-[#d9f99d] px-4 py-3 text-sm text-[#166534]">
          <span>{inviteNotice}</span>
          <button onClick={() => setInviteNotice('')} className="text-xs font-semibold">Dismiss</button>
        </div>
      )}

      {/* Pending Invitations */}
      {invitations.filter((i) => i.status === 'pending').length > 0 && (
        <section className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl font-semibold text-[#1c1446]">Pending invitations</h2>
              <p className="mt-1 text-xs text-[#64748b]">Clients waiting to join your practice</p>
            </div>
          </div>
          <div className="mt-6 space-y-3">
            {invitations
              .filter((i) => i.status === 'pending')
              .map((invitation) => (
                <div key={invitation.id} className="flex items-center gap-4 rounded-xl border border-[#f6e6dc] p-4">
                  <div className="grid size-10 place-items-center rounded-xl bg-[#fed7aa] text-[#ea580c]">
                    <Mail className="size-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[#1e293b]">{invitation.email}</p>
                    <p className="text-xs text-[#64748b]">Code: {invitation.invite_code}</p>
                  </div>
                  <button
                    onClick={() => handleCopyCode(invitation.invite_code)}
                    className="flex items-center gap-1 rounded-lg border border-[#f3dccf] px-3 py-2 text-xs text-[#475569] hover:bg-[#fff4ec]"
                  >
                    {copiedCode === invitation.invite_code ? <Check size={14} /> : <Copy size={14} />}
                    {copiedCode === invitation.invite_code ? 'Copied' : 'Copy'}
                  </button>
                  <button
                    onClick={() => handleResendEmail(invitation)}
                    disabled={sendingEmail === invitation.id}
                    className="flex items-center gap-1 rounded-lg border border-[#f3dccf] px-3 py-2 text-xs text-[#475569] hover:bg-[#fff4ec]"
                  >
                    <Mail size={14} />
                    {sendingEmail === invitation.id ? 'Sending...' : 'Email'}
                  </button>
                  <button
                    onClick={() => handleCancelInvitation(invitation.id)}
                    className="text-xs text-[#64748b] hover:text-[#334155]"
                  >
                    Cancel
                  </button>
                </div>
              ))}
          </div>
        </section>
      )}

      {/* Client list */}
      {filtered.length ? (
        <div className="overflow-hidden rounded-2xl border border-[#f3dccf] bg-white">
          <div className="hidden grid-cols-[1.5fr_1.2fr_.7fr_.8fr_32px] gap-4 border-b border-[#f1e4da] px-5 py-3 text-[10px] font-semibold uppercase tracking-[.12em] text-[#94a3b8] md:grid">
            <span>Client</span>
            <span>Goal</span>
            <span>Progress</span>
            <span>Status</span>
            <span />
          </div>
          {filtered.map((client) => (
            <Link
              key={client.id}
              to={`/trainer/clients/${client.id}`}
              className="grid w-full grid-cols-1 items-center gap-4 border-b border-[#f1e4da] px-5 py-4 last:border-0 hover:bg-[#fff4ec] transition md:grid-cols-[1.5fr_1.2fr_.7fr_.8fr_32px]"
            >
              <div className="flex items-center gap-3">
                <div className={`grid size-9 shrink-0 place-items-center rounded-full text-xs font-semibold ${
                  client.status === 'on_track' ? 'bg-[#d9f99d] text-[#15803d]' :
                  client.status === 'at_risk' ? 'bg-[#fed7aa] text-[#ea580c]' :
                  client.status === 'inactive' ? 'bg-[#f1f5f9] text-[#64748b]' :
                  'bg-[#ddd6fe] text-[#6d28d9]'
                }`}>
                  {client.full_name.split(' ').map((n) => n[0]).join('').toUpperCase()}
                </div>
                <span className="text-sm font-semibold text-[#1e293b]">{client.full_name}</span>
              </div>
              <span className="text-xs text-[#64748b]">{client.goals || 'No goal set'}</span>
              <span className="text-xs font-semibold text-[#1e293b]">{getAdherence(client)}%</span>
              <span className={`badge ${
                client.status === 'on_track' ? 'badge-lime' :
                client.status === 'at_risk' ? 'badge-peach' :
                client.status === 'inactive' ? 'bg-[#f1f5f9] text-[#64748b]' :
                'badge-lavender'
              }`}>
                {getStatusLabel(client.status)}
              </span>
              <ChevronRight className="size-4 text-[#94a3b8]" />
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center rounded-2xl border border-[#f3dccf] bg-white p-12">
          <p className="text-sm text-[#64748b]">
            {search || filter !== 'all' ? 'No clients match your search or filter' : 'No clients yet — invite your first client above'}
          </p>
        </div>
      )}

      {/* Add Client Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50">
          <div className="card p-6 max-w-sm w-full">
            <h2 className="font-display text-xl font-semibold text-[#1c1446] mb-6">Invite client</h2>
            <div className="space-y-4">
              <div>
                <label className="label">Client's email</label>
                <input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="sarah@email.com"
                  className="input"
                />
                <p className="text-xs text-[#64748b] mt-2">
                  We'll email them an invite code. Once they sign up with this email, the invitation appears on their Profile page to accept.
                </p>
              </div>
              {addError && (
                <p className="text-xs text-[#dc2626]">{addError}</p>
              )}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowAdd(false)
                    setClientEmail('')
                    setClientGoals('')
                    setAddError('')
                  }}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendInvitation}
                  disabled={adding || !clientEmail.trim()}
                  className="btn-primary flex-1"
                >
                  {adding ? 'Sending...' : 'Send invite'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
