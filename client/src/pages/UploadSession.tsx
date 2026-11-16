
import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
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
  RefreshCw,
  FileSpreadsheet,
} from 'lucide-react'

type ImageStatus = 'queued' | 'processing' | 'saved' | 'review' | 'failed'

type UploadImage = {
  id: string
  file: File
  preview: string
  status: ImageStatus
  message?: string
}

type ProcessResponse = {
  success: boolean
  status?: 'saved' | 'review'
  message?: string
  row?: Record<string, string>
}

const MAX_FILE_SIZE = 10 * 1024 * 1024
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export default function UploadSession() {
  const navigate = useNavigate()
  const location = useLocation()
  const { sheetName, sheetId } = location.state || {}

  const fileInputRef = useRef<HTMLInputElement>(null)
  const imagesRef = useRef<UploadImage[]>([])
  const processingRef = useRef(false)

  const [images, setImages] = useState<UploadImage[]>([])
  const [error, setError] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingComplete, setProcessingComplete] = useState(false)

  useEffect(() => {
    imagesRef.current = images
  }, [images])

  useEffect(() => {
    if (!sheetName) {
      navigate('/', { replace: true })
    }
  }, [sheetName, navigate])

  useEffect(() => {
    return () => {
      imagesRef.current.forEach(image => URL.revokeObjectURL(image.preview))
    }
  }, [])

  if (!sheetName) return null

  const updateImage = (
    id: string,
    updates: Partial<UploadImage>
  ) => {
    setImages(previous =>
      previous.map(image =>
        image.id === id ? { ...image, ...updates } : image
      )
    )
  }

  const addFiles = (fileList: FileList | File[]) => {
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
      setImages(previous => [...previous, ...validImages])
      setProcessingComplete(false)
    }

    setError(errors.join(' '))
  }

  const removeImage = (id: string) => {
    const image = images.find(item => item.id === id)
    if (image) URL.revokeObjectURL(image.preview)

    setImages(previous => previous.filter(item => item.id !== id))
    setProcessingComplete(false)
  }

  const clearImages = () => {
    images.forEach(image => URL.revokeObjectURL(image.preview))
    setImages([])
    setError('')
    setProcessingComplete(false)
  }

  const processOneImage = async (image: UploadImage) => {
    updateImage(image.id, {
      status: 'processing',
      message: 'Sending image for processing...',
    })

    try {
      const formData = new FormData()
      formData.append('image', image.file)
      formData.append('sheetName', sheetName)
      if (sheetId) formData.append('sheetId', sheetId)

      const response = await fetch('/api/prescriptions/process', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json() as ProcessResponse

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Processing failed.')
      }

      if (result.status === 'saved') {
        updateImage(image.id, {
          status: 'saved',
          message: result.message || 'Row successfully added to the spreadsheet.',
        })
      } else if (result.status === 'review') {
        updateImage(image.id, {
          status: 'review',
          message: result.message || 'Please review the extracted fields.',
        })
      } else {
        throw new Error('The server returned an unrecognized processing status.')
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

  const processQueue = async (retryOnly = false) => {
    if (processingRef.current) return

    const queue = imagesRef.current.filter(image =>
      retryOnly
        ? image.status === 'failed'
        : image.status === 'queued'
    )

    if (!queue.length) return

    processingRef.current = true
    setIsProcessing(true)
    setProcessingComplete(false)
    setError('')

    try {
      for (const image of queue) {
        await processOneImage(image)
      }
    } finally {
      processingRef.current = false
      setIsProcessing(false)
      setProcessingComplete(true)
    }
  }

  const selectedCount = images.length
  const savedCount = images.filter(image => image.status === 'saved').length
  const reviewCount = images.filter(image => image.status === 'review').length
  const failedCount = images.filter(image => image.status === 'failed').length
  const queuedCount = images.filter(image => image.status === 'queued').length
  const activeCount = images.filter(image => image.status === 'processing').length

  const continueToReview = () => {
    navigate('/review', {
      state: {
        sheetName,
        sheetId,
        processingComplete: true,
      },
    })
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
    addFiles(event.dataTransfer.files)
  }

  const statusLabel: Record<ImageStatus, string> = {
    queued: 'Waiting',
    processing: 'Processing',
    saved: 'Row added to sheet',
    review: 'Needs review',
    failed: 'Processing failed',
  }

  return (
    <div className="upload-workspace">
      <header className="upload-topbar">
        <button className="back-button" onClick={() => navigate('/')}>
          <ArrowLeft size={17} />
          Back
        </button>

        <div className="upload-destination">
          <FileSpreadsheet size={16} />
          <span>{sheetName}</span>
        </div>
      </header>

      <main className="upload-content">
        <div className="page-heading">
          <span className="eyebrow">UPLOAD SESSION</span>
          <h1>Upload prescriptions</h1>
          <p>Choose photos from your device, or drop them here.</p>
        </div>

        <div
          className={`upload-dropzone ${isDragging ? 'dragging' : ''}`}
          onDragOver={event => {
            event.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={event => {
            if (!event.currentTarget.contains(event.relatedTarget as Node)) {
              setIsDragging(false)
            }
          }}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={event => {
            if (event.key === 'Enter' || event.key === ' ') {
              fileInputRef.current?.click()
            }
          }}
        >
          <div className="upload-drop-icon">
            <ImagePlus size={26} />
          </div>
          <h2>Upload prescriptions</h2>
          <p>Choose photos from your device, or drop them here.</p>
          <span className="upload-browse-button">
            <Plus size={16} /> Browse images
          </span>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          hidden
          onChange={event => {
            if (event.target.files) addFiles(event.target.files)
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
            <button onClick={() => setError('')} aria-label="Dismiss error">
              <X size={15} />
            </button>
          </div>
        )}

        <section className="upload-selected">
          <div className="upload-selected-heading">
            <div>
              <h2>{selectedCount} photo{selectedCount === 1 ? '' : 's'} ready</h2>
              {selectedCount > 0 && (
                <p>
                  {savedCount} saved · {reviewCount} need review · {failedCount} failed
                </p>
              )}
            </div>

            {selectedCount > 0 && !isProcessing && (
              <button className="text-button" onClick={clearImages}>
                <Trash2 size={15} /> Clear all
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
                    <img src={image.preview} alt={`Prescription ${index + 1}`} />
                    <span className="upload-image-number">{index + 1}</span>

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
                    {image.status === 'saved' && <CheckCircle2 size={15} />}
                    {image.status === 'review' && <AlertCircle size={15} />}
                    {image.status === 'failed' && <X size={15} />}
                    <span>{statusLabel[image.status]}</span>
                  </div>

                  {image.message && (
                    <p className="upload-image-message">{image.message}</p>
                  )}

                  {image.status === 'failed' && !isProcessing && (
                    <button
                      className="upload-retry-button"
                      onClick={() => {
                        updateImage(image.id, { status: 'queued', message: '' })
                        setProcessingComplete(false)
                      }}
                    >
                      <RefreshCw size={13} /> Retry
                    </button>
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

        {isProcessing && (
          <div className="upload-processing-banner">
            <LoaderCircle className="upload-spin" size={18} />
            <span>Processing prescriptions one at a time. Please keep this page open.</span>
          </div>
        )}

        {processingComplete && (
          <div className="upload-completion-banner">
            <CheckCircle2 size={18} />
            <span>
              Processing finished: {savedCount} saved, {reviewCount} need review,
              {failedCount} failed.
            </span>
          </div>
        )}
      </main>

      <footer className="upload-footer">
        <div>
          <strong>{selectedCount} photo{selectedCount === 1 ? '' : 's'} selected</strong>
          <span>
            {isProcessing
              ? `${savedCount} saved · ${activeCount} processing`
              : `Destination: ${sheetName}`}
          </span>
        </div>

        {!processingComplete ? (
          <button
            className="primary-button process-upload-button"
            onClick={() => processQueue(false)}
            disabled={selectedCount === 0 || isProcessing || queuedCount === 0}
          >
            {isProcessing ? (
              <><LoaderCircle className="upload-spin" size={16} /> Processing...</>
            ) : (
              <>Process prescriptions <Upload size={16} /></>
            )}
          </button>
        ) : (
          <div className="upload-footer-actions">
            {failedCount > 0 && (
              <button
                className="upload-retry-all"
                onClick={() => processQueue(true)}
                disabled={isProcessing}
              >
                <RefreshCw size={15} /> Retry failed
              </button>
            )}
            <button
              className="primary-button"
              onClick={continueToReview}
              disabled={savedCount + reviewCount === 0}
            >
              Review spreadsheet <ArrowLeft size={16} />
            </button>
          </div>
        )}
      </footer>
    </div>
  )
}
