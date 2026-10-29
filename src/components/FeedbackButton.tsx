import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { MessageSquarePlus } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Modal, Spinner } from './ui'

const CATEGORIES = [
  { id: 'bug', label: 'Something is broken' },
  { id: 'idea', label: 'Idea or request' },
  { id: 'other', label: 'Other' },
] as const

export function FeedbackButton() {
  const { profile } = useAuth()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]['id']>('bug')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const close = () => {
    setOpen(false)
    setTimeout(() => { setSent(false); setError('') }, 200)
  }

  const send = async () => {
    if (!profile) return
    setSending(true)
    setError('')
    const { error } = await supabase.from('feedback').insert({
      user_id: profile.id,
      role: profile.role,
      category,
      message: message.trim(),
      page: location.pathname,
      user_agent: navigator.userAgent,
    })
    setSending(false)
    if (error) {
      setError(`Could not send feedback: ${error.message}`)
      return
    }
    setMessage('')
    setSent(true)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Send feedback"
        className="flex h-9 items-center gap-1.5 rounded-full border border-[#d9e9f2] px-3 text-xs font-semibold text-[#64748b] hover:bg-[#e0f2fb]"
      >
        <MessageSquarePlus className="size-4" />
        <span className="hidden md:inline">Feedback</span>
      </button>
      <Modal open={open} onClose={close} title="Send feedback">
        {sent ? (
          <div className="space-y-4">
            <p className="rounded-lg bg-[#d6f0e3] px-4 py-3 text-sm text-[#075a38]">Thanks! Your feedback has been sent to the KineTic team.</p>
            <button onClick={close} className="btn-primary w-full py-2.5">Done</button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-[#64748b]">Tell us what went wrong or what would make KineTic better. We'll also note the page you're on.</p>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.id)}
                  className={`rounded-xl border-2 p-2.5 text-xs font-semibold transition-all ${
                    category === c.id ? 'border-[#28a9e8] bg-[#e0f3fc] text-[#0f2a3a]' : 'border-[#d9e9f2] text-[#64748b] hover:border-[#68d6e8]'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              maxLength={4000}
              placeholder={category === 'bug' ? 'What were you doing, and what happened?' : 'Your feedback…'}
              className="input resize-none"
            />
            {error && <div className="rounded-lg bg-[#fde3e6] px-3 py-2 text-sm text-[#f3263a]">{error}</div>}
            <button onClick={send} disabled={!message.trim() || sending} className="btn-primary w-full py-2.5">
              {sending ? <Spinner size={18} /> : 'Send feedback'}
            </button>
          </div>
        )}
      </Modal>
    </>
  )
}
