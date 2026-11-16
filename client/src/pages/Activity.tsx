
import { useState } from 'react'
import {
  Clock3,
  FileSpreadsheet,
  Download,
  Trash2,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  LoaderCircle,
  X,
} from 'lucide-react'

type JobStatus = 'processing' | 'review' | 'completed' | 'failed'

type ScanJob = {
  id: string
  name: string
  startedAt: string
  modifiedAt: string
  images: number
  rowsExtracted: number
  failed: number
  status: JobStatus
}

const initialJobs: ScanJob[] = [
  {
    id: 'job-1',
    name: 'Scan 2026-11-16 11:30',
    startedAt: 'Nov 16, 2026, 11:30 AM',
    modifiedAt: 'Updated just now',
    images: 4,
    rowsExtracted: 3,
    failed: 0,
    status: 'review',
  },
  {
    id: 'job-2',
    name: 'Scan 2026-11-15 12:07',
    startedAt: 'Nov 15, 2026, 5:37 PM',
    modifiedAt: 'Updated 2 min ago',
    images: 1,
    rowsExtracted: 0,
    failed: 0,
    status: 'processing',
  },
  {
    id: 'job-3',
    name: 'Scan 2026-11-15 09:02',
    startedAt: 'Nov 15, 2026, 2:32 PM',
    modifiedAt: 'Updated 3 hours ago',
    images: 1,
    rowsExtracted: 1,
    failed: 0,
    status: 'review',
  },
  {
    id: 'job-4',
    name: 'Scan 2026-11-15 09:00',
    startedAt: 'Nov 15, 2026, 2:30 PM',
    modifiedAt: 'Updated 3 hours ago',
    images: 2,
    rowsExtracted: 0,
    failed: 2,
    status: 'failed',
  },
  {
    id: 'job-5',
    name: 'Scan 2026-11-14 16:20',
    startedAt: 'Nov 14, 2026, 4:20 PM',
    modifiedAt: 'Updated yesterday',
    images: 6,
    rowsExtracted: 6,
    failed: 0,
    status: 'completed',
  },
]

