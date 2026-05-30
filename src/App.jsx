import { useState, useCallback } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import useKeyboardShortcuts    from './hooks/useKeyboardShortcuts'
import useCompetitorAlerts     from './hooks/useCompetitorAlerts'
import AuthScreen from './pages/AuthScreen'
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
import ShortcutsModal from './components/ShortcutsModal'
import ErrorBoundary from './components/ErrorBoundary'

function Router() {
  const { user, loading } = useAuth()

  const [showShortcuts, setShowShortcuts] = useState(false)
  const handleShowShortcuts = useCallback(() => setShowShortcuts(true), [])

  // Register global keyboard shortcuts (harmless when logged out)
  useKeyboardShortcuts(handleShowShortcuts)

  // Smart competitor alerts — polls RSS every 20 min, no-ops when not logged in
  useCompetitorAlerts()

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

  // Authenticated — go straight to the dashboard, no onboarding gate
  return (
    <div className="app">
      <SideNav onShowShortcuts={handleShowShortcuts} />
      <div className="app-main">
        <Routes>
          <Route path="/"                  element={<Navigate to="/pulse/home" replace />} />
          <Route path="/pulse/home"        element={<Home />} />
          <Route path="/pulse/today"       element={<PulseToday />} />
          <Route path="/pulse/peers"       element={<PulsePeers />} />
          <Route path="/pulse/competitors" element={<Rivals />} />
          <Route path="/pulse/history"     element={<PulseHistory />} />
          <Route path="/pulse/profile"     element={<Profile />} />
          <Route path="/pulse/settings"    element={<Settings />} />
          <Route path="/connect"           element={<ConnectChannel />} />
          <Route path="/competitors"       element={<Competitors />} />
          <Route path="*"                  element={<Navigate to="/" replace />} />
        </Routes>
      </div>

      {/* Global shortcuts modal */}
      {showShortcuts && (
        <ShortcutsModal onClose={() => setShowShortcuts(false)} />
      )}
    </div>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
