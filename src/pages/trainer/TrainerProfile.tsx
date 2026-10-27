import { useState, useEffect } from 'react'
import { LogOut, User, Mail, Calendar, MapPin, Phone, Briefcase } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Spinner } from '../../components/ui'
import { formatDate, updateProfile } from '../../lib/queries'

export function TrainerProfile() {
  const { profile, signOut, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [phone, setPhone] = useState(profile?.phone || '')
  const [bio, setBio] = useState(profile?.bio || '')
  const [location, setLocation] = useState(profile?.location || '')
  const [specialization, setSpecialization] = useState(profile?.specialization || '')
  const [saving, setSaving] = useState(false)
  const [useMockData] = useState(false) // Set to false for production

  useEffect(() => {
    // Mock data for testing (disabled in production)
    /*
    if (useMockData && profile) {
      setFullName('Alex Thompson')
      setPhone('+1 555-0100')
      setBio('Certified personal trainer with 10+ years of experience in strength training and nutrition.')
      setLocation('San Francisco, CA')
      setSpecialization('Strength & Conditioning')
    }
    */
  }, [profile, useMockData])

  const handleSave = async () => {
    if (!profile) return
    setSaving(true)
    try {
      await updateProfile(profile.id, {
        full_name: fullName,
        phone: phone || undefined,
        bio: bio || undefined,
        location: location || undefined,
        specialization: specialization || undefined,
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
          <p className="mb-2 text-xs font-semibold uppercase tracking-[.14em] text-[#1787c4]">Your account</p>
          <h1 className="font-display text-4xl font-semibold tracking-tight text-[#0f2a3a]">Profile</h1>
          <p className="mt-2 text-sm text-[#64748b]">Manage your trainer profile and settings.</p>
        </div>
      </div>

      <section className="card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold text-[#0f2a3a]">Personal information</h2>
            <p className="mt-1 text-xs text-[#64748b]">Your account details</p>
          </div>
          {!editing && (
            <button
              onClick={() => {
                setFullName(profile.full_name || '')
                setPhone(profile.phone || '')
                setBio(profile.bio || '')
                setLocation(profile.location || '')
                setSpecialization(profile.specialization || '')
                setEditing(true)
              }}
              className="flex items-center gap-2 rounded-lg border border-[#d9e9f2] px-3 py-2 text-xs text-[#475569]"
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
              <label className="label">Email</label>
              <input
                type="email"
                value={profile.email}
                disabled
                className="input bg-[#eef7fc]"
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
            <div>
              <label className="label">Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="City, Country"
                className="input"
              />
            </div>
            <div>
              <label className="label">Specialization</label>
              <input
                type="text"
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                placeholder="e.g. Strength training, Weight loss"
                className="input"
              />
            </div>
            <div>
              <label className="label">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell clients about yourself..."
                rows={3}
                className="input resize-none"
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
            <div className="flex items-center gap-4 rounded-xl border border-[#e3eff6] p-4">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#d6f0e3] text-[#075a38]">
                <User className="size-4" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-[#64748b]">Full name</p>
                <p className="text-sm font-semibold text-[#1e293b]">{profile.full_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-xl border border-[#e3eff6] p-4">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#d4f4f9] text-[#0e7490]">
                <Mail className="size-4" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-[#64748b]">Email</p>
                <p className="text-sm font-semibold text-[#1e293b]">{profile.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-xl border border-[#e3eff6] p-4">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#dff2fc] text-[#1787c4]">
                <Phone className="size-4" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-[#64748b]">Phone</p>
                <p className="text-sm font-semibold text-[#1e293b]">{profile.phone || 'Not set'}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-xl border border-[#e3eff6] p-4">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#d6f0e3] text-[#075a38]">
                <MapPin className="size-4" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-[#64748b]">Location</p>
                <p className="text-sm font-semibold text-[#1e293b]">{profile.location || 'Not set'}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-xl border border-[#e3eff6] p-4">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#d4f4f9] text-[#0e7490]">
                <Briefcase className="size-4" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-[#64748b]">Specialization</p>
                <p className="text-sm font-semibold text-[#1e293b]">{profile.specialization || 'Not set'}</p>
              </div>
            </div>
            <div className="flex items-start gap-4 rounded-xl border border-[#e3eff6] p-4">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#f1f5f9] text-[#64748b]">
                <User className="size-4" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-[#64748b]">Bio</p>
                <p className="text-sm font-semibold text-[#1e293b]">{profile.bio || 'Not set'}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-xl border border-[#e3eff6] p-4">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#dff2fc] text-[#1787c4]">
                <Calendar className="size-4" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-[#64748b]">Member since</p>
                <p className="text-sm font-semibold text-[#1e293b]">{formatDate(profile.created_at)}</p>
              </div>
            </div>
          </div>
        )}
      </section>

      <button
        onClick={handleSignOut}
        className="flex w-fit items-center gap-2 rounded-xl border border-[#d9e9f2] bg-white px-4 py-3 text-xs font-semibold text-[#f3263a] hover:bg-[#fde3e6] transition"
      >
        <LogOut className="size-4" />Sign out
      </button>
    </div>
  )
}