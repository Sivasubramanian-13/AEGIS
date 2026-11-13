
import { History } from 'lucide-react'

export default function Activity() {
  return (
    <div className="page-container">
      <div className="page-heading">
        <div>
          <h1>Recent Activity</h1>
          <p>View your previous scanning jobs and downloads.</p>
        </div>
      </div>

      <div className="empty-state">
        <History size={32} />
        <h3>No recent activity</h3>
        <p>Your prescription scanning history will appear here.</p>
      </div>
    </div>
  )
}
