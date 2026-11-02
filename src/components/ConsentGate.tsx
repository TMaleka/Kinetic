import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { consentMetadata } from '../lib/privacy'
import { Spinner } from './ui'

// Shown to signed-in users who created their account before consent was collected.
export function ConsentGate() {
  const { signOut } = useAuth()
  const [agreed, setAgreed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const accept = async () => {
    setSaving(true)
    setError('')
    const { error } = await supabase.auth.updateUser({ data: consentMetadata() })
    setSaving(false)
    if (error) setError(error.message)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7fbfd] p-4">
      <div className="card w-full max-w-md p-6">
        <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-[#d6f0e3] text-[#075a38]">
          <ShieldCheck className="size-6" />
        </div>
        <h1 className="font-display text-xl font-semibold text-[#0f2a3a]">Your privacy</h1>
        <p className="mt-2 text-sm leading-relaxed text-[#475569]">
          KineTic stores fitness and health information, such as injuries, medical conditions, measurements and progress photos, so you and your trainer can train safely. Please read our privacy notice and confirm you agree before continuing.
        </p>
        <ConsentCheckbox checked={agreed} onChange={setAgreed} />
        {error && <div className="mt-3 rounded-lg bg-[#fde3e6] px-3 py-2 text-sm text-[#f3263a]">{error}</div>}
        <div className="mt-5 flex gap-3">
          <button onClick={accept} disabled={!agreed || saving} className="btn-primary flex-1 py-2.5">
            {saving ? <Spinner size={18} /> : 'Continue'}
          </button>
          <button onClick={async () => { await signOut(); window.location.href = '/auth' }} className="btn-secondary px-4 py-2.5">
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}

export function ConsentCheckbox({ checked, onChange, required }: { checked: boolean; onChange: (v: boolean) => void; required?: boolean }) {
  return (
    <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-[#d9e9f2] bg-[#f7fbfd] p-3 text-xs leading-relaxed text-[#475569]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        required={required}
        className="mt-0.5 size-4 shrink-0 accent-[#28a9e8]"
      />
      <span>
        I have read the{' '}
        <Link to="/privacy" target="_blank" className="font-semibold text-[#1787c4] underline">privacy notice</Link>{' '}
        and consent to KineTic processing my personal and health information so my trainer and I can use the app.
      </span>
    </label>
  )
}
