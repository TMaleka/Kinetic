import { useState } from 'react'
import { Check, X, Edit, User, Target, Scale, Calendar } from 'lucide-react'
import { ClientIntakeSummary } from '../../components/ClientIntakeSummary'
import type { IntakeDetails } from '../../lib/intake'

interface ClientGoalRequest {
  clientId: string
  clientName: string
  goal: string
  startingWeight: string
  targetWeight: string
  timeline: string
  submittedAt: string
  details?: Partial<IntakeDetails> | null
}

interface TrainerGoalReviewProps {
  goalRequest: ClientGoalRequest
  onConfirm: (feedback?: string) => void
  onAdjust: (adjustedGoal: string, feedback: string) => void
  onReject: () => void
}

export function TrainerGoalReview({ goalRequest, onConfirm, onAdjust, onReject }: TrainerGoalReviewProps) {
  const [action, setAction] = useState<'none' | 'confirm' | 'adjust' | 'reject'>('none')
  const [adjustedGoal, setAdjustedGoal] = useState(goalRequest.goal)
  const [feedback, setFeedback] = useState('')

  const handleConfirm = () => {
    setAction('confirm')
    onConfirm()
  }

  const handleAdjust = () => {
    setAction('adjust')
  }

  const handleSubmitAdjustment = () => {
    onAdjust(adjustedGoal, feedback)
  }

  const handleReject = () => {
    setAction('reject')
    onReject()
  }

  if (action === 'confirm') {
    return (
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="grid size-12 place-items-center rounded-full bg-[#d6f0e3] text-[#075a38]">
            <Check className="size-6" />
          </div>
          <div>
            <h3 className="font-display text-xl font-semibold text-[#0f2a3a]">Goal confirmed</h3>
            <p className="text-sm text-[#64748b]">The client can now start their training program</p>
          </div>
        </div>
      </div>
    )
  }

  if (action === 'adjust') {
    return (
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="grid size-12 place-items-center rounded-full bg-[#d4f4f9] text-[#0e7490]">
            <Edit className="size-6" />
          </div>
          <div>
            <h3 className="font-display text-xl font-semibold text-[#0f2a3a]">Adjust goal</h3>
            <p className="text-sm text-[#64748b]">Modify the goal based on your program recommendations</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label">Adjusted goal</label>
            <textarea
              value={adjustedGoal}
              onChange={(e) => setAdjustedGoal(e.target.value)}
              placeholder="Enter adjusted goal..."
              rows={3}
              className="input resize-none"
            />
          </div>

          <div>
            <label className="label">Feedback to client</label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Explain why you adjusted the goal..."
              rows={3}
              className="input resize-none"
            />
          </div>

          <div className="flex gap-3">
            <button onClick={() => setAction('none')} className="btn-secondary flex-1 py-3">
              Cancel
            </button>
            <button onClick={handleSubmitAdjustment} className="btn-primary flex-1 py-3">
              Submit Adjustment
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (action === 'reject') {
    return (
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="grid size-12 place-items-center rounded-full bg-[#fde3e6] text-[#f3263a]">
            <X className="size-6" />
          </div>
          <div>
            <h3 className="font-display text-xl font-semibold text-[#0f2a3a]">Goal rejected</h3>
            <p className="text-sm text-[#64748b]">The client will need to submit a new goal</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-display text-xl font-semibold text-[#0f2a3a]">Goal review request</h3>
          <p className="mt-1 text-sm text-[#64748b]">{goalRequest.clientName} wants to start training</p>
        </div>
        <div className="text-right text-xs text-[#64748b]">
          Submitted {new Date(goalRequest.submittedAt).toLocaleDateString()}
        </div>
      </div>

      {goalRequest.details ? (
        <div className="mb-6 space-y-3">
          <div className="rounded-xl bg-[#e0f3fc] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#1787c4]">Goal</p>
            <p className="mt-1 text-sm font-semibold text-[#0f2a3a]">{goalRequest.goal}</p>
          </div>
          <ClientIntakeSummary details={goalRequest.details} />
        </div>
      ) : (
      <div className="grid gap-4 mb-6">
        <div className="flex items-center gap-4 rounded-xl border border-[#e3eff6] p-4">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#d6f0e3] text-[#075a38]">
            <User className="size-4" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-[#64748b]">Client</p>
            <p className="text-sm font-semibold text-[#1e293b]">{goalRequest.clientName}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-[#e3eff6] p-4">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#dff2fc] text-[#1787c4]">
            <Target className="size-4" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-[#64748b]">Goal</p>
            <p className="text-sm font-semibold text-[#1e293b]">{goalRequest.goal}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-[#e3eff6] p-4">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#dff2fc] text-[#1787c4]">
            <Scale className="size-4" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-[#64748b]">Weight goal</p>
            <p className="text-sm font-semibold text-[#1e293b]">{goalRequest.startingWeight} kg → {goalRequest.targetWeight} kg</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-[#e3eff6] p-4">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#d4f4f9] text-[#0e7490]">
            <Calendar className="size-4" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-[#64748b]">Timeline</p>
            <p className="text-sm font-semibold text-[#1e293b]">{goalRequest.timeline}</p>
          </div>
        </div>
      </div>

      )}

      <div className="flex gap-3">
        <button
          onClick={handleConfirm}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#d6f0e3] px-4 py-3 text-sm font-semibold text-[#075a38] hover:bg-[#bfe6d2] transition"
        >
          <Check className="size-4" />
          Confirm Goal
        </button>
        <button
          onClick={handleAdjust}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#d4f4f9] px-4 py-3 text-sm font-semibold text-[#0e7490] hover:bg-[#a5e8f3] transition"
        >
          <Edit className="size-4" />
          Adjust Goal
        </button>
        <button
          onClick={handleReject}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#fde3e6] px-4 py-3 text-sm font-semibold text-[#f3263a] hover:bg-[#fbc8ce] transition"
        >
          <X className="size-4" />
          Reject
        </button>
      </div>
    </div>
  )
}