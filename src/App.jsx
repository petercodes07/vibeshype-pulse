import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { storage } from './storage'
import AuthScreen from './pages/AuthScreen'
import PulseOnboard from './pages/PulseOnboard'
import Home from './pages/Home'
import PulseToday from './pages/PulseToday'
import PulsePeers from './pages/PulsePeers'
import PulseHistory from './pages/PulseHistory'
import Profile from './pages/Profile'
import ResetPassword from './pages/ResetPassword'
import VerifyLogin from './pages/VerifyLogin'
import ConnectChannel from './pages/ConnectChannel'
import Competitors from './pages/Competitors'
import Rivals from './pages/Rivals'
import Settings from './pages/Settings'
import SideNav from './components/SideNav'
import ErrorBoundary from './components/ErrorBoundary'

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
        <div className="app-main">
          <Routes>
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/verify-login"   element={<VerifyLogin />} />
            <Route path="*" element={<AuthScreen />} />
          </Routes>
        </div>
      </div>
    )
  }

  const onboarded = storage.get('pulse_onboarded') === 'true'

  return (
    <div className="app">
      {onboarded && <SideNav />}
      <div className="app-main">
        <Routes>
          <Route path="/" element={<Navigate to={onboarded ? '/pulse/home' : '/pulse/onboard'} replace />} />
          <Route path="/pulse/onboard"  element={<PulseOnboard />} />
          <Route path="/pulse/home"     element={onboarded ? <Home />         : <Navigate to="/pulse/onboard" replace />} />
          <Route path="/pulse/today"    element={onboarded ? <PulseToday />   : <Navigate to="/pulse/onboard" replace />} />
          <Route path="/pulse/peers"    element={onboarded ? <PulsePeers />   : <Navigate to="/pulse/onboard" replace />} />
          <Route path="/pulse/competitors" element={onboarded ? <Rivals />       : <Navigate to="/pulse/onboard" replace />} />
          <Route path="/pulse/history"  element={onboarded ? <PulseHistory /> : <Navigate to="/pulse/onboard" replace />} />
          <Route path="/pulse/profile"  element={onboarded ? <Profile />      : <Navigate to="/pulse/onboard" replace />} />
          <Route path="/pulse/settings" element={onboarded ? <Settings />     : <Navigate to="/pulse/onboard" replace />} />
          <Route path="/connect"        element={<ConnectChannel />} />
          <Route path="/competitors"    element={<Competitors />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <Router />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
