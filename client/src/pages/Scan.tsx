
import { Camera, Upload } from 'lucide-react'

export default function Scan() {
  return (
    <div className="page-container">
      <div className="page-heading">
        <div>
          <h1>Scan prescriptions</h1>
          <p>Capture or upload prescriptions to extract their details.</p>
        </div>
      </div>

      <div className="scan-actions">
        <button className="action-card">
          <div className="action-icon">
            <Camera size={25} />
          </div>
          <h3>Scan Prescription</h3>
          <p>Use your device camera to capture prescriptions.</p>
          <span>Open camera →</span>
        </button>

        <button className="action-card">
          <div className="action-icon">
            <Upload size={25} />
          </div>
          <h3>Upload Prescription</h3>
          <p>Select one or multiple prescription images.</p>
          <span>Choose images →</span>
        </button>
      </div>
    </div>
  )
}
