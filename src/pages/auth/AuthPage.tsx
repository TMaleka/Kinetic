import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Dumbbell, Eye, EyeOff } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Spinner } from '../../components/ui'

export function AuthPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<'trainer' | 'client'>('trainer')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setNotice('')
    setLoading(true)

    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName, role } },
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
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#fffaf6]">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center size-16 rounded-2xl bg-[#ff4f1f] text-white mb-4">
            <Dumbbell size={32} />
          </div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-[#1c1446]">KineTic</h1>
          <p className="text-sm text-[#64748b] mt-2">
            {mode === 'signup' ? 'Create your account' : 'Welcome back'}
          </p>
        </div>

        <div className="card p-6">
          {/* Mode toggle */}
          <div className="flex gap-1 p-1 bg-[#f1f5f9] rounded-xl mb-6">
            <button
              type="button"
              onClick={() => setMode('signup')}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                mode === 'signup' ? 'bg-white text-[#1c1446] shadow-sm' : 'text-[#64748b]'
              }`}
            >
              Sign up
            </button>
            <button
              type="button"
              onClick={() => setMode('signin')}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                mode === 'signin' ? 'bg-white text-[#1c1446] shadow-sm' : 'text-[#64748b]'
              }`}
            >
              Sign in
            </button>
          </div>

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
                          ? 'border-[#ff8a4c] bg-[#d9f99d]'
                          : 'border-[#f3dccf] hover:border-[#ff8a4c]'
                      }`}
                    >
                      <p className="font-semibold text-[#1c1446]">Trainer</p>
                      <p className="text-xs text-[#64748b] mt-0.5">Coach clients</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('client')}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        role === 'client'
                          ? 'border-[#ff8a4c] bg-[#d9f99d]'
                          : 'border-[#f3dccf] hover:border-[#ff8a4c]'
                      }`}
                    >
                      <p className="font-semibold text-[#1c1446]">Client</p>
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

            <div>
              <label className="label">Password</label>
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
            </div>

            {notice && (
              <p className="rounded-lg bg-[#d9f99d] px-4 py-3 text-sm text-[#166534]">{notice}</p>
            )}
            {error && (
              <div className="text-sm text-[#dc2626] bg-[#fee2e2] rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3"
            >
              {loading ? <Spinner size={20} /> : mode === 'signup' ? 'Create Account' : 'Sign In'}
            </button>
          </form>
        </div>

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
            className="text-[#15803d] font-semibold hover:underline"
          >
            {mode === 'signup' ? 'Sign in' : 'Sign up'}
          </button>
        </p>
      </div>
    </div>
  )
}
