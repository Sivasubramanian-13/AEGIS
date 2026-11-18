
import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  ScanLine,
  History,
  FileSpreadsheet,
  Settings,
  ShieldCheck,
} from 'lucide-react'

const navigation = [
  { name: 'Scan', path: '/', icon: ScanLine },
  { name: 'Activity', path: '/activity', icon: History },
  { name: 'Review', path: '/review', icon: FileSpreadsheet },
  { name: 'Settings', path: '/settings', icon: Settings },
]

type GoogleUser = {
  name: string
  email: string
  picture: string
}

const API_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:5000'

export default function AppLayout() {
  const [user, setUser] = useState<GoogleUser | null>(null)


  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch(`${API_URL}/api/auth/me`, {
          credentials: 'include',
        })

        if (!response.ok) {
          throw new Error('Unable to fetch Google profile')
        }

        const data = await response.json()
        setUser(data.user)
      } catch (error) {
        console.error('Profile loading error:', error)
      }
    }

    fetchProfile()
  }, [])

  return (
    <div className="app-shell">

      {/* Desktop Sidebar */}
      <aside className="sidebar">
        <div className="brand">
          <img src="/logo.png" alt="AEGIS" />
          <span>AEGIS</span>
        </div>

        <p className="nav-label">WORKSPACE</p>

        <nav className="sidebar-nav">
          {navigation.map((item) => {
            const Icon = item.icon

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `nav-item ${isActive ? 'active' : ''}`
                }
              >
                <Icon size={19} />
                <span>{item.name}</span>
              </NavLink>
            )
          })}
        </nav>

        <div className="sidebar-footer">
          <ShieldCheck size={17} />
          <span>Prescription Manager</span>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-area">
        <header className="top-header">

          <div className="mobile-brand">
            <img src="/logo.png" alt="AEGIS" />
            <span>AEGIS</span>
          </div>

          <div className="header-right">
            <span className="account-label">My Workspace</span>

            <div className="header-divider" />

            <div className="header-user">
              <div className="header-user-info">
                <span>Welcome back,</span>
                <strong>{user?.name || 'Loading...'}</strong>
              </div>

              {user?.picture ? (
                <img
                  src={user.picture}
                  alt="Profile"
                  className="header-avatar"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              ) : (
                <div className="header-avatar header-avatar-fallback">
                  {user?.name?.charAt(0).toUpperCase() || 'G'}
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="page-content">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-nav">
        {navigation.map((item) => {
          const Icon = item.icon

          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `mobile-nav-item ${isActive ? 'active' : ''}`
              }
            >
              <Icon size={21} />
              <span>{item.name}</span>
            </NavLink>
          )
        })}
      </nav>

    </div>
  )
}
