import { CircleHelp, Bell, ChevronRight, LogOut } from 'lucide-react';
import { Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getInitials } from '../lib/queries';

type Role = 'trainer' | 'client';
type Screen = 'dashboard' | 'clients' | 'client-detail' | 'plans' | 'builder' | 'progress' | 'workouts' | 'profile' | 'session';

interface TopbarProps {
  role: Role;
  setScreen: (s: Screen) => void;
}

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
          aria-label="Help"
          className="hidden size-9 place-items-center rounded-full border border-[#e4e6dc] text-[#768076] sm:grid"
        >
          <CircleHelp className="size-4" />
        </button>
        <button
          aria-label="Notifications"
          className="relative grid size-9 place-items-center rounded-full border border-[#e4e6dc] text-[#768076]"
        >
          <Bell className="size-4" />
          <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-[#c0d568]" />
        </button>
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
          className="hidden grid size-9 place-items-center rounded-full border border-[#e4e6dc] text-[#768076] hover:bg-[#f5d5d5] sm:grid"
        >
          <LogOut className="size-4" />
        </button>
      </div>
    </header>
  );
}
