import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { AuthPage } from './pages/auth/AuthPage'
import { TrainerLayout } from './layouts/TrainerLayout'
import { ClientLayout } from './layouts/ClientLayout'
import { LoadingPage } from './components/ui'
import { TrainerDashboard } from './pages/trainer/TrainerDashboard'
import { TrainerClients } from './pages/trainer/TrainerClients'
import { TrainerProfile } from './pages/trainer/TrainerProfile'
import { ClientDetail } from './pages/trainer/ClientDetail'
import { WorkoutPlans } from './pages/trainer/WorkoutPlans'
import { PlanBuilder } from './pages/trainer/PlanBuilder'
import { ClientDashboard } from './pages/client/ClientDashboard'
import { ClientWorkouts } from './pages/client/ClientWorkouts'
import { WorkoutSession } from './pages/client/WorkoutSession'
import { ClientProgress } from './pages/client/ClientProgress'
import { ClientProfile } from './pages/client/ClientProfile'
import { ClientOnboarding } from './pages/onboarding/ClientOnboarding'

function ProtectedRoutes() {
  const { profile, loading } = useAuth()

  if (loading) return <LoadingPage />
  if (!profile) return <Navigate to="/auth" replace />

  if (profile.role === 'trainer') {
    return (
      <TrainerLayout>
        <Routes>
          <Route path="/trainer" element={<TrainerDashboard />} />
          <Route path="/trainer/clients" element={<TrainerClients />} />
          <Route path="/trainer/clients/:clientId" element={<ClientDetail />} />
          <Route path="/trainer/plans" element={<WorkoutPlans />} />
          <Route path="/trainer/plans/:planId/edit" element={<PlanBuilder />} />
          <Route path="/trainer/plans/new" element={<PlanBuilder />} />
          <Route path="/trainer/profile" element={<TrainerProfile />} />
          <Route path="*" element={<Navigate to="/trainer" replace />} />
        </Routes>
      </TrainerLayout>
    )
  }

  // Check if client needs onboarding
  const needsOnboarding = !profile.onboarding_completed
  const showOnboarding = needsOnboarding

  return (
    <ClientLayout>
      <Routes>
        <Route path="/onboarding" element={<ClientOnboarding />} />
        <Route path="/app" element={showOnboarding ? <Navigate to="/onboarding" replace /> : <ClientDashboard />} />
        <Route path="/app/workouts" element={showOnboarding ? <Navigate to="/onboarding" replace /> : <ClientWorkouts />} />
        <Route path="/app/workouts/:sessionId" element={showOnboarding ? <Navigate to="/onboarding" replace /> : <WorkoutSession />} />
        <Route path="/app/progress" element={showOnboarding ? <Navigate to="/onboarding" replace /> : <ClientProgress />} />
        <Route path="/app/profile" element={showOnboarding ? <Navigate to="/onboarding" replace /> : <ClientProfile />} />
        <Route path="*" element={<Navigate to={showOnboarding ? "/onboarding" : "/app"} replace />} />
      </Routes>
    </ClientLayout>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/*" element={<ProtectedRoutes />} />
      </Routes>
    </AuthProvider>
  )
}
