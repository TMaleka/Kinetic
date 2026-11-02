import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Dumbbell, Eye, EyeOff } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Spinner } from '../../components/ui'

// Sends users who land anywhere from a password-recovery link to the reset form.
export function RecoveryRedirect() {
  const navigate = useNavigate()
  useEffect(() => {
    if (window.location.hash.includes('type=recovery') && window.location.pathname !== '/reset-password') {
      navigate('/reset-password', { replace: true })
    }
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') navigate('/reset-password', { replace: true })
    })
    return () => data.subscription.unsubscribe()
  }, [navigate])
  return null
}

export function ResetPasswordPage() {
  const { session, loading: authLoading, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password !== confirm) {
      setError('The two passwords do not match.')
      return
    }
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password })
    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }
    setDone(true)
    await refreshProfile()
    setTimeout(() => navigate('/', { replace: true }), 1500)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7fbfd] p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex size-16 items-center justify-center rounded-2xl bg-[#28a9e8] text-white">
            <Dumbbell size={32} />
          </div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-[#0f2a3a]">Set a new password</h1>
        </div>
        <div className="card p-6">
          {authLoading ? (
            <div className="flex justify-center py-6"><Spinner /></div>
          ) : !session ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-[#475569]">This reset link is invalid or has expired. Request a new one from the sign-in page.</p>
              <Link to="/auth" className="btn-primary inline-flex px-5 py-2.5">Back to sign in</Link>
            </div>
          ) : done ? (
            <p className="rounded-lg bg-[#d6f0e3] px-4 py-3 text-sm text-[#075a38]">Password updated. Taking you to the app…</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm text-[#64748b]">Signed in as <span className="font-semibold text-[#0f2a3a]">{session.user.email}</span></p>
              <div>
                <label className="label">New password</label>
                <div className="relative">
                  <input
                    type={show ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    required
                    minLength={6}
                    className="input pr-10"
                  />
                  <button type="button" onClick={() => setShow(!show)} aria-label="Show password" className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
                    {show ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="label">Confirm new password</label>
                <input type={show ? 'text' : 'password'} value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={6} className="input" />
              </div>
              {error && <div className="rounded-lg bg-[#fde3e6] px-3 py-2 text-sm text-[#f3263a]">{error}</div>}
              <button type="submit" disabled={saving} className="btn-primary w-full py-3">
                {saving ? <Spinner size={20} /> : 'Update password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
