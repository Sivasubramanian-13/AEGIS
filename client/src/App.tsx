
import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'

import SplashScreen from './components/SplashScreen'
import AppLayout from './layouts/AppLayout'

import SignIn from './pages/SignIn'
import Scan from './pages/Scan'
import Activity from './pages/Activity'
import Review from './pages/Review'
import Settings from './pages/Settings'
import UploadSession from './pages/UploadSession'
import ScanSession from './pages/ScanSession'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

export default function App() {
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading')

  useEffect(() => {
    let active = true

    const checkAuth = async () => {
      try {
        const response = await fetch(`${API_URL}/api/auth/me`, {
          credentials: 'include',
        })

        if (!active) return

        setAuthStatus(response.ok ? 'authenticated' : 'unauthenticated')
      } catch {
        if (active) setAuthStatus('unauthenticated')
      }
    }

    checkAuth()

    return () => {
      active = false
    }
  }, [])

  if (authStatus === 'loading') {
    return <SplashScreen />
  }

  return (
    <Routes>
      <Route
        path="/signin"
        element={
          authStatus === 'authenticated'
            ? <Navigate to="/" replace />
            : <SignIn />
        }
      />

      <Route
        element={
          authStatus === 'authenticated'
            ? <AppLayout />
            : <Navigate to="/signin" replace />
        }
      >
        <Route path="/" element={<Scan />} />
        <Route path="/activity" element={<Activity />} />
        <Route path="/review" element={<Review />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/scan-session" element={<ScanSession />} />
        <Route path="/upload-session" element={<UploadSession />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
