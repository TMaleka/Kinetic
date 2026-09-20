import { useState } from 'react'
import { ChevronRight, ChevronLeft, Target, Scale, Activity, Check, Edit } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'

type Step = 'goal' | 'starting' | 'target' | 'review'

export function ClientOnboarding() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('goal')
  const [loading, setLoading] = useState(false)
  
  // Onboarding data
  const [goal, setGoal] = useState('')
  const [startingWeight, setStartingWeight] = useState('')
  const [targetWeight, setTargetWeight] = useState('')
  const [timeline, setTimeline] = useState('')
  const [trainerFeedback, setTrainerFeedback] = useState('')
  const [goalStatus, setGoalStatus] = useState<'pending' | 'confirmed' | 'adjusted'>('pending')
  const [mockSubmitted, setMockSubmitted] = useState(false)

  const handleNext = () => {
    if (step === 'goal') setStep('starting')
    else if (step === 'starting') setStep('target')
    else if (step === 'target') setStep('review')
  }

  const handleBack = () => {
    if (step === 'target') setStep('starting')
    else if (step === 'starting') setStep('goal')
    else if (step === 'review') setStep('target')
  }

  const handleSubmit = async () => {
    setLoading(true)
    // TODO: Save onboarding data to database and mark onboarding as complete
    // For testing: simulate trainer review process
    setTimeout(() => {
      setGoalStatus('confirmed')
      setMockSubmitted(true)
      setLoading(false)
    }, 1500)
  }

  const handleStartTraining = () => {
    navigate('/app')
  }

  const renderStep = () => {
    switch (step) {
      case 'goal':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="grid size-16 place-items-center rounded-full bg-[#edf3d5] text-[#718b33] mx-auto mb-4">
                <Target className="size-8" />
              </div>
              <h2 className="font-display text-2xl font-semibold text-[#25342d]">My goal</h2>
              <p className="mt-2 text-sm text-[#7c857c]">What are you working towards?</p>
            </div>
            
            <div className="space-y-4">
              <label className="label">What's your main fitness goal?</label>
              <textarea
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="e.g., Build muscle, lose weight, improve endurance..."
                rows={4}
                className="input resize-none"
              />
              
              <div className="grid grid-cols-2 gap-3">
                {['Build muscle', 'Lose weight', 'Improve endurance', 'General fitness'].map((option) => (
                  <button
                    key={option}
                    onClick={() => setGoal(option)}
                    className={`rounded-xl border p-4 text-left text-sm transition ${
                      goal === option
                        ? 'border-[#25342d] bg-[#25342d] text-white'
                        : 'border-[#e5e7dd] hover:border-[#25342d] hover:bg-[#f8f8f4]'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )

      case 'starting':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="grid size-16 place-items-center rounded-full bg-[#f7eadb] text-[#ad784b] mx-auto mb-4">
                <Scale className="size-8" />
              </div>
              <h2 className="font-display text-2xl font-semibold text-[#25342d]">My starting point</h2>
              <p className="mt-2 text-sm text-[#7c857c]">KineTic asks for the relevant baseline</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="label">Current weight (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={startingWeight}
                  onChange={(e) => setStartingWeight(e.target.value)}
                  placeholder="75.0"
                  className="input"
                />
              </div>
              
              <div>
                <label className="label">Height (cm)</label>
                <input
                  type="number"
                  placeholder="175"
                  className="input"
                />
              </div>
              
              <div>
                <label className="label">Current activity level</label>
                <select className="input">
                  <option value="">Select activity level</option>
                  <option value="sedentary">Sedentary (little to no exercise)</option>
                  <option value="light">Light (1-3 days/week)</option>
                  <option value="moderate">Moderate (3-5 days/week)</option>
                  <option value="active">Active (6-7 days/week)</option>
                  <option value="very-active">Very active (intense daily)</option>
                </select>
              </div>
              
              <div>
                <label className="label">Any injuries or limitations?</label>
                <textarea
                  placeholder="Describe any injuries, medical conditions, or physical limitations..."
                  rows={3}
                  className="input resize-none"
                />
              </div>
            </div>
          </div>
        )

      case 'target':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="grid size-16 place-items-center rounded-full bg-[#eee8f3] text-[#6b5a7a] mx-auto mb-4">
                <Activity className="size-8" />
              </div>
              <h2 className="font-display text-2xl font-semibold text-[#25342d]">My target</h2>
              <p className="mt-2 text-sm text-[#7c857c]">Where would you like to get to?</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="label">Target weight (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={targetWeight}
                  onChange={(e) => setTargetWeight(e.target.value)}
                  placeholder="70.0"
                  className="input"
                />
              </div>
              
              <div>
                <label className="label">Timeline</label>
                <select
                  value={timeline}
                  onChange={(e) => setTimeline(e.target.value)}
                  className="input"
                >
                  <option value="">Select timeline</option>
                  <option value="1-month">1 month</option>
                  <option value="3-months">3 months</option>
                  <option value="6-months">6 months</option>
                  <option value="1-year">1 year</option>
                  <option value="ongoing">Ongoing</option>
                </select>
              </div>
              
              <div>
                <label className="label">Additional targets (optional)</label>
                <textarea
                  placeholder="e.g., Run 5km in 25 minutes, bench press 100kg..."
                  rows={3}
                  className="input resize-none"
                />
              </div>
              
              <div className="rounded-xl bg-[#f8f8f4] p-4">
                <p className="text-sm text-[#6b756a]">
                  Your trainer will review these targets and may adjust them based on their program recommendations.
                </p>
              </div>
            </div>
          </div>
        )

      case 'review':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="grid size-16 place-items-center rounded-full bg-[#edf3d5] text-[#718b33] mx-auto mb-4">
                <Check className="size-8" />
              </div>
              <h2 className="font-display text-2xl font-semibold text-[#25342d]">Trainer review</h2>
              <p className="mt-2 text-sm text-[#7c857c]">Your trainer will confirm or adjust your goal</p>
            </div>
            
            <div className="space-y-4">
              <div className="rounded-xl border border-[#edf0e8] p-4">
                <h3 className="font-semibold text-[#25342d] mb-3">Your request</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#969f96]">Goal:</span>
                    <span className="font-medium">{goal}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#969f96]">Starting weight:</span>
                    <span className="font-medium">{startingWeight} kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#969f96]">Target weight:</span>
                    <span className="font-medium">{targetWeight} kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#969f96]">Timeline:</span>
                    <span className="font-medium">{timeline}</span>
                  </div>
                </div>
              </div>
              
              {goalStatus === 'pending' && (
                <div className="rounded-xl bg-[#f7eadb] p-4">
                  <p className="text-sm text-[#ad784b]">
                    Your goal has been submitted for trainer review. You'll be notified once your trainer has reviewed it.
                  </p>
                </div>
              )}
              
              {goalStatus === 'confirmed' && (
                <div className="rounded-xl bg-[#edf3d5] p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Check className="size-4 text-[#718b33]" />
                    <span className="font-semibold text-[#718b33]">Goal confirmed</span>
                  </div>
                  <p className="text-sm text-[#718b33]">
                    Your trainer has confirmed your goal. You can now start your training program.
                  </p>
                </div>
              )}
              
              {goalStatus === 'adjusted' && (
                <div className="rounded-xl bg-[#eee8f3] p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Edit className="size-4 text-[#6b5a7a]" />
                    <span className="font-semibold text-[#6b5a7a]">Goal adjusted</span>
                  </div>
                  <p className="text-sm text-[#6b5a7a] mb-3">
                    Your trainer has adjusted your goal based on their program recommendations.
                  </p>
                  <div className="rounded-lg bg-white p-3">
                    <p className="text-sm font-medium text-[#25342d]">{trainerFeedback}</p>
                  </div>
                </div>
              )}
              
              <button
                onClick={goalStatus === 'confirmed' || goalStatus === 'adjusted' ? handleStartTraining : handleSubmit}
                disabled={loading || goalStatus === 'pending'}
                className="btn-primary w-full py-3"
              >
                {loading ? 'Submitting...' : goalStatus === 'confirmed' || goalStatus === 'adjusted' ? 'Start Training' : 'Submit for Review'}
              </button>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  const getStepNumber = () => {
    switch (step) {
      case 'goal': return 1
      case 'starting': return 2
      case 'target': return 3
      case 'review': return 4
      default: return 1
    }
  }

  return (
    <div className="min-h-screen bg-[#fbfbf8] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#93a84e]">Step {getStepNumber()} of 4</span>
            <div className="flex gap-1">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={`h-1.5 w-8 rounded-full transition ${
                    i <= getStepNumber() ? 'bg-[#25342d]' : 'bg-[#e5e7dd]'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="card p-8">
          {renderStep()}
        </div>

        {/* Navigation buttons */}
        {step !== 'review' && (
          <div className="mt-6 flex gap-3">
            {step !== 'goal' && (
              <button
                onClick={handleBack}
                className="btn-secondary flex-1 py-3 flex items-center justify-center gap-2"
              >
                <ChevronLeft className="size-4" />
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={step === 'goal' && !goal || step === 'starting' && !startingWeight || step === 'target' && !targetWeight}
              className="btn-primary flex-1 py-3 flex items-center justify-center gap-2"
            >
              {step === 'target' ? 'Review' : 'Next'}
              <ChevronRight className="size-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}