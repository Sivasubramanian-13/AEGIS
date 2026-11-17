
import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { DragEvent, KeyboardEvent } from 'react'
import {
  ArrowLeft,
  Upload,
  ImagePlus,
  X,
  Trash2,
  Plus,
  CheckCircle2,
  AlertCircle,
  Clock3,
  LoaderCircle,
  FileSpreadsheet,
  Pause,
  Play,
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

const MAX_FILE_SIZE = 10 * 1024 * 1024
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

type ImageStatus = 'queued' | 'processing' | 'saved' | 'review' | 'failed'

type UploadImage = {
  id: string
  file: File
  preview: string
  status: ImageStatus
  message?: string
}

type ProcessResponse = {
  success?: boolean
  status?: 'saved' | 'review'
  message?: string
}

type CreateSessionResponse = {
  success: boolean
  session?: {
    id: string
  }
  message?: string
}

export default function UploadSession() {
  const navigate = useNavigate()
  const location = useLocation()
  const { sheetName, sheetId } = location.state || {}

  const fileInputRef = useRef<HTMLInputElement>(null)
  const imagesRef = useRef<UploadImage[]>([])
  const processingRef = useRef(false)
  const pauseRequestedRef = useRef(false)
  const resumeRef = useRef<(() => void) | null>(null)
  const mountedRef = useRef(true)

  // One session ID is reused for all images in the current batch.
  const sessionIdRef = useRef<string | null>(null)

  const [images, setImages] = useState<UploadImage[]>([])
  const [error, setError] = useState('')
  const [isDragging, setIsDragging] = useState(false)

  const [isProcessing, setIsProcessing] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [pauseRequested, setPauseRequested] = useState(false)
  const [processingComplete, setProcessingComplete] = useState(false)

  useEffect(() => {
    imagesRef.current = images
  }, [images])

  useEffect(() => {
    mountedRef.current = true

    if (!sheetName || !sheetId) {
      navigate('/', { replace: true })
    }

    return () => {
      mountedRef.current = false
      resumeRef.current?.()

      imagesRef.current.forEach(image => {
        URL.revokeObjectURL(image.preview)
      })
    }
  }, [sheetName, sheetId, navigate])

  if (!sheetName || !sheetId) return null

  const updateImage = (
    id: string,
    updates: Partial<UploadImage>
  ) => {
    setImages(previous => {
      const updated = previous.map(image =>
        image.id === id ? { ...image, ...updates } : image
      )

      imagesRef.current = updated
      return updated
    })
  }

  // Create one backend session for this upload batch.
  const createUploadSession = async (): Promise<string> => {
    const response = await fetch(`${API_URL}/api/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sheetId,
        sheetName,
        totalImages: 0,
      }),
    })

    const data: CreateSessionResponse = await response.json()

    if (!response.ok || !data.success || !data.session?.id) {
      throw new Error(data.message || 'Could not create upload session.')
    }

    sessionIdRef.current = data.session.id
    return data.session.id
  }

  // Add selected images after validating their format and size.
  const addFiles = (fileList: FileList | File[]) => {
    if (processingRef.current) return

    const selectedFiles = Array.from(fileList)
    const validImages: UploadImage[] = []
    const errors: string[] = []

    selectedFiles.forEach(file => {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        errors.push(`${file.name}: Unsupported format.`)
        return
      }

      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: File exceeds 10 MB.`)
        return
      }

      validImages.push({
        id: crypto.randomUUID(),
        file,
        preview: URL.createObjectURL(file),
        status: 'queued',
      })
    })

    if (validImages.length) {
      // New images after a completed batch belong to a new session.
      if (processingComplete) {
        sessionIdRef.current = null
      }

      setImages(previous => {
        const updated = [...previous, ...validImages]
        imagesRef.current = updated
        return updated
      })

      setProcessingComplete(false)
    }

    setError(errors.join(' '))
  }

  const removeImage = (id: string) => {
    if (processingRef.current) return

    const image = imagesRef.current.find(item => item.id === id)

    if (image) {
      URL.revokeObjectURL(image.preview)
    }

    setImages(previous => {
      const updated = previous.filter(item => item.id !== id)
      imagesRef.current = updated
      return updated
    })

    setProcessingComplete(false)
    sessionIdRef.current = null
  }

  const clearImages = () => {
    if (processingRef.current) return

    imagesRef.current.forEach(image => {
      URL.revokeObjectURL(image.preview)
    })

    imagesRef.current = []
    setImages([])
    setError('')
    setProcessingComplete(false)
    sessionIdRef.current = null
  }

  // Process one image. The next image starts only after this finishes.
  const processOneImage = async (
    image: UploadImage,
    sessionId: string
  ) => {
    updateImage(image.id, {
      status: 'processing',
      message: 'Extracting prescription details...',
    })

    try {
      const formData = new FormData()

      formData.append('image', image.file)
      formData.append('sheetId', sheetId)
      formData.append('sessionId', sessionId)

      const response = await fetch(
        `${API_URL}/api/prescriptions/process`,
        {
          method: 'POST',
          body: formData,
        }
      )

      const result = await response.json() as ProcessResponse

      if (!response.ok) {
        throw new Error(result.message || 'Processing failed.')
      }

      if (result.status === 'saved') {
        updateImage(image.id, {
          status: 'saved',
          message: result.message ||
            'Row successfully added to the spreadsheet.',
        })
      } else if (result.status === 'review') {
        updateImage(image.id, {
          status: 'review',
          message: result.message ||
            'Some fields need manual review.',
        })
      } else {
        throw new Error(
          result.message || 'Unexpected server response.'
        )
      }
    } catch (err) {
      updateImage(image.id, {
        status: 'failed',
        message: err instanceof Error
          ? err.message
          : 'Unable to process this image.',
      })
    }
  }

  // Wait here if the user has paused the queue.
  const waitForResume = async () => {
    if (!pauseRequestedRef.current) return

    if (mountedRef.current) {
      setIsPaused(true)
      setPauseRequested(false)
    }

    await new Promise<void>(resolve => {
      resumeRef.current = resolve
    })

    resumeRef.current = null
  }

  // Start processing, or resume from the next queued image.
  const processQueue = async () => {
    if (processingRef.current) return

    const queue = imagesRef.current.filter(
      image => image.status === 'queued'
    )

    if (!queue.length) return

    processingRef.current = true
    pauseRequestedRef.current = false

    setIsProcessing(true)
    setIsPaused(false)
    setPauseRequested(false)
    setProcessingComplete(false)
    setError('')

    try {
      // Reuse the session when resuming; create one for a new batch.
      const sessionId =
        sessionIdRef.current || await createUploadSession()

      for (const image of queue) {
        await waitForResume()

        if (!mountedRef.current) return

        await processOneImage(image, sessionId)
      }

      if (mountedRef.current) {
        setProcessingComplete(true)
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(
          err instanceof Error
            ? err.message
            : 'Could not start the upload session.'
        )
      }
    } finally {
      processingRef.current = false

      if (mountedRef.current) {
        setIsProcessing(false)
        setIsPaused(false)
        setPauseRequested(false)
      }
    }
  }

  // Pause after the currently active image has finished.
  const pauseProcessing = () => {
    if (!processingRef.current || pauseRequestedRef.current) return

    pauseRequestedRef.current = true
    setPauseRequested(true)
  }

  // Resume the queue without resubmitting completed images.
  const continueProcessing = () => {
    if (!processingRef.current || !isPaused) return

    pauseRequestedRef.current = false
    setIsPaused(false)
    resumeRef.current?.()
  }

  const handleProcessButton = () => {
    if (isPaused) {
      continueProcessing()
    } else if (isProcessing) {
      pauseProcessing()
    } else {
      void processQueue()
    }
  }

  const cancelSelection = () => {
    if (processingRef.current) return
    navigate('/')
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)

    if (!processingRef.current) {
      addFiles(event.dataTransfer.files)
    }
  }

  const handleDropzoneKeyDown = (
    event: KeyboardEvent<HTMLDivElement>
  ) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()

      if (!processingRef.current) {
        fileInputRef.current?.click()
      }
    }
  }

  const selectedCount = images.length

  const savedCount = images.filter(
    image => image.status === 'saved'
  ).length

  const reviewCount = images.filter(
    image => image.status === 'review'
  ).length

  const failedCount = images.filter(
    image => image.status === 'failed'
  ).length

  const queuedCount = images.filter(
    image => image.status === 'queued'
  ).length

  const completedCount = savedCount + reviewCount + failedCount

  const progress = selectedCount > 0
    ? Math.round((completedCount / selectedCount) * 100)
    : 0

  const statusLabel: Record<ImageStatus, string> = {
    queued: 'Waiting',
    processing: 'Processing',
    saved: 'Row added to sheet',
    review: 'Needs review',
    failed: 'Processing failed',
  }

  return (
    <div className="upload-workspace">

      {/* Header */}
      <header className="upload-topbar">
        <button
          className="back-button"
          onClick={cancelSelection}
          disabled={isProcessing}
        >
          <ArrowLeft size={18} />
          <span>Back</span>
        </button>

        <div className="upload-destination">
          <FileSpreadsheet size={17} />
          <span>{sheetName}</span>
        </div>
      </header>

      <main className="upload-content">

        {/* Page heading */}
        <div className="page-heading">
          <span className="eyebrow">UPLOAD SESSION</span>
          <h1>Upload prescriptions</h1>
          <p>Choose photos from your device, or drop them here.</p>
        </div>

        {/* Upload dropzone */}
        <div
          className={`upload-dropzone ${isDragging ? 'dragging' : ''} ${isProcessing ? 'disabled' : ''}`}
          onDragOver={event => {
            event.preventDefault()
            if (!processingRef.current) setIsDragging(true)
          }}
          onDragLeave={event => {
            if (!event.currentTarget.contains(event.relatedTarget as Node)) {
              setIsDragging(false)
            }
          }}
          onDrop={handleDrop}
          onClick={() => {
            if (!processingRef.current) {
              fileInputRef.current?.click()
            }
          }}
          role="button"
          tabIndex={0}
          onKeyDown={handleDropzoneKeyDown}
        >
          <div className="upload-drop-icon">
            <ImagePlus size={26} />
          </div>

          <h2>Upload prescriptions</h2>
          <p>Choose photos from your device, or drop them here.</p>

          <span className="upload-browse-button">
            <Plus size={16} />
            Browse images
          </span>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          hidden
          disabled={isProcessing}
          onChange={event => {
            if (event.target.files) {
              addFiles(event.target.files)
            }

            event.target.value = ''
          }}
        />

        <p className="upload-format-help">
          JPEG, PNG or WebP, up to 10 MB each. Use one photo for each
          prescription sheet: every photo becomes one row.
        </p>

        {error && (
          <div className="upload-error">
            <AlertCircle size={17} />
            <span>{error}</span>
            <button
              onClick={() => setError('')}
              aria-label="Dismiss error"
            >
              <X size={15} />
            </button>
          </div>
        )}

        {/* Selected images */}
        <section className="upload-selected">
          <div className="upload-selected-heading">
            <div>
              <h2>
                {selectedCount} photo{selectedCount === 1 ? '' : 's'} ready
              </h2>

              {selectedCount > 0 && (
                <p>
                  {savedCount} saved · {reviewCount} need review · {failedCount} failed
                </p>
              )}
            </div>

            {selectedCount > 0 && !isProcessing && (
              <button
                className="text-button"
                onClick={clearImages}
              >
                <Trash2 size={15} />
                Clear all
              </button>
            )}
          </div>

          {images.length === 0 ? (
            <div className="upload-empty-state">
              <ImagePlus size={25} />
              <strong>No images selected yet</strong>
              <span>Your selected prescriptions will appear here.</span>
            </div>
          ) : (
            <div className="upload-image-grid">
              {images.map((image, index) => (
                <div className="upload-image-card" key={image.id}>
                  <div className="upload-image-preview">
                    <img
                      src={image.preview}
                      alt={`Prescription ${index + 1}`}
                    />

                    <span className="upload-image-number">
                      {index + 1}
                    </span>

                    {!isProcessing && (
                      <button
                        onClick={() => removeImage(image.id)}
                        aria-label={`Remove ${image.file.name}`}
                      >
                        <X size={15} />
                      </button>
                    )}
                  </div>

                  <div className="upload-image-info">
                    <strong>{image.file.name}</strong>
                    <span>
                      {(image.file.size / 1024).toFixed(0)} KB
                    </span>
                  </div>

                  <div className={`upload-image-status ${image.status}`}>
                    {image.status === 'queued' && <Clock3 size={15} />}

                    {image.status === 'processing' && (
                      <LoaderCircle className="upload-spin" size={15} />
                    )}

                    {image.status === 'saved' && (
                      <CheckCircle2 size={15} />
                    )}

                    {image.status === 'review' && (
                      <AlertCircle size={15} />
                    )}

                    {image.status === 'failed' && <X size={15} />}

                    <span>{statusLabel[image.status]}</span>
                  </div>

                  {image.message && (
                    <p className="upload-image-message">
                      {image.message}
                    </p>
                  )}
                </div>
              ))}

              {!isProcessing && (
                <button
                  className="add-more-card"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Plus size={22} />
                  <span>Add more</span>
                </button>
              )}
            </div>
          )}
        </section>
      </main>

      {/* Dynamic bottom processing footer */}
      <footer className="upload-footer">

        {/* Before processing */}
        {!isProcessing && !processingComplete && (
          <button
            className="primary-button process-upload-button"
            onClick={handleProcessButton}
            disabled={selectedCount === 0 || queuedCount === 0}
          >
            Process prescriptions
            <Upload size={16} />
          </button>
        )}

        {/* During processing or paused */}
        {isProcessing && (
          <div className="upload-progress-panel">
            <div className="upload-progress-heading">
              <div>
                <strong>
                  {isPaused
                    ? 'Processing paused'
                    : pauseRequested
                      ? 'Finishing current prescription...'
                      : 'Processing prescriptions'}
                </strong>

                <span>
                  {completedCount} of {selectedCount} processed
                </span>
              </div>

              <strong className="upload-progress-percent">
                {progress}%
              </strong>
            </div>

            <div
              className="upload-progress-track"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={selectedCount}
              aria-valuenow={completedCount}
              aria-label="Prescription processing progress"
            >
              <div
                className="upload-progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>

            <button
              className="primary-button upload-pause-button"
              onClick={handleProcessButton}
              disabled={pauseRequested}
            >
              {isPaused ? (
                <>
                  <Play size={17} />
                  Continue
                </>
              ) : pauseRequested ? (
                <>
                  <LoaderCircle className="upload-spin" size={16} />
                  Pausing...
                </>
              ) : (
                <>
                  <Pause size={17} />
                  Pause
                </>
              )}
            </button>
          </div>
        )}

        {/* After processing */}
        {processingComplete && (
          <div className="upload-progress-panel upload-finished-panel">
            <div className="upload-progress-heading">
              <div>
                <strong>Processing complete</strong>
                <span>{completedCount} of {selectedCount} processed</span>
              </div>

              <strong className="upload-progress-percent">100%</strong>
            </div>

            <div
              className="upload-progress-track"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={selectedCount}
              aria-valuenow={completedCount}
            >
              <div
                className="upload-progress-fill"
                style={{ width: '100%' }}
              />
            </div>

            <div className="upload-final-counts">
              <span className="saved-count">
                <CheckCircle2 size={15} />
                {savedCount} saved
              </span>

              <span className="review-count">
                <AlertCircle size={15} />
                {reviewCount} review
              </span>

              <span className="failed-count">
                <X size={15} />
                {failedCount} failed
              </span>
            </div>
          </div>
        )}
      </footer>
    </div>
  )
}
