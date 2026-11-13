
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

export default function AppLayout() {
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
