import { useEffect, useState } from 'react';
import { Target, LayoutDashboard, Users, Dumbbell, TrendingUp, UserRound, Settings } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getInitials } from '../lib/queries';

type Role = 'trainer' | 'client';
type Screen = 'dashboard' | 'goals' | 'clients' | 'client-detail' | 'plans' | 'builder' | 'progress' | 'workouts' | 'profile' | 'session';

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
  { id: 'goals' as Screen, label: 'My goals', icon: Target },
  { id: 'progress' as Screen, label: 'My progress', icon: TrendingUp },
  { id: 'workouts' as Screen, label: 'Workouts', icon: Dumbbell },
  { id: 'profile' as Screen, label: 'Profile', icon: UserRound },
];

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid size-8 place-items-center rounded-[11px] bg-[#075a38] text-[#68d6e8]">
        <Sparkles className="size-4" />
      </div>
      <span className="font-display text-[19px] font-semibold tracking-tight text-[#0f2a3a]">
        kinetic<span className="text-[#f3263a]">.</span>
      </span>
    </div>
  );
}

function Avatar({ initials, className = '' }: { initials: string; className?: string }) {
  return (
    <div className={`grid size-9 shrink-0 place-items-center rounded-full bg-[#d4f4f9] text-xs font-semibold text-[#0e7490] ${className}`}>
      {initials}
    </div>
  );
}

export default function Sidebar({ role, screen, setScreen }: SidebarProps) {
  const { profile } = useAuth()
  const items = role === 'trainer' ? nav : clientNav;
  const [clientCount, setClientCount] = useState<number | null>(null)

  useEffect(() => {
    if (role !== 'trainer' || !profile) return
    supabase
      .from('trainer_client_links')
      .select('id', { count: 'exact', head: true })
      .eq('trainer_id', profile.id)
      .eq('status', 'active')
      .then(({ count }) => setClientCount(count ?? 0))
  }, [role, profile])
  
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
                ? 'bg-[#28a9e8] text-white shadow-sm'
                : 'text-[#475569] hover:bg-[#e0f2fb]'
            }`}
          >
            <Icon className="size-[17px]" />
            {label}
            {id === 'clients' && clientCount !== null && clientCount > 0 && (
              <span className="ml-auto grid size-5 place-items-center rounded-md bg-[#d6f0e3] text-[10px] font-bold text-[#075a38]">
                {clientCount}
              </span>
            )}
          </button>
        ))}
      </div>
      <div className="mt-auto flex flex-col gap-1">
        <button 
          onClick={() => setScreen('profile')}
          className="flex items-center gap-3 rounded-xl px-3 py-3 text-[13px] font-medium text-[#475569] hover:bg-[#e0f2fb]"
        >
          <Settings className="size-[17px]" />
          Settings
        </button>
        <div className="mt-4 flex items-center gap-3 border-t border-[#d9e9f2] px-3 pt-5">
          <Avatar initials={initials} className="size-8" />
          <span className="flex-1">
            <span className="block text-[12px] font-semibold text-[#0f2a3a]">
              {userName}
            </span>
            <span className="block text-[11px] text-[#94a3b8]">
              {role === 'trainer' ? 'Trainer' : 'Client'}
            </span>
          </span>
        </div>
      </div>
    </aside>
  );
}
