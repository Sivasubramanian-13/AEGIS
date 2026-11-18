
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Clock3,
  FileSpreadsheet,
  Download,
  Trash2,
  AlertCircle,
  CheckCircle2,
  LoaderCircle,
  X,
  RefreshCw,
  ClipboardCheck,
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

type JobStatus = 'processing' | 'review' | 'completed' | 'failed'

type ScanJob = {
  id: string
  sheetId: string
  sheetName: string
  startedAt: string
  updatedAt: string
  totalImages: number
  saved: number
  needsReview: number
  failed: number
  status: JobStatus
}

type SessionsResponse = {
  success: boolean
  sessions?: ScanJob[]
  message?: string
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getStatusLabel(status: JobStatus) {
  switch (status) {
    case 'processing':
      return 'Processing'
    case 'review':
      return 'Needs review'
    case 'completed':
      return 'Completed'
    case 'failed':
      return 'Failed'
  }
}

export default function Activity() {
  const navigate = useNavigate()

  const [jobs, setJobs] = useState<ScanJob[]>([])
  const [deleteJob, setDeleteJob] = useState<ScanJob | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const fetchSessions = useCallback(async () => {
    try {
      setError('')

      const response = await fetch(`${API_URL}/api/sessions`, {
        credentials: 'include',
      })
      const data: SessionsResponse = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Could not load activity.')
      }

      setJobs(data.sessions || [])
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Could not load activity.'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  // Open this session's spreadsheet in the Review page.
  const reviewJob = (job: ScanJob) => {
    navigate('/review', {
      state: {
        sheetId: job.sheetId,
        sheetName: job.sheetName,
      },
    })
  }

  // Download the spreadsheet as an XLSX file.
  const downloadJob = async (job: ScanJob) => {
    try {
      setDownloadingId(job.id)
      setError('')

      const response = await fetch(
        `${API_URL}/api/sheets/${encodeURIComponent(job.sheetId)}/export`,
        {
          credentials: 'include',
        }
      )

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.message || 'Could not download Excel file.')
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')

      link.href = url
      link.download = `${job.sheetName || 'prescriptions'}.xlsx`

      document.body.appendChild(link)
      link.click()
      link.remove()

      URL.revokeObjectURL(url)
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Could not download Excel file.'
      )
    } finally {
      setDownloadingId(null)
    }
  }

  const confirmDelete = async () => {
    if (!deleteJob) return

    setDeleting(true)

    try {
      const response = await fetch(
        `${API_URL}/api/sessions/${encodeURIComponent(deleteJob.id)}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      )
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Could not delete session.')
      }

      setJobs(previous =>
        previous.filter(job => job.id !== deleteJob.id)
      )
      setDeleteJob(null)
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Could not delete session.'
      )
    } finally {
      setDeleting(false)
    }
  }

  const renderActions = (job: ScanJob) => (
    <>
      <button
        className="activity-action-button"
        onClick={() => reviewJob(job)}
      >
        <ClipboardCheck size={15} />
        Review
      </button>

      {job.saved > 0 && (
        <button
          className="activity-action-button"
          onClick={() => downloadJob(job)}
          disabled={downloadingId === job.id}
        >
          {downloadingId === job.id ? (
            <LoaderCircle size={15} className="activity-spin" />
          ) : (
            <Download size={15} />
          )}
          {downloadingId === job.id ? 'Downloading...' : 'Download .xlsx'}
        </button>
      )}
    </>
  )

  return (
    <div className="page-container activity-page">
      <div className="page-heading">
        <span className="eyebrow">WORKSPACE</span>
        <h1>Activity</h1>
        <p>Track your prescription scanning and upload sessions.</p>
      </div>

      <section className="activity-job-list">
        <div className="activity-list-heading">
          <h2>Recent sessions</h2>

          <button
            className="activity-action-button"
            onClick={fetchSessions}
            disabled={loading}
          >
            <RefreshCw size={15} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="activity-job-note">
            <AlertCircle size={15} />
            {error}
          </div>
        )}

        {loading ? (
          <div className="activity-empty">
            <LoaderCircle size={26} className="activity-spin" />
            <p>Loading sessions...</p>
          </div>
        ) : jobs.length === 0 ? (
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
                    <h3>{job.sheetName}</h3>
                  </div>

                  <button
                    className="activity-delete-button"
                    onClick={() => setDeleteJob(job)}
                    aria-label={`Delete ${job.sheetName} session`}
                    title="Delete session"
                  >
                    <Trash2 size={17} />
                  </button>
                </div>

                <div className="activity-job-time">
                  <Clock3 size={13} />
                  <span>Started {formatDate(job.startedAt)}</span>
                </div>

                <p className="activity-modified">
                  Updated {formatDate(job.updatedAt)}
                </p>

                <div className="activity-job-metrics">
                  <div>
                    <span>Images processed</span>
                    <strong>{job.totalImages}</strong>
                  </div>

                  <div>
                    <span>Rows extracted</span>
                    <strong>{job.saved}</strong>
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
                    aria-label={`Delete ${job.sheetName} session`}
                  >
                    <Trash2 size={17} />
                  </button>
                </div>

                <p className="activity-job-note">
                  {job.status === 'processing' ? (
                    <>
                      <LoaderCircle size={14} className="activity-spin" />
                      Processing is still in progress.
                    </>
                  ) : job.status === 'review' ? (
                    <>
                      <AlertCircle size={14} />
                      {job.needsReview} prescription(s) need review.
                    </>
                  ) : job.status === 'failed' ? (
                    <>
                      <AlertCircle size={14} />
                      {job.failed} image(s) failed.
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={14} />
                      All available records have been saved.
                    </>
                  )}
                </p>

                <span className={`activity-status ${job.status}`}>
                  {getStatusLabel(job.status)}
                </span>
              </article>
            ))}
          </div>
        )}
      </section>

      {deleteJob && (
        <div className="activity-confirm-overlay">
          <div
            className="activity-confirm-dialog"
            role="dialog"
            aria-modal="true"
          >
            <div className="activity-confirm-icon">
              <Trash2 size={21} />
            </div>

            <h2>Delete this session?</h2>

            <p>
              Are you sure you want to delete{' '}
              <strong>{deleteJob.sheetName}</strong> from your activity
              history?
            </p>

            <p className="activity-delete-warning">
              This removes only session history. Your Google Sheet data
              will not be deleted.
            </p>

            <div className="activity-confirm-actions">
              <button
                onClick={() => setDeleteJob(null)}
                disabled={deleting}
              >
                Cancel
              </button>

              <button
                className="activity-confirm-delete"
                onClick={confirmDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete session'}
              </button>
            </div>

            <button
              className="activity-confirm-close"
              onClick={() => setDeleteJob(null)}
              aria-label="Close confirmation"
              disabled={deleting}
            >
              <X size={17} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
