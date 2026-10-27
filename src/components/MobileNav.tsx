import { LayoutDashboard, Users, Dumbbell, TrendingUp, UserRound, Settings } from 'lucide-react'

type Role = 'trainer' | 'client'
type Screen = 'dashboard' | 'clients' | 'client-detail' | 'plans' | 'builder' | 'progress' | 'workouts' | 'profile' | 'session'

interface MobileNavProps {
  role: Role
  screen: Screen
  setScreen: (s: Screen) => void
}

const trainerNav = [
  { id: 'dashboard' as Screen, label: 'Overview', icon: LayoutDashboard },
  { id: 'clients' as Screen, label: 'Clients', icon: Users },
  { id: 'plans' as Screen, label: 'Plans', icon: Dumbbell },
  { id: 'profile' as Screen, label: 'Profile', icon: UserRound },
]

const clientNav = [
  { id: 'dashboard' as Screen, label: 'Today', icon: LayoutDashboard },
  { id: 'workouts' as Screen, label: 'Workouts', icon: Dumbbell },
  { id: 'progress' as Screen, label: 'Progress', icon: TrendingUp },
  { id: 'profile' as Screen, label: 'Profile', icon: UserRound },
]

export default function MobileNav({ role, screen, setScreen }: MobileNavProps) {
  const items = role === 'trainer' ? trainerNav : clientNav

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#d9e9f2] px-4 py-2 z-50">
      <div className="flex items-center justify-around">
        {items.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setScreen(id)}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition ${
              screen === id
                ? 'text-[#0f2a3a]'
                : 'text-[#94a3b8]'
            }`}
          >
            <Icon className="size-5" />
            <span className="text-[10px] font-medium">{label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}