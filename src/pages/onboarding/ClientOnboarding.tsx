import { useState } from 'react'
import { ChevronRight, ChevronLeft, Target, Scale, Activity } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

type Step = 'goal' | 'starting' | 'target'

export function ClientOnboarding() {
  const { profile, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('goal')
  const [loading, setLoading] = useState(false)
  
  // Onboarding data
  const [goal, setGoal] = useState('')
  const [startingWeight, setStartingWeight] = useState('')
  const [targetWeight, setTargetWeight] = useState('')
  const [timeline, setTimeline] = useState('')
  const [height, setHeight] = useState('')
  const [activityLevel, setActivityLevel] = useState('')
  const [injuries, setInjuries] = useState('')
  const [additionalTargets, setAdditionalTargets] = useState('')
  const [error, setError] = useState('')

  const handleNext = () => {
    if (step === 'goal') setStep('starting')
    else if (step === 'starting') setStep('target')
  }

  const handleBack = () => {
    if (step === 'target') setStep('starting')
    else if (step === 'starting') setStep('goal')
  }

  const handleSubmit = async () => {
    if (!profile) return
    setLoading(true)
    setError('')
    try {
      const { error: goalError } = await supabase.from('client_goals').insert({
        client_id: profile.id,
        goal,
        starting_weight: startingWeight ? parseFloat(startingWeight) : null,
        target_weight: targetWeight ? parseFloat(targetWeight) : null,
        timeline: timeline || null,
        starting_height: height ? parseFloat(height) : null,
        activity_level: activityLevel || null,
        injuries: injuries || null,
        additional_targets: additionalTargets || null,
      })
      if (goalError) throw goalError

      if (startingWeight) {
        const { error: measurementError } = await supabase
          .from('measurements')
          .insert({ client_id: profile.id, body_weight: parseFloat(startingWeight) })
        if (measurementError) console.error('Failed to save starting weight:', measurementError)
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', profile.id)
      if (profileError) throw profileError

      await refreshProfile()
      navigate('/app')
    } catch (err: any) {
      console.error('Onboarding error:', err)
      setError(`Could not save your details: ${err?.message || 'Unknown error'}. Please try again.`)
    } finally {
      setLoading(false)
    }
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
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  placeholder="175"
                  className="input"
                />
              </div>
              
              <div>
                <label className="label">Current activity level</label>
                <select value={activityLevel} onChange={(e) => setActivityLevel(e.target.value)} className="input">
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
                  value={injuries}
                  onChange={(e) => setInjuries(e.target.value)}
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
                  value={additionalTargets}
                  onChange={(e) => setAdditionalTargets(e.target.value)}
                  placeholder="e.g., Run 5km in 25 minutes, bench press 100kg..."
                  rows={3}
                  className="input resize-none"
                />
              </div>
              
              <div className="rounded-xl bg-[#f8f8f4] p-4">
                <p className="text-sm text-[#6b756a]">
                  You can update these targets later. Once you connect with a trainer, they can review and adjust these goals based on their expertise.
                </p>
              </div>
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
      default: return 1
    }
  }

  return (
    <div className="min-h-screen bg-[#fbfbf8] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#93a84e]">Step {getStepNumber()} of 3</span>
            <div className="flex gap-1">
              {[1, 2, 3].map((i) => (
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

        {error && (
          <p className="mt-4 rounded-lg bg-[#f5d5d5] px-4 py-3 text-sm text-[#8b4a4a]">{error}</p>
        )}

        {/* Navigation buttons */}
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
            onClick={step === 'target' ? handleSubmit : handleNext}
            disabled={loading || (step === 'goal' && !goal) || (step === 'starting' && !startingWeight) || (step === 'target' && !targetWeight)}
            className="btn-primary flex-1 py-3 flex items-center justify-center gap-2"
          >
            {loading ? 'Completing...' : step === 'target' ? 'Complete Onboarding' : 'Next'}
            {step !== 'target' && <ChevronRight className="size-4" />}
          </button>
        </div>
      </div>
    </div>
  )
}