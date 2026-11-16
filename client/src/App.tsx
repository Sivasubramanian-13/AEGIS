
import { useEffect, useState } from 'react'
import { Routes, Route } from 'react-router-dom'

import SplashScreen from './components/SplashScreen'
import AppLayout from './layouts/AppLayout'

import Scan from './pages/Scan'
import Activity from './pages/Activity'
import Review from './pages/Review'
import Settings from './pages/Settings'
import UploadSession from './pages/UploadSession'
import ScanSession from './pages/ScanSession'

export default function App() {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false)
    }, 1500)

    return () => clearTimeout(timer)
  }, [])

  if (loading) {
    return <SplashScreen />
  }


  return (
    <Routes>
      <Route path="/scan-session" element={<ScanSession />} />
      <Route path="/upload-session" element={<UploadSession />} />

      <Route element={<AppLayout />}>
        <Route path="/" element={<Scan />} />
        <Route path="/activity" element={<Activity />} />
        <Route path="/review" element={<Review />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
  )

}
