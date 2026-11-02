import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { AuthPage } from './pages/auth/AuthPage'
import { ResetPasswordPage, RecoveryRedirect } from './pages/auth/ResetPasswordPage'
import { PrivacyPage } from './pages/legal/PrivacyPage'
import { ConsentGate } from './components/ConsentGate'
import { ErrorBoundary } from './components/ErrorBoundary'
import { hasConsented } from './lib/privacy'
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
import { ClientGoals } from './pages/client/ClientGoals'
import { ClientOnboarding } from './pages/onboarding/ClientOnboarding'

function ProtectedRoutes() {
  const { session, profile, loading } = useAuth()

  if (loading) return <LoadingPage />
  if (!profile) return <Navigate to="/auth" replace />
  if (!hasConsented(session)) return <ConsentGate />

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

  // Temporary: bypass onboarding for testing (remove this in production)
  const bypassOnboarding = false
  const showOnboarding = needsOnboarding && !bypassOnboarding

  return (
    <ClientLayout>
      <Routes>
        <Route path="/onboarding" element={<ClientOnboarding />} />
        <Route path="/app" element={showOnboarding ? <Navigate to="/onboarding" replace /> : <ClientDashboard />} />
        <Route path="/app/workouts" element={showOnboarding ? <Navigate to="/onboarding" replace /> : <ClientWorkouts />} />
        <Route path="/app/workouts/:sessionId" element={showOnboarding ? <Navigate to="/onboarding" replace /> : <WorkoutSession />} />
        <Route path="/app/goals" element={showOnboarding ? <Navigate to="/onboarding" replace /> : <ClientGoals />} />
        <Route path="/app/goals/edit" element={showOnboarding ? <Navigate to="/onboarding" replace /> : <ClientOnboarding mode="edit" />} />
        <Route path="/app/progress" element={showOnboarding ? <Navigate to="/onboarding" replace /> : <ClientProgress />} />
        <Route path="/app/profile" element={showOnboarding ? <Navigate to="/onboarding" replace /> : <ClientProfile />} />
        <Route path="*" element={<Navigate to={showOnboarding ? "/onboarding" : "/app"} replace />} />
      </Routes>
    </ClientLayout>
  )
}

export default function App() {
  const location = useLocation()
  return (
    <ErrorBoundary resetKey={location.pathname}>
      <AuthProvider>
        <RecoveryRedirect />
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/*" element={<ProtectedRoutes />} />
        </Routes>
      </AuthProvider>
    </ErrorBoundary>
  )
}
