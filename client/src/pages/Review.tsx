
import { FileSpreadsheet } from 'lucide-react'

export default function Review() {
  return (
    <div className="page-container">
      <div className="page-heading">
        <div>
          <h1>Review Sheet</h1>
          <p>Review and correct extracted prescription details.</p>
        </div>
      </div>

      <div className="empty-state">
        <FileSpreadsheet size={32} />
        <h3>No records to review</h3>
        <p>Scan prescriptions to see extracted records here.</p>
      </div>
    </div>
  )
}
