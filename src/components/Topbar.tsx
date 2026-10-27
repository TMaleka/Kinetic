import { useEffect, useState } from 'react';
import { CircleHelp, Bell, ChevronRight, LogOut, X } from 'lucide-react';
import { Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatRelative, getInitials } from '../lib/queries';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  subscribeToNotifications,
  type Notification,
} from '../lib/notifications';
import { Modal } from './ui';

type Role = 'trainer' | 'client';
type Screen = 'dashboard' | 'clients' | 'client-detail' | 'plans' | 'builder' | 'progress' | 'workouts' | 'profile' | 'session';

interface TopbarProps {
  role: Role;
  setScreen: (s: Screen) => void;
}

const HELP: Record<Role, { title: string; body: string }[]> = {
  trainer: [
    { title: 'Invite clients', body: 'Go to Clients → Invite client. Share the invite code with your client; they accept it from their Profile page after signing up with the same email.' },
    { title: 'Build a plan', body: 'Workout plans → Create plan. Add days and exercises, then either assign it to a client straight away or save it as a template.' },
    { title: 'Assign workouts', body: 'Open a client and click "Assign workout". Keep "Schedule sessions automatically" ticked so the workouts appear on the client\'s calendar.' },
    { title: 'Review goals', body: 'New clients\' onboarding goals appear on your Overview under "Pending goal reviews".' },
  ],
  client: [
    { title: 'Connect with a trainer', body: 'Ask your trainer to invite you using the email you signed up with. Pending invitations show on your Profile page.' },
    { title: 'Do a workout', body: 'Open Workouts (or Today) and tap a scheduled session. Log your reps and weight, tick each set, then complete the workout.' },
    { title: 'Track progress', body: 'Use My progress to log your weight and add progress photos. Your trainer can see these too.' },
  ],
};

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid size-8 place-items-center rounded-[11px] bg-[#ff4f1f] text-[#ffd23f]">
        <Sparkles className="size-4" />
      </div>
      <span className="font-display text-[19px] font-semibold tracking-tight text-[#1c1446]">
        kinetic<span className="text-[#ff4f1f]">.</span>
      </span>
    </div>
  );
}

function Avatar({ initials, className = '' }: { initials: string; className?: string }) {
  return (
    <div className={`grid size-9 shrink-0 place-items-center rounded-full bg-[#ddd6fe] text-xs font-semibold text-[#5b21b6] ${className}`}>
      {initials}
    </div>
  );
}

export default function Topbar({ role, setScreen }: TopbarProps) {
  const { profile, signOut } = useAuth()
  const [showHelp, setShowHelp] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])

  useEffect(() => {
    if (!profile) return
    let active = true
    fetchNotifications(profile.id)
      .then((data) => active && setNotifications(data || []))
      .catch((err) => console.error('Failed to load notifications:', err))
    const channelPromise = subscribeToNotifications(profile.id, (n) => {
      setNotifications((prev) => [n, ...prev])
    })
    return () => {
      active = false
      channelPromise.then((channel) => channel.unsubscribe())
    }
  }, [profile])

  const unreadCount = notifications.filter((n) => !n.read).length

  const handleMarkRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    try {
      await markNotificationRead(id)
    } catch (err) {
      console.error(err)
    }
  }

  const handleMarkAllRead = async () => {
    if (!profile) return
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    try {
      await markAllNotificationsRead(profile.id)
    } catch (err) {
      console.error(err)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    window.location.href = '/auth'
  }

  const initials = profile ? getInitials(profile.full_name) : '?'
  const userName = profile?.full_name || 'User'

  return (
    <header className="topbar">
      <div className="flex items-center gap-3">
        <div className="lg:hidden">
          <Logo />
        </div>
        <div className="hidden items-center gap-2 text-xs text-[#94a3b8] md:flex">
          <span>Workspace</span>
          <ChevronRight className="size-3" />
          <span className="text-[#334155]">{role === 'trainer' ? 'Trainer overview' : 'My space'}</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => setShowHelp(true)}
          aria-label="Help"
          className="hidden size-9 place-items-center rounded-full border border-[#f3dccf] text-[#64748b] hover:bg-[#ffe6d8] sm:grid"
        >
          <CircleHelp className="size-4" />
        </button>
        <div className="relative">
          <button
            onClick={() => setShowNotifications((v) => !v)}
            aria-label="Notifications"
            className="relative grid size-9 place-items-center rounded-full border border-[#f3dccf] text-[#64748b] hover:bg-[#ffe6d8]"
          >
            <Bell className="size-4" />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 grid min-w-[16px] place-items-center rounded-full bg-[#ff4f1f] px-1 text-[9px] font-bold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          {showNotifications && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
              <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-[#f3dccf] bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-[#f1e4da] p-4">
                  <h3 className="font-display text-sm font-semibold text-[#1c1446]">Notifications</h3>
                  <div className="flex items-center gap-3">
                    {unreadCount > 0 && (
                      <button onClick={handleMarkAllRead} className="text-xs font-semibold text-[#7c3aed]">
                        Mark all read
                      </button>
                    )}
                    <button onClick={() => setShowNotifications(false)} aria-label="Close" className="text-[#94a3b8]">
                      <X className="size-4" />
                    </button>
                  </div>
                </div>
                <div className="max-h-[60vh] overflow-y-auto">
                  {notifications.length ? (
                    notifications.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => !n.read && handleMarkRead(n.id)}
                        className={`flex w-full items-start gap-3 border-b border-[#f1f5f9] p-4 text-left last:border-0 hover:bg-[#fff4ec] ${
                          n.read ? '' : 'bg-[#fff1e8]'
                        }`}
                      >
                        <span className={`mt-1.5 size-2 shrink-0 rounded-full ${n.read ? 'bg-transparent' : 'bg-[#7c3aed]'}`} />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-[#1e293b]">{n.title}</span>
                          <span className="mt-0.5 block text-xs text-[#475569]">{n.message}</span>
                          <span className="mt-1 block text-[10px] text-[#94a3b8]">{formatRelative(n.created_at)}</span>
                        </span>
                      </button>
                    ))
                  ) : (
                    <p className="p-8 text-center text-sm text-[#64748b]">No notifications yet</p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
        <div className="ml-2 hidden h-8 w-px bg-[#f3dccf] sm:block" />
        <button
          onClick={() => setScreen('profile')}
          className="flex items-center gap-2 text-left"
        >
          <Avatar initials={initials} className="size-8" />
          <span className="hidden text-xs font-semibold text-[#1e293b] sm:block">
            {userName}
          </span>
        </button>
        <button
          onClick={handleSignOut}
          aria-label="Sign out"
          className="hidden size-9 place-items-center rounded-full border border-[#f3dccf] text-[#64748b] hover:bg-[#fee2e2] sm:grid"
        >
          <LogOut className="size-4" />
        </button>
      </div>

      <Modal open={showHelp} onClose={() => setShowHelp(false)} title="How KineTic works">
        <div className="space-y-4">
          {HELP[role].map((item) => (
            <div key={item.title} className="rounded-xl bg-[#fff4ec] p-4">
              <p className="text-sm font-semibold text-[#1c1446]">{item.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-[#475569]">{item.body}</p>
            </div>
          ))}
        </div>
      </Modal>
    </header>
  );
}
