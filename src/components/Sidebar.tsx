import { LayoutDashboard, Users, Dumbbell, TrendingUp, UserRound, Settings, ChevronRight } from 'lucide-react';
import { Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getInitials } from '../lib/queries';

type Role = 'trainer' | 'client';
type Screen = 'dashboard' | 'clients' | 'client-detail' | 'plans' | 'builder' | 'progress' | 'workouts' | 'profile' | 'session';

interface SidebarProps {
  role: Role;
  screen: Screen;
  setScreen: (s: Screen) => void;
}

const nav = [
  { id: 'dashboard' as Screen, label: 'Overview', icon: LayoutDashboard },
  { id: 'clients' as Screen, label: 'Clients', icon: Users },
  { id: 'plans' as Screen, label: 'Workout plans', icon: Dumbbell },
  { id: 'profile' as Screen, label: 'Profile', icon: UserRound },
];

const clientNav = [
  { id: 'dashboard' as Screen, label: 'Today', icon: LayoutDashboard },
  { id: 'progress' as Screen, label: 'My progress', icon: TrendingUp },
  { id: 'workouts' as Screen, label: 'Workouts', icon: Dumbbell },
  { id: 'profile' as Screen, label: 'Profile', icon: UserRound },
];

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

export default function Sidebar({ role, screen, setScreen }: SidebarProps) {
  const { profile } = useAuth()
  const items = role === 'trainer' ? nav : clientNav;
  
  const initials = profile ? getInitials(profile.full_name) : '?'
  const userName = profile?.full_name || 'User'

  return (
    <aside className="sidebar">
      <Logo />
      <div className="mt-14 flex flex-col gap-1">
        {items.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setScreen(id)}
            className={`flex items-center gap-3 rounded-xl px-3 py-3 text-left text-[13px] font-medium transition ${
              screen === id
                ? 'bg-[#25342d] text-white shadow-sm'
                : 'text-[#7a8178] hover:bg-[#eef0e7]'
            }`}
          >
            <Icon className="size-[17px]" />
            {label}
            {id === 'clients' && (
              <span className="ml-auto grid size-5 place-items-center rounded-md bg-[#e5edbf] text-[10px] font-bold text-[#52602f]">
                4
              </span>
            )}
          </button>
        ))}
      </div>
      <div className="mt-auto flex flex-col gap-1">
        <button 
          onClick={() => setScreen('profile')}
          className="flex items-center gap-3 rounded-xl px-3 py-3 text-[13px] font-medium text-[#7a8178] hover:bg-[#eef0e7]"
        >
          <Settings className="size-[17px]" />
          Settings
        </button>
        <div className="mt-4 flex items-center gap-3 border-t border-[#e6e7dc] px-3 pt-5">
          <Avatar initials={initials} className="size-8" />
          <span className="flex-1">
            <span className="block text-[12px] font-semibold text-[#25342d]">
              {userName}
            </span>
            <span className="block text-[11px] text-[#92988f]">
              {role === 'trainer' ? 'Trainer' : 'Client'}
            </span>
          </span>
        </div>
      </div>
    </aside>
  );
}
