import { useState } from 'react'
import { Check, X, Edit, User, Target, Scale, Calendar } from 'lucide-react'

interface ClientGoalRequest {
  clientId: string
  clientName: string
  goal: string
  startingWeight: string
  targetWeight: string
  timeline: string
  submittedAt: string
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
          <div className="grid size-12 place-items-center rounded-full bg-[#edf3d5] text-[#718b33]">
            <Check className="size-6" />
          </div>
          <div>
            <h3 className="font-display text-xl font-semibold text-[#25342d]">Goal confirmed</h3>
            <p className="text-sm text-[#7c857c]">The client can now start their training program</p>
          </div>
        </div>
      </div>
    )
  }

  if (action === 'adjust') {
    return (
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="grid size-12 place-items-center rounded-full bg-[#eee8f3] text-[#6b5a7a]">
            <Edit className="size-6" />
          </div>
          <div>
            <h3 className="font-display text-xl font-semibold text-[#25342d]">Adjust goal</h3>
            <p className="text-sm text-[#7c857c]">Modify the goal based on your program recommendations</p>
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
          <div className="grid size-12 place-items-center rounded-full bg-[#f5d5d5] text-[#8b4a4a]">
            <X className="size-6" />
          </div>
          <div>
            <h3 className="font-display text-xl font-semibold text-[#25342d]">Goal rejected</h3>
            <p className="text-sm text-[#7c857c]">The client will need to submit a new goal</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-display text-xl font-semibold text-[#25342d]">Goal review request</h3>
          <p className="mt-1 text-sm text-[#929990]">{goalRequest.clientName} wants to start training</p>
        </div>
        <div className="text-right text-xs text-[#969f96]">
          Submitted {new Date(goalRequest.submittedAt).toLocaleDateString()}
        </div>
      </div>

      <div className="grid gap-4 mb-6">
        <div className="flex items-center gap-4 rounded-xl border border-[#edf0e8] p-4">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#edf3d5] text-[#718b33]">
            <User className="size-4" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-[#969f96]">Client</p>
            <p className="text-sm font-semibold text-[#3d4b40]">{goalRequest.clientName}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-[#edf0e8] p-4">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#f7eadb] text-[#ad784b]">
            <Target className="size-4" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-[#969f96]">Goal</p>
            <p className="text-sm font-semibold text-[#3d4b40]">{goalRequest.goal}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-[#edf0e8] p-4">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#f7eadb] text-[#ad784b]">
            <Scale className="size-4" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-[#969f96]">Weight goal</p>
            <p className="text-sm font-semibold text-[#3d4b40]">{goalRequest.startingWeight} kg → {goalRequest.targetWeight} kg</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-[#edf0e8] p-4">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#eee8f3] text-[#6b5a7a]">
            <Calendar className="size-4" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-[#969f96]">Timeline</p>
            <p className="text-sm font-semibold text-[#3d4b40]">{goalRequest.timeline}</p>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleConfirm}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#edf3d5] px-4 py-3 text-sm font-semibold text-[#718b33] hover:bg-[#d5e5c5] transition"
        >
          <Check className="size-4" />
          Confirm Goal
        </button>
        <button
          onClick={handleAdjust}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#eee8f3] px-4 py-3 text-sm font-semibold text-[#6b5a7a] hover:bg-[#e0d5e8] transition"
        >
          <Edit className="size-4" />
          Adjust Goal
        </button>
        <button
          onClick={handleReject}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#f5d5d5] px-4 py-3 text-sm font-semibold text-[#8b4a4a] hover:bg-[#e5c5c5] transition"
        >
          <X className="size-4" />
          Reject
        </button>
      </div>
    </div>
  )
}