export default function Activity() {
  const [jobs, setJobs] = useState<ScanJob[]>(initialJobs)
  const [deleteJob, setDeleteJob] = useState<ScanJob | null>(null)

  const openJob = (job: ScanJob) => {
    // Job details navigation will be connected to the backend job record.
    console.log('Open job:', job.id)
  }

  const reviewJob = (job: ScanJob) => {
    // Review navigation will be connected to the saved extraction results.
    console.log('Review job:', job.id)
  }

  const downloadJob = (job: ScanJob) => {
    // Actual XLSX download will be connected to the backend export endpoint.
    console.log('Download job:', job.id)
  }

  const confirmDelete = () => {
    if (!deleteJob) return
    setJobs(previous => previous.filter(job => job.id !== deleteJob.id))
    setDeleteJob(null)
  }

  const renderActions = (job: ScanJob) => {
    if (job.status === 'processing') {
      return (
        <button className="activity-action-button" onClick={() => openJob(job)}>
          Open <ArrowRight size={15} />
        </button>
      )
    }

    if (job.status === 'review') {
      return (
        <>
          <button className="activity-action-button" onClick={() => reviewJob(job)}>
            Review <ArrowRight size={15} />
          </button>
          {job.rowsExtracted > 0 && (
            <button className="activity-action-button" onClick={() => downloadJob(job)}>
              <Download size={15} /> Download .xlsx
            </button>
          )}
        </>
      )
    }

    if (job.status === 'completed') {
      return (
        <>
          <button className="activity-action-button" onClick={() => openJob(job)}>
            Open
          </button>
          <button className="activity-action-button" onClick={() => downloadJob(job)}>
            <Download size={15} /> Download .xlsx
          </button>
        </>
      )
    }

    return (
      <button className="activity-action-button" onClick={() => openJob(job)}>
        Open details
      </button>
    )
  }

  return (
    <div className="page-container activity-page">
      <div className="page-heading">
        <span className="eyebrow">WORKSPACE</span>
        <h1>Activity</h1>
        <p>Track your prescription scanning and upload sessions.</p>
      </div>

      <div className="activity-summary">
        <div>
          <strong>{jobs.length}</strong>
          <span>Total jobs</span>
        </div>
        <div>
          <strong>{jobs.reduce((sum, job) => sum + job.images, 0)}</strong>
          <span>Images processed</span>
        </div>
        <div>
          <strong>{jobs.reduce((sum, job) => sum + job.rowsExtracted, 0)}</strong>
          <span>Rows extracted</span>
        </div>
      </div>

      <section className="activity-job-list">
        <div className="activity-list-heading">
          <h2>Recent jobs</h2>
          <span>{jobs.length} sessions</span>
        </div>

        {jobs.length === 0 ? (
          <div className="activity-empty">
            <Clock3 size={28} />
            <h3>No activity yet</h3>
            <p>Your scanning and upload sessions will appear here.</p>
          </div>
        ) : (
          <div className="activity-list">
            {jobs.map(job => (
              <article className="activity-job-card" key={job.id}>
                <div className="activity-job-heading">
                  <div className="activity-job-title">
                    <FileSpreadsheet size={17} />
                    <h3>{job.name}</h3>
                  </div>
                  <button
                    className="activity-delete-button"
                    onClick={() => setDeleteJob(job)}
                    aria-label={`Delete ${job.name}`}
                    title="Delete job"
                  >
                    <Trash2 size={17} />
                  </button>
                </div>

                <div className="activity-job-time">
                  <Clock3 size={13} />
                  <span>Started {job.startedAt}</span>
                </div>

                <p className="activity-modified">{job.modifiedAt}</p>

                <div className="activity-job-metrics">
                  <div>
                    <span>Images</span>
                    <strong>{job.images}</strong>
                  </div>
                  <div>
                    <span>Rows extracted</span>
                    <strong>{job.rowsExtracted}</strong>
                  </div>
                  <div>
                    <span>Failed</span>
                    <strong>{job.failed}</strong>
                  </div>
                </div>

                <div className="activity-job-actions">
                  {renderActions(job)}
                  <button
                    className="activity-delete-mobile"
                    onClick={() => setDeleteJob(job)}
                    aria-label={`Delete ${job.name}`}
                  >
                    <Trash2 size={17} />
                  </button>
                </div>

                {job.status === 'failed' && (
                  <p className="activity-job-note">
                    <AlertCircle size={14} />
                    {job.failed} image(s) failed. Open this job to inspect the errors.
                  </p>
                )}
                {job.status === 'processing' && (
                  <p className="activity-job-note">
                    <LoaderCircle size={14} className="activity-spin" />
                    Processing is still in progress.
                  </p>
                )}
                {job.status === 'completed' && (
                  <p className="activity-job-note">
                    <CheckCircle2 size={14} />
                    All available records have been saved.
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      {deleteJob && (
        <div className="activity-confirm-overlay">
          <div className="activity-confirm-dialog" role="dialog" aria-modal="true">
            <div className="activity-confirm-icon">
              <Trash2 size={21} />
            </div>
            <h2>Delete this job?</h2>
            <p>
              Are you sure you want to delete <strong>{deleteJob.name}</strong>?
              This will remove the job from your activity history.
            </p>
            <p className="activity-delete-warning">
              This action cannot be undone.
            </p>
            <div className="activity-confirm-actions">
              <button onClick={() => setDeleteJob(null)}>
                Cancel
              </button>
              <button className="activity-confirm-delete" onClick={confirmDelete}>
                Delete job
              </button>
            </div>
            <button
              className="activity-confirm-close"
              onClick={() => setDeleteJob(null)}
              aria-label="Close confirmation"
            >
              <X size={17} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
