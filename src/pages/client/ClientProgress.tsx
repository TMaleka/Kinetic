import { useEffect, useState } from 'react'
import { Plus, Camera, X, ChevronRight, Target, TrendingUp } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { Spinner } from '../../components/ui'
import { formatDate, addActivityEvent, todayISO, toLocalISO, addDays } from '../../lib/queries'

type Category = 'weight' | 'goals'

export function ClientProgress() {
  const { profile } = useAuth()
  const [category, setCategory] = useState<Category>('weight')
  const [measurements, setMeasurements] = useState<any[]>([])
  const [photos, setPhotos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddMeasurement, setShowAddMeasurement] = useState(false)
  const [showAddPhoto, setShowAddPhoto] = useState(false)
  const [photoUrl, setPhotoUrl] = useState('')
  const [photoType, setPhotoType] = useState<'front' | 'side' | 'back' | 'other'>('front')
  const [photoCaption, setPhotoCaption] = useState('')
  const [saving, setSaving] = useState(false)
  const [measurementWeight, setMeasurementWeight] = useState('')
  const [useMockData] = useState(false) // Set to false for production

  useEffect(() => {
    if (profile) loadData()
  }, [profile])

  const loadData = async () => {
    if (!profile) return
    
    // Mock data for testing (disabled in production)
    /*
    if (useMockData) {
      const today = new Date()
      setMeasurements([
        {
          id: 'm1',
          client_id: profile.id,
          body_weight: 78.0,
          chest: 102,
          waist: 84,
          hips: 98,
          logged_at: toLocalISO(addDays(today, -30))
        },
        {
          id: 'm2',
          client_id: profile.id,
          body_weight: 77.2,
          chest: 101,
          waist: 83,
          hips: 97,
          logged_at: toLocalISO(addDays(today, -15))
        },
        {
          id: 'm3',
          client_id: profile.id,
          body_weight: 75.5,
          chest: 100,
          waist: 81,
          hips: 96,
          logged_at: todayISO()
        }
      ])
      
      setPhotos([
        {
          id: 'p1',
          client_id: profile.id,
          photo_url: 'https://via.placeholder.com/300x400?text=Progress+Photo+1',
          photo_type: 'front',
          caption: 'Starting point',
          taken_at: toLocalISO(addDays(today, -30))
        },
        {
          id: 'p2',
          client_id: profile.id,
          photo_url: 'https://via.placeholder.com/300x400?text=Progress+Photo+2',
          photo_type: 'front',
          caption: '2 weeks progress',
          taken_at: toLocalISO(addDays(today, -15))
        },
        {
          id: 'p3',
          client_id: profile.id,
          photo_url: 'https://via.placeholder.com/300x400?text=Progress+Photo+3',
          photo_type: 'front',
          caption: 'Current progress',
          taken_at: todayISO()
        }
      ])
      
      setLoading(false)
      return
    }
    */
    
    try {
      const { data: mData } = await supabase
        .from('measurements')
        .select('*')
        .eq('client_id', profile.id)
        .order('logged_at', { ascending: true })
      setMeasurements(mData || [])

      const { data: pData } = await supabase
        .from('progress_photos')
        .select('*')
        .eq('client_id', profile.id)
        .order('taken_at', { ascending: false })
      setPhotos(pData || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddMeasurement = async () => {
    if (!profile || !measurementWeight.trim()) return
    setSaving(true)
    try {
      const data: any = { client_id: profile.id }
      if (measurementWeight.trim()) {
        data.body_weight = parseFloat(measurementWeight)
      }
      await supabase.from('measurements').insert(data)
      await addActivityEvent(profile.id, null, 'measurement_logged', 'Logged new measurements')
      setShowAddMeasurement(false)
      setMeasurementWeight('')
      loadData()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleAddPhoto = async () => {
    if (!profile || !photoUrl.trim()) return
    setSaving(true)
    try {
      await supabase.from('progress_photos').insert({
        client_id: profile.id,
        photo_url: photoUrl,
        photo_type: photoType,
        caption: photoCaption || null,
        taken_at: todayISO(),
      })
      await addActivityEvent(profile.id, null, 'photo_uploaded', 'Uploaded a progress photo')
      setShowAddPhoto(false)
      setPhotoUrl('')
      setPhotoCaption('')
      setPhotoType('front')
      loadData()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm('Delete this photo?')) return
    await supabase.from('progress_photos').delete().eq('id', photoId)
    loadData()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size={40} />
      </div>
    )
  }

  // Weight data
  const weightData = measurements
    .filter(m => m.body_weight)
    .map((m, index) => ({
      week: `Week ${index + 1}`,
      value: m.body_weight,
    }))

  const lastWeight = measurements.filter(m => m.body_weight).pop()?.body_weight
  const firstWeight = measurements.find(m => m.body_weight)?.body_weight
  const weightChange = firstWeight && lastWeight ? lastWeight - firstWeight : null

  // Goals (simulated for MVP)
  const goals = [
    { id: 1, title: 'Build upper body strength', exercises: 15, progress: 37, color: 'coral' },
    { id: 2, title: 'Improve core stability', exercises: 10, progress: 83, color: 'lavender' },
    { id: 3, title: 'Increase endurance', exercises: 12, progress: 65, color: 'mint' },
  ]

  const categories = [
    { id: 'weight', label: 'Weight' },
    { id: 'goals', label: 'Goals' },
  ]

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[.14em] text-[#93a84e]">Your results</p>
          <h1 className="font-display text-4xl font-semibold tracking-tight text-[#25342d]">Progress</h1>
          <p className="mt-2 text-sm text-[#7c857c]">Track your fitness journey.</p>
        </div>
        <button
          onClick={() => setShowAddMeasurement(true)}
          className="flex w-fit items-center gap-2 rounded-xl bg-[#25342d] px-4 py-3 text-xs font-semibold text-white"
        >
          <Plus className="size-4" />Log measurement
        </button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
        <section className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl font-semibold text-[#25342d]">Weight progress</h2>
              <p className="mt-1 text-xs text-[#929990]">Last 8 weeks</p>
            </div>
            <button onClick={() => alert('Time range selector coming soon! Currently showing 8 weeks.')} className="rounded-lg border border-[#e5e7dd] px-3 py-2 text-xs text-[#69746a] hover:bg-[#f8f8f4] transition">8 weeks⌄</button>
          </div>
          <div className="mt-8 flex h-44 items-end gap-3 border-b border-[#eceee5] px-2">
            {measurements.slice(-10).map((m, i) => {
              const weight = m.body_weight
              const normalizedWeight = weight ? Math.min(Math.max((weight - 60) / 40 * 100, 20), 95) : 30
              return (
                <div key={i} className="flex flex-1 items-end">
                  <div
                    className="w-full rounded-t-md bg-[#b9cd69] transition-all hover:bg-[#a5bd55]"
                    style={{ height: `${normalizedWeight}%` }}
                  />
                </div>
              )
            })}
          </div>
          <div className="mt-3 flex justify-between text-[10px] text-[#a1a8a0]">
            <span>May</span>
            <span>Jun</span>
            <span>Jul</span>
            <span>Aug</span>
          </div>
          {lastWeight && (
            <div className="mt-6 flex items-center justify-between rounded-xl bg-[#f8f8f4] p-4">
              <div>
                <p className="text-xs text-[#969f96]">Current weight</p>
                <p className="text-lg font-semibold text-[#25342d]">{lastWeight}kg</p>
              </div>
              <span className={`text-xs font-semibold ${
                weightChange && weightChange < 0 ? 'text-[#718b33]' : 'text-[#ad784b]'
              }`}>
                {weightChange && weightChange < 0 ? '↓' : weightChange && weightChange > 0 ? '↑' : ''} {weightChange ? Math.abs(weightChange).toFixed(1) : '0'}kg
              </span>
            </div>
          )}
        </section>

        <section className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl font-semibold text-[#25342d]">Progress photos</h2>
              <p className="mt-1 text-xs text-[#929990]">Visual progress over time</p>
            </div>
            <button
              onClick={() => setShowAddPhoto(true)}
              className="flex items-center gap-2 rounded-lg border border-[#e5e7dd] px-3 py-2 text-xs text-[#69746a]"
            >
              <Camera className="size-4" />Add
            </button>
          </div>
          {photos.length > 0 ? (
            <div className="mt-6 grid grid-cols-2 gap-4">
              {photos.slice(0, 4).map((photo) => (
                <div key={photo.id} className="aspect-square bg-[#f8f8f4] rounded-2xl overflow-hidden relative group">
                  <img
                    src={photo.photo_url}
                    alt={photo.caption || 'Progress photo'}
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => handleDeletePhoto(photo.id)}
                    className="absolute top-2 right-2 grid size-8 place-items-center rounded-full bg-white/80 text-[#8b4a4a] opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6 flex items-center justify-center rounded-xl bg-[#f8f8f4] p-8">
              <p className="text-sm text-[#969f96]">No photos yet</p>
            </div>
          )}
        </section>
      </div>

      <section className="card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold text-[#25342d]">All measurements</h2>
            <p className="mt-1 text-xs text-[#929990]">Complete measurement history</p>
          </div>
        </div>
        <div className="mt-6 space-y-3">
          {measurements.length > 0 ? (
            [...measurements].reverse().slice(0, 5).map((m) => (
              <div key={m.id} className="flex items-center gap-4 rounded-xl border border-[#edf0e8] p-4">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#edf3d5] text-[#718b33]">
                  <TrendingUp className="size-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[#3d4b40]">{m.body_weight}kg</p>
                  <p className="text-xs text-[#969f96]">{formatDate(m.logged_at)}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="flex items-center justify-center rounded-xl bg-[#f8f8f4] p-8">
              <p className="text-sm text-[#969f96]">No measurements logged yet</p>
            </div>
          )}
        </div>
      </section>

      {/* Add Measurement Modal */}
      {showAddMeasurement && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50">
          <div className="card p-6 max-w-sm w-full">
            <h2 className="font-display text-xl font-semibold text-[#25342d] mb-6">Log measurement</h2>
            <div className="space-y-4">
              <div>
                <label className="label">Weight (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={measurementWeight}
                  onChange={(e) => setMeasurementWeight(e.target.value)}
                  className="input"
                  placeholder="0"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddMeasurement(false)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleAddMeasurement}
                disabled={saving || !measurementWeight.trim()}
                className="btn-primary flex-1"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Photo Modal */}
      {showAddPhoto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50">
          <div className="card p-6 max-w-sm w-full">
            <h2 className="font-display text-xl font-semibold text-[#25342d] mb-6">Add progress photo</h2>
            <div className="space-y-4">
              <div>
                <label className="label">Photo URL</label>
                <input
                  type="url"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  placeholder="https://..."
                  className="input"
                />
              </div>
              <div>
                <label className="label">Type</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['front', 'side', 'back', 'other'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setPhotoType(type)}
                      className={`py-2 text-[10px] font-semibold uppercase tracking-[.12em] rounded-xl ${
                        photoType === type ? 'bg-[#25342d] text-white' : 'bg-[#f0f1eb] text-[#8d978d]'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Caption</label>
                <input
                  type="text"
                  value={photoCaption}
                  onChange={(e) => setPhotoCaption(e.target.value)}
                  placeholder="Week 1..."
                  className="input"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddPhoto(false)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleAddPhoto}
                disabled={saving || !photoUrl.trim()}
                className="btn-primary flex-1"
              >
                {saving ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
