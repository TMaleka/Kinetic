import { useState, useEffect } from 'react'
import { LogOut, UserPlus, X, Check, User, Mail, Calendar } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Spinner } from '../../components/ui'
import { formatDate, updateProfile, fetchClientInvitations, acceptInvitation, fetchClientTrainer } from '../../lib/queries'

export function ClientProfile() {
  const { profile, signOut, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [phone, setPhone] = useState(profile?.phone || '')
  const [saving, setSaving] = useState(false)
  const [invitations, setInvitations] = useState<any[]>([])
  const [accepting, setAccepting] = useState<string | null>(null)
  const [trainer, setTrainer] = useState<any>(null)
  const [useMockData] = useState(false) // Set to false for production

  useEffect(() => {
    if (profile?.email) {
      loadInvitations()
    }
  }, [profile])

  const loadInvitations = async () => {
    if (!profile?.email) return
    
    // Mock data for testing (disabled in production)
    /*
    if (useMockData) {
      setTrainer({
        id: 'trainer-1',
        full_name: 'Alex Thompson',
        email: 'alex@trainer.com',
        avatar_url: null,
        phone: '+1 555-0100',
        bio: 'Certified personal trainer with 10+ years of experience in strength training and nutrition.',
        specialization: 'Strength & Conditioning',
        location: 'San Francisco, CA'
      })
      setInvitations([])
      return
    }
    */
    
    try {
      const data = await fetchClientInvitations(profile.email)
      setInvitations(data || [])
    } catch (err) {
      console.error(err)
    }
    try {
      const link = await fetchClientTrainer(profile.id)
      setTrainer(link?.trainer || null)
    } catch (err) {
      console.error(err)
    }
  }

  const handleAcceptInvitation = async (invitationId: string) => {
    if (!profile) return
    setAccepting(invitationId)
    try {
      const result = await acceptInvitation(invitationId, profile.id)
      if (!result.success || result.accepted === false) {
        alert('This invitation could not be accepted. It may have expired or been sent to a different email address.')
      }
      loadInvitations()
    } catch (err) {
      console.error(err)
      alert('Failed to accept invitation. Please try again.')
    } finally {
      setAccepting(null)
    }
  }

  const handleSave = async () => {
    if (!profile) return
    setSaving(true)
    try {
      await updateProfile(profile.id, {
        full_name: fullName,
        phone: phone || undefined,
      })
      await refreshProfile()
      setEditing(false)
    } catch (err: any) {
      console.error(err)
      alert(`Failed to save profile: ${err?.message || 'Unknown error'}`)
    } finally {
      setSaving(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  if (!profile) return null

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[.14em] text-[#93a84e]">Your account</p>
          <h1 className="font-display text-4xl font-semibold tracking-tight text-[#25342d]">Profile</h1>
          <p className="mt-2 text-sm text-[#7c857c]">Manage your personal information.</p>
        </div>
      </div>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <section className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl font-semibold text-[#25342d]">Pending invitations</h2>
              <p className="mt-1 text-xs text-[#929990]">Trainers waiting to connect</p>
            </div>
          </div>
          <div className="mt-6 space-y-3">
            {invitations.map((invitation) => (
              <div key={invitation.id} className="flex items-center gap-4 rounded-xl border border-[#edf0e8] p-4">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#edf3d5] text-[#718b33]">
                  <UserPlus className="size-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[#3d4b40]">{invitation.trainer?.full_name || 'A trainer'}</p>
                  <p className="text-xs text-[#969f96]">wants to be your trainer</p>
                </div>
                <button
                  onClick={() => handleAcceptInvitation(invitation.id)}
                  disabled={accepting === invitation.id}
                  className="flex items-center gap-2 rounded-xl bg-[#25342d] px-4 py-3 text-xs font-semibold text-white"
                >
                  {accepting === invitation.id ? 'Accepting...' : 'Accept'}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Assigned Trainer */}
      {trainer && (
        <section className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl font-semibold text-[#25342d]">Your trainer</h2>
              <p className="mt-1 text-xs text-[#929990]">Assigned fitness professional</p>
            </div>
          </div>
          <div className="mt-6 flex items-center gap-4 rounded-xl border border-[#edf0e8] p-4">
            <div className="grid size-12 shrink-0 place-items-center rounded-full bg-[#e1d8ea] text-[#4b3f58] text-sm font-semibold">
              {trainer.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-[#3d4b40]">{trainer.full_name}</p>
              {trainer.specialization && <p className="text-xs text-[#969f96]">{trainer.specialization}</p>}
              {trainer.phone && <p className="text-xs text-[#969f96]">{trainer.phone}</p>}
              {trainer.location && <p className="text-xs text-[#969f96]">{trainer.location}</p>}
            </div>
          </div>
          {trainer.bio && (
            <div className="mt-4 rounded-xl bg-[#f8f8f4] p-4">
              <p className="text-xs text-[#6b756a]">{trainer.bio}</p>
            </div>
          )}
        </section>
      )}

      <section className="card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold text-[#25342d]">Personal information</h2>
            <p className="mt-1 text-xs text-[#929990]">Your account details</p>
          </div>
          {!editing && (
            <button
              onClick={() => {
                setFullName(profile.full_name || '')
                setPhone(profile.phone || '')
                setEditing(true)
              }}
              className="flex items-center gap-2 rounded-lg border border-[#e5e7dd] px-3 py-2 text-xs text-[#69746a]"
            >
              Edit
            </button>
          )}
        </div>
        {editing ? (
          <div className="mt-6 space-y-4">
            <div>
              <label className="label">Full name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="label">Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 555 000 0000"
                className="input"
              />
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditing(false)} className="btn-secondary flex-1">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <div className="flex items-center gap-4 rounded-xl border border-[#edf0e8] p-4">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#edf3d5] text-[#718b33]">
                <User className="size-4" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-[#969f96]">Full name</p>
                <p className="text-sm font-semibold text-[#3d4b40]">{profile.full_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-xl border border-[#edf0e8] p-4">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#eee8f3] text-[#6b5a7a]">
                <Mail className="size-4" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-[#969f96]">Email</p>
                <p className="text-sm font-semibold text-[#3d4b40]">{profile.email}</p>
              </div>
            </div>
            {profile.phone && (
              <div className="flex items-center gap-4 rounded-xl border border-[#edf0e8] p-4">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#f7eadb] text-[#ad784b]">
                  <User className="size-4" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-[#969f96]">Phone</p>
                  <p className="text-sm font-semibold text-[#3d4b40]">{profile.phone}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-4 rounded-xl border border-[#edf0e8] p-4">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#f7eadb] text-[#ad784b]">
                <Calendar className="size-4" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-[#969f96]">Member since</p>
                <p className="text-sm font-semibold text-[#3d4b40]">{formatDate(profile.created_at)}</p>
              </div>
            </div>
          </div>
        )}
      </section>

      <button
        onClick={handleSignOut}
        className="flex w-fit items-center gap-2 rounded-xl border border-[#e5e7dd] bg-white px-4 py-3 text-xs font-semibold text-[#8b4a4a] hover:bg-[#f5d5d5] transition"
      >
        <LogOut className="size-4" />Sign out
      </button>
    </div>
  )
}
