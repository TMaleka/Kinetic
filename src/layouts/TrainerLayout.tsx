import { type ReactNode } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import MobileNav from '../components/MobileNav'

type Screen = 'dashboard' | 'clients' | 'client-detail' | 'plans' | 'builder' | 'progress' | 'workouts' | 'profile' | 'session'

export function TrainerLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const role: 'trainer' | 'client' = 'trainer'

  const getScreenFromPath = (): Screen => {
    const path = location.pathname
    if (path === '/trainer') return 'dashboard'
    if (path === '/trainer/clients') return 'clients'
    if (path.startsWith('/trainer/clients/')) return 'clients'
    if (path === '/trainer/plans') return 'plans'
    if (path.startsWith('/trainer/plans/')) return 'plans'
    if (path === '/trainer/profile') return 'profile'
    return 'dashboard'
  }

  const screen = getScreenFromPath()

  const handleScreenChange = (newScreen: Screen) => {
    switch (newScreen) {
      case 'dashboard':
        navigate('/trainer')
        break
      case 'clients':
        navigate('/trainer/clients')
        break
      case 'plans':
        navigate('/trainer/plans')
        break
      case 'builder':
        navigate('/trainer/plans/new')
        break
      case 'profile':
        navigate('/trainer/profile')
        break
      default:
        break
    }
  }

  return (
    <div className="min-h-screen bg-[#fffaf6] flex">
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
