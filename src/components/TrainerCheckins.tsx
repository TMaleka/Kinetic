import { useEffect, useState } from 'react'
import { MessageCircle, ClipboardCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { createNotification } from '../lib/notifications'
import { checkinFlags, fetchCheckins, formatWeek, replyToCheckin, weekStartISO, type WeeklyCheckin } from '../lib/checkins'
import { nudgeMessage, whatsappLink } from '../lib/reminders'
import { CheckinScoreChips } from '../pages/client/ClientCheckin'

export function TrainerCheckins({ clientId, clientName, clientPhone }: { clientId: string; clientName: string; clientPhone: string | null }) {
  const { profile } = useAuth()
  const [checkins, setCheckins] = useState<WeeklyCheckin[] | null>(null)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [sending, setSending] = useState<string | null>(null)

  const load = () =>
    fetchCheckins([clientId], 8)
      .then(setCheckins)
      .catch((err) => console.error('Failed to load check-ins:', err))

  useEffect(() => {
    load()
  }, [clientId])

  if (checkins === null) return null

  const weekStart = weekStartISO()
  const hasThisWeek = checkins.some((c) => c.week_start === weekStart)

  const sendReply = async (c: WeeklyCheckin) => {
    const reply = (drafts[c.id] || '').trim()
    if (!reply || !profile) return
    setSending(c.id)
    try {
      await replyToCheckin(c.id, reply)
      await createNotification(clientId, 'checkin_reply', 'Your trainer replied', `${profile.full_name || 'Your trainer'}: ${reply.slice(0, 140)}`, { checkin_id: c.id })
      setDrafts((d) => ({ ...d, [c.id]: '' }))
      await load()
    } catch (err: any) {
      alert(`Could not send reply: ${err?.message || 'Unknown error'}`)
    } finally {
      setSending(null)
    }
  }

  return (
    <section className="card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold text-[#0f2a3a]">Weekly check-ins</h2>
          <p className="mt-1 text-xs text-[#64748b]">{hasThisWeek ? 'Checked in this week' : 'No check-in yet this week'}</p>
        </div>
        {!hasThisWeek && (
          <a
            href={whatsappLink(clientPhone, nudgeMessage('checkin_due', clientName, profile?.full_name || ''))}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-xl border border-[#d9e9f2] bg-white px-3 py-2 text-xs font-semibold text-[#334155] hover:bg-[#eef7fc]"
          >
            <MessageCircle className="size-4 text-[#1787c4]" />Remind on WhatsApp
          </a>
        )}
      </div>
      {checkins.length === 0 ? (
        <div className="mt-6 flex items-center gap-3 rounded-xl bg-[#eef7fc] p-5">
          <ClipboardCheck className="size-5 shrink-0 text-[#1787c4]" />
          <p className="text-sm text-[#64748b]">No check-ins yet. Your client sees a "Weekly check-in" card on their Today screen.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {checkins.map((c) => {
            const flags = checkinFlags(c)
            return (
              <div key={c.id} className={`rounded-xl border p-4 ${flags.length ? 'border-[#f7c3c9]' : 'border-[#e3eff6]'}`}>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <p className="text-xs font-semibold text-[#64748b]">{formatWeek(c.week_start)}</p>
                  {flags.map((f) => (
                    <span key={f} className="rounded-full bg-[#fde3e6] px-2 py-0.5 text-[10px] font-semibold text-[#f3263a]">{f}</span>
                  ))}
                  {c.body_weight != null && <span className="text-[11px] text-[#64748b]">· {c.body_weight} kg</span>}
                </div>
                <CheckinScoreChips checkin={c} />
                {c.wins && <p className="mt-3 text-sm text-[#334155]"><b>Wins:</b> {c.wins}</p>}
                {c.struggles && <p className="mt-1 text-sm text-[#334155]"><b>Struggles:</b> {c.struggles}</p>}
                {c.trainer_reply ? (
                  <p className="mt-3 rounded-xl bg-[#eef7fc] p-3 text-sm text-[#334155]"><b>Your reply:</b> {c.trainer_reply}</p>
                ) : (
                  <div className="mt-3 flex gap-2">
                    <input
                      className="input flex-1"
                      placeholder="Reply to your client…"
                      value={drafts[c.id] || ''}
                      maxLength={2000}
                      onChange={(e) => setDrafts((d) => ({ ...d, [c.id]: e.target.value }))}
                      onKeyDown={(e) => e.key === 'Enter' && sendReply(c)}
                    />
                    <button className="btn-primary" disabled={!drafts[c.id]?.trim() || sending === c.id} onClick={() => sendReply(c)}>
                      {sending === c.id ? 'Sending…' : 'Reply'}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
