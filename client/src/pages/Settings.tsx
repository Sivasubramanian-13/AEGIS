
import { Settings as SettingsIcon } from 'lucide-react'

export default function Settings() {
  return (
    <div className="page-container">
      <div className="page-heading">
        <div>
          <h1>Settings</h1>
          <p>Manage your preferences and connected accounts.</p>
        </div>
      </div>

      <div className="empty-state">
        <SettingsIcon size={32} />
        <h3>Application settings</h3>
        <p>Theme, Google account, AI provider and account settings will appear here.</p>
      </div>
    </div>
  )
}
