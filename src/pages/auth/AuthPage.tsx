import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Dumbbell, Eye, EyeOff } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Spinner } from '../../components/ui'
import { ConsentCheckbox } from '../../components/ConsentGate'
import { consentMetadata } from '../../lib/privacy'
import { useAuth } from '../../context/AuthContext'

export function AuthPage() {
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<'trainer' | 'client'>('trainer')
  const [showPassword, setShowPassword] = useState(false)
  const [consent, setConsent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const navigate = useNavigate()
  const { refreshProfile } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setNotice('')
    setLoading(true)

    try {
      if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        })
        // Only surface rate limiting; other errors would reveal whether the account exists.
        if (error?.status === 429) throw error
        if (error) console.error('Password reset request failed:', error)
        setNotice('If an account exists for that email, a password reset link is on its way. Check your inbox (and spam folder).')
        return
      }
      if (mode === 'signup') {
        if (!consent) throw new Error('Please accept the privacy notice to create an account.')
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName, role, ...consentMetadata() } },
        })
        if (error) throw error

        if (!data.session) {
          // Email confirmation is enabled: there is no session until the user confirms.
          setNotice('Account created. Check your email to confirm your address, then sign in.')
          setMode('signin')
          return
        }

        // Update profile with role and name
        if (data.user) {
          await supabase
            .from('profiles')
            .update({ role, full_name: fullName })
            .eq('id', data.user.id)
          // The auth listener may have loaded the profile before the role update landed.
          await refreshProfile()
        }
        // Navigate to appropriate dashboard based on role
        navigate(role === 'trainer' ? '/trainer' : '/onboarding')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        // Navigation will be handled by AuthContext/ProtectedRoutes
        navigate('/')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#f7fbfd]">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center size-16 rounded-2xl bg-[#28a9e8] text-white mb-4">
            <Dumbbell size={32} />
          </div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-[#0f2a3a]">KineTic</h1>
          <p className="text-sm text-[#64748b] mt-2">
            {mode === 'signup' ? 'Create your account' : mode === 'forgot' ? 'Reset your password' : 'Welcome back'}
          </p>
        </div>

        <div className="card p-6">
          {/* Mode toggle */}
          {mode !== 'forgot' && <div className="flex gap-1 p-1 bg-[#f1f5f9] rounded-xl mb-6">
            <button
              type="button"
              onClick={() => setMode('signup')}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                mode === 'signup' ? 'bg-white text-[#0f2a3a] shadow-sm' : 'text-[#64748b]'
              }`}
            >
              Sign up
            </button>
            <button
              type="button"
              onClick={() => setMode('signin')}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                mode === 'signin' ? 'bg-white text-[#0f2a3a] shadow-sm' : 'text-[#64748b]'
              }`}
            >
              Sign in
            </button>
          </div>}

          {mode === 'forgot' && (
            <p className="mb-4 text-sm text-[#64748b]">Enter the email you signed up with and we'll send you a link to set a new password.</p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <>
                <div>
                  <label className="label">Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Jane Smith"
                    required
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">I am a...</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setRole('trainer')}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        role === 'trainer'
                          ? 'border-[#28a9e8] bg-[#e0f3fc]'
                          : 'border-[#d9e9f2] hover:border-[#68d6e8]'
                      }`}
                    >
                      <p className="font-semibold text-[#0f2a3a]">Trainer</p>
                      <p className="text-xs text-[#64748b] mt-0.5">Coach clients</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('client')}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        role === 'client'
                          ? 'border-[#28a9e8] bg-[#e0f3fc]'
                          : 'border-[#d9e9f2] hover:border-[#68d6e8]'
                      }`}
                    >
                      <p className="font-semibold text-[#0f2a3a]">Client</p>
                      <p className="text-xs text-[#64748b] mt-0.5">Get coached</p>
                    </button>
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="label">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="input"
              />
            </div>

            {mode !== 'forgot' && <div>
              <div className="flex items-center justify-between">
                <label className="label">Password</label>
                {mode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => { setMode('forgot'); setError(''); setNotice('') }}
                    className="mb-1.5 text-xs font-semibold text-[#1787c4] hover:underline"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  required
                  minLength={6}
                  className="input pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>}

            {mode === 'signup' && <ConsentCheckbox checked={consent} onChange={setConsent} required />}

            {notice && (
              <p className="rounded-lg bg-[#d6f0e3] px-4 py-3 text-sm text-[#075a38]">{notice}</p>
            )}
            {error && (
              <div className="text-sm text-[#f3263a] bg-[#fde3e6] rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3"
            >
              {loading ? <Spinner size={20} /> : mode === 'signup' ? 'Create Account' : mode === 'forgot' ? 'Send reset link' : 'Sign In'}
            </button>
          </form>
        </div>

        {mode === 'forgot' ? (
          <p className="text-center text-sm text-[#64748b] mt-6">
            Remembered it?{' '}
            <button type="button" onClick={() => { setMode('signin'); setError(''); setNotice('') }} className="text-[#f3263a] font-semibold hover:underline">
              Back to sign in
            </button>
          </p>
        ) : (
        <p className="text-center text-sm text-[#64748b] mt-6">
          {mode === 'signup'
            ? 'Already have an account? '
            : "Don't have an account? "}
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'signup' ? 'signin' : 'signup')
              setError('')
            }}
            className="text-[#f3263a] font-semibold hover:underline"
          >
            {mode === 'signup' ? 'Sign in' : 'Sign up'}
          </button>
        </p>
        )}
        <p className="mt-3 text-center text-xs text-[#94a3b8]">
          <Link to="/privacy" className="hover:underline">Privacy notice</Link>
        </p>
      </div>
    </div>
  )
}
