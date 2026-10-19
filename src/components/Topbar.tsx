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
      <div className="grid size-8 place-items-center rounded-[11px] bg-[#25342d] text-[#e3f2af]">
        <Sparkles className="size-4" />
      </div>
      <span className="font-display text-[19px] font-semibold tracking-tight text-[#25342d]">
        kinetic<span className="text-[#91a947]">.</span>
      </span>
    </div>
  );
}

function Avatar({ initials, className = '' }: { initials: string; className?: string }) {
  return (
    <div className={`grid size-9 shrink-0 place-items-center rounded-full bg-[#e1d8ea] text-xs font-semibold text-[#4b3f58] ${className}`}>
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
        <div className="hidden items-center gap-2 text-xs text-[#9aa096] md:flex">
          <span>Workspace</span>
          <ChevronRight className="size-3" />
          <span className="text-[#4f594e]">{role === 'trainer' ? 'Trainer overview' : 'My space'}</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => setShowHelp(true)}
          aria-label="Help"
          className="hidden size-9 place-items-center rounded-full border border-[#e4e6dc] text-[#768076] hover:bg-[#eef0e7] sm:grid"
        >
          <CircleHelp className="size-4" />
        </button>
        <div className="relative">
          <button
            onClick={() => setShowNotifications((v) => !v)}
            aria-label="Notifications"
            className="relative grid size-9 place-items-center rounded-full border border-[#e4e6dc] text-[#768076] hover:bg-[#eef0e7]"
          >
            <Bell className="size-4" />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 grid min-w-[16px] place-items-center rounded-full bg-[#25342d] px-1 text-[9px] font-bold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          {showNotifications && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
              <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-[#e5e7dd] bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-[#eceee5] p-4">
                  <h3 className="font-display text-sm font-semibold text-[#25342d]">Notifications</h3>
                  <div className="flex items-center gap-3">
                    {unreadCount > 0 && (
                      <button onClick={handleMarkAllRead} className="text-xs font-semibold text-[#8aa143]">
                        Mark all read
                      </button>
                    )}
                    <button onClick={() => setShowNotifications(false)} aria-label="Close" className="text-[#9aa096]">
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
                        className={`flex w-full items-start gap-3 border-b border-[#f0f1eb] p-4 text-left last:border-0 hover:bg-[#f8f8f4] ${
                          n.read ? '' : 'bg-[#f6f9ea]'
                        }`}
                      >
                        <span className={`mt-1.5 size-2 shrink-0 rounded-full ${n.read ? 'bg-transparent' : 'bg-[#8aa143]'}`} />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-[#3d4b40]">{n.title}</span>
                          <span className="mt-0.5 block text-xs text-[#69746a]">{n.message}</span>
                          <span className="mt-1 block text-[10px] text-[#a1a8a0]">{formatRelative(n.created_at)}</span>
                        </span>
                      </button>
                    ))
                  ) : (
                    <p className="p-8 text-center text-sm text-[#969f96]">No notifications yet</p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
        <div className="ml-2 hidden h-8 w-px bg-[#e5e6dc] sm:block" />
        <button
          onClick={() => setScreen('profile')}
          className="flex items-center gap-2 text-left"
        >
          <Avatar initials={initials} className="size-8" />
          <span className="hidden text-xs font-semibold text-[#39463d] sm:block">
            {userName}
          </span>
        </button>
        <button
          onClick={handleSignOut}
          aria-label="Sign out"
          className="hidden size-9 place-items-center rounded-full border border-[#e4e6dc] text-[#768076] hover:bg-[#f5d5d5] sm:grid"
        >
          <LogOut className="size-4" />
        </button>
      </div>

      <Modal open={showHelp} onClose={() => setShowHelp(false)} title="How KineTic works">
        <div className="space-y-4">
          {HELP[role].map((item) => (
            <div key={item.title} className="rounded-xl bg-[#f8f8f4] p-4">
              <p className="text-sm font-semibold text-[#25342d]">{item.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-[#69746a]">{item.body}</p>
            </div>
          ))}
        </div>
      </Modal>
    </header>
  );
}
