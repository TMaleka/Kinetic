import { useEffect, useState } from 'react'
import { Plus, Camera, X, ChevronRight, Target, TrendingUp } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { Spinner } from '../../components/ui'
import { formatDate, addActivityEvent, todayISO, toLocalISO, addDays } from '../../lib/queries'
import { createNotification } from '../../lib/notifications'


export function ClientProgress() {
  const { profile } = useAuth()
  const [rangeWeeks, setRangeWeeks] = useState(8)
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
      const { error } = await supabase.from('measurements').insert(data)
      if (error) throw error
      await addActivityEvent(profile.id, null, 'measurement_logged', 'Logged new measurements')
      await notifyTrainer('measurement_logged', 'New measurement', `${profile.full_name} logged a weight of ${data.body_weight}kg.`)
      setShowAddMeasurement(false)
      setMeasurementWeight('')
      loadData()
    } catch (err: any) {
      console.error(err)
      alert(`Failed to save measurement: ${err?.message || 'Unknown error'}`)
    } finally {
      setSaving(false)
    }
  }

  const notifyTrainer = async (type: 'measurement_logged' | 'photo_uploaded', title: string, message: string) => {
    if (!profile) return
    const { data: link } = await supabase
      .from('trainer_client_links')
      .select('trainer_id')
      .eq('client_id', profile.id)
      .eq('status', 'active')
      .limit(1)
    if (link?.[0]?.trainer_id) await createNotification(link[0].trainer_id, type, title, message)
  }

  const handleAddPhoto = async () => {
    if (!profile || !photoUrl.trim()) return
    setSaving(true)
    try {
      const { error } = await supabase.from('progress_photos').insert({
        client_id: profile.id,
        photo_url: photoUrl,
        photo_type: photoType,
        caption: photoCaption || null,
        taken_at: todayISO(),
      })
      if (error) throw error
      await addActivityEvent(profile.id, null, 'photo_uploaded', 'Uploaded a progress photo')
      await notifyTrainer('photo_uploaded', 'New progress photo', `${profile.full_name} uploaded a progress photo.`)
      setShowAddPhoto(false)
      setPhotoUrl('')
      setPhotoCaption('')
      setPhotoType('front')
      loadData()
    } catch (err: any) {
      console.error(err)
      alert(`Failed to add photo: ${err?.message || 'Unknown error'}`)
    } finally {
      setSaving(false)
    }
  }

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm('Delete this photo?')) return
    const { error } = await supabase.from('progress_photos').delete().eq('id', photoId)
    if (error) alert(`Failed to delete photo: ${error.message}`)
    loadData()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size={40} />
      </div>
    )
  }

  const rangeStart = toLocalISO(addDays(new Date(), -7 * rangeWeeks))
  const weightPoints = measurements.filter((m) => m.body_weight && m.logged_at.slice(0, 10) >= rangeStart)
  const weights = weightPoints.map((m) => Number(m.body_weight))
  const minWeight = weights.length ? Math.min(...weights) : 0
  const maxWeight = weights.length ? Math.max(...weights) : 0
  const spread = Math.max(maxWeight - minWeight, 1)

  const lastWeight = measurements.filter(m => m.body_weight).pop()?.body_weight
  const firstWeight = measurements.find(m => m.body_weight)?.body_weight
  const weightChange = firstWeight && lastWeight ? lastWeight - firstWeight : null

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
              <p className="mt-1 text-xs text-[#929990]">Last {rangeWeeks} weeks</p>
            </div>
            <select
              value={rangeWeeks}
              onChange={(e) => setRangeWeeks(Number(e.target.value))}
              className="rounded-lg border border-[#e5e7dd] bg-white px-3 py-2 text-xs text-[#69746a] outline-none hover:bg-[#f8f8f4]"
            >
              {[4, 8, 12, 26, 52].map((w) => (
                <option key={w} value={w}>{w} weeks</option>
              ))}
            </select>
          </div>
          {weightPoints.length > 0 ? (
            <>
              <div className="mt-8 flex h-44 items-end gap-2 border-b border-[#eceee5] px-2">
                {weightPoints.map((m) => (
                  <div key={m.id} className="flex h-full flex-1 items-end" title={`${formatDate(m.logged_at)}: ${m.body_weight}kg`}>
                    <div
                      className="w-full rounded-t-md bg-[#b9cd69] transition-all hover:bg-[#a5bd55]"
                      style={{ height: `${25 + ((Number(m.body_weight) - minWeight) / spread) * 70}%` }}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-3 flex justify-between text-[10px] text-[#a1a8a0]">
                <span>{formatDate(weightPoints[0].logged_at)}</span>
                {weightPoints.length > 1 && <span>{formatDate(weightPoints[weightPoints.length - 1].logged_at)}</span>}
              </div>
            </>
          ) : (
            <div className="mt-8 flex h-44 items-center justify-center rounded-xl bg-[#f8f8f4]">
              <p className="text-sm text-[#969f96]">No weight logged in the last {rangeWeeks} weeks</p>
            </div>
          )}
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
              {photos.map((photo) => (
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
            [...measurements].reverse().map((m) => (
              <div key={m.id} className="flex items-center gap-4 rounded-xl border border-[#edf0e8] p-4">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#edf3d5] text-[#718b33]">
                  <TrendingUp className="size-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[#3d4b40]">
                    {[m.body_weight && `${m.body_weight}kg`, m.chest && `Chest ${m.chest}cm`, m.waist && `Waist ${m.waist}cm`].filter(Boolean).join(' · ') || 'Measurement'}
                  </p>
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
