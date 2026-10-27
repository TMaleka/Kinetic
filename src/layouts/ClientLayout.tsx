import { type ReactNode } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import MobileNav from '../components/MobileNav'

type Screen = 'dashboard' | 'workouts' | 'session' | 'progress' | 'profile' | 'clients' | 'client-detail' | 'plans' | 'builder'

export function ClientLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const role: 'trainer' | 'client' = 'client'

  const getScreenFromPath = (): Screen => {
    const path = location.pathname
    if (path === '/app') return 'dashboard'
    if (path === '/app/workouts') return 'workouts'
    if (path.startsWith('/app/workouts/')) return 'session'
    if (path === '/app/progress') return 'progress'
    if (path === '/app/profile') return 'profile'
    if (path === '/onboarding') return 'dashboard'
    return 'dashboard'
  }

  const screen = getScreenFromPath()

  const handleScreenChange = (newScreen: Screen) => {
    switch (newScreen) {
      case 'dashboard':
        navigate('/app')
        break
      case 'workouts':
        navigate('/app/workouts')
        break
      case 'progress':
        navigate('/app/progress')
        break
      case 'profile':
        navigate('/app/profile')
        break
      default:
        break
    }
  }

  return (
    <div className="min-h-screen bg-[#f7fbfd] flex">
      <Sidebar role={role} screen={screen} setScreen={handleScreenChange} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar role={role} setScreen={handleScreenChange} />
        <div className="flex-1 px-5 py-8 lg:px-10 lg:py-10 pb-24 lg:pb-10">
          <div className="mx-auto max-w-[1120px]">
            {children}
          </div>
        </div>
      </div>
      <MobileNav role={role} screen={screen} setScreen={handleScreenChange} />
    </div>
  )
}
