import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { storage } from './storage'
import AuthScreen from './pages/AuthScreen'
import PulseOnboard from './pages/PulseOnboard'
import PulseToday from './pages/PulseToday'
import PulsePeers from './pages/PulsePeers'
import PulseHistory from './pages/PulseHistory'
import Profile from './pages/Profile'
import ResetPassword from './pages/ResetPassword'
import VerifyEmail from './pages/VerifyEmail'
import VerifyLogin from './pages/VerifyLogin'
import BottomNav from './components/BottomNav'

function Router() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="app">
        <div className="loading-screen">
          <div className="spinner" />
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="app">
        <Routes>
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email"   element={<VerifyEmail />} />
          <Route path="/verify-login"   element={<VerifyLogin />} />
          <Route path="*" element={<AuthScreen />} />
        </Routes>
      </div>
    )
  }

  if (!user.emailVerified) {
    return (
      <div className="app">
        <Routes>
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="*" element={<Navigate to="/verify-email" replace />} />
        </Routes>
      </div>
    )
  }

  const onboarded = storage.get('pulse_onboarded') === 'true'

  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<Navigate to={onboarded ? '/pulse/today' : '/pulse/onboard'} replace />} />
        <Route path="/pulse/onboard" element={<PulseOnboard />} />
        <Route path="/pulse/today"   element={onboarded ? <PulseToday />   : <Navigate to="/pulse/onboard" replace />} />
        <Route path="/pulse/peers"   element={onboarded ? <PulsePeers />   : <Navigate to="/pulse/onboard" replace />} />
        <Route path="/pulse/history" element={onboarded ? <PulseHistory /> : <Navigate to="/pulse/onboard" replace />} />
        <Route path="/pulse/profile" element={onboarded ? <Profile />     : <Navigate to="/pulse/onboard" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {onboarded && <BottomNav />}
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Router />
      </AuthProvider>
    </BrowserRouter>
  )
}
