
import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Camera,
  Upload,
  X,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  FileSpreadsheet,
  ImagePlus,
  Power,
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

type ScanImage = {
  id: string
  file: File
  preview: string
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

export default function ScanSession() {
  const navigate = useNavigate()
  const location = useLocation()

  const { sheetId, sheetName } = location.state || {}

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const latestImageRef = useRef<ScanImage | null>(null)
  const mountedRef = useRef(true)

  // Create one backend session and reuse it for every image.
  const sessionPromiseRef = useRef<Promise<string> | null>(null)

  const [cameraReady, setCameraReady] = useState(false)
  const [cameraError, setCameraError] = useState('')

  const [scanned, setScanned] = useState(0)
  const [added, setAdded] = useState(0)
  const [needsReview, setNeedsReview] = useState(0)

  const [latestImage, setLatestImage] = useState<ScanImage | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const [showTerminate, setShowTerminate] = useState(false)

  const [toast, setToast] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info')

  const showMessage = (
    message: string,
    type: 'success' | 'error' | 'info' = 'info'
  ) => {
    if (!mountedRef.current) return

    setToast(message)
    setToastType(type)
  }

  // Create the session only when the first image is processed.
  const ensureSession = async (): Promise<string> => {
    if (!sessionPromiseRef.current) {
      sessionPromiseRef.current = (async () => {
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
          throw new Error(
            data.message || 'Could not create scanning session.'
          )
        }

        return data.session.id
      })()
    }

    try {
      return await sessionPromiseRef.current
    } catch (error) {
      sessionPromiseRef.current = null
      throw error
    }
  }

  // Stop the active camera stream.
  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(track => track.stop())
    streamRef.current = null
    setCameraReady(false)
  }, [])

  // Start the device camera.
  const startCamera = useCallback(async () => {
    setCameraError('')
    setCameraReady(false)

    stopCamera()

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(
        'Camera is unavailable. Please upload an image instead.'
      )
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      })

      if (!mountedRef.current) {
        stream.getTracks().forEach(track => track.stop())
        return
      }

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()

        if (mountedRef.current) {
          setCameraReady(true)
        }
      }
    } catch {
      if (mountedRef.current) {
        setCameraError(
          'Allow camera access for this site in your browser settings, then try again. You can also upload photos instead.'
        )
      }
    }
  }, [stopCamera])

  // Validate spreadsheet and initialize camera.
  useEffect(() => {
    mountedRef.current = true

    if (!sheetId || !sheetName) {
      navigate('/', { replace: true })
      return
    }

    startCamera()

    return () => {
      mountedRef.current = false

      streamRef.current?.getTracks().forEach(track => track.stop())
      streamRef.current = null

      if (latestImageRef.current) {
        URL.revokeObjectURL(latestImageRef.current.preview)
        latestImageRef.current = null
      }
    }
  }, [sheetId, sheetName, navigate, startCamera])

  // Send an image to the backend and save its extracted data.
  const processPrescription = async (file: File) => {
    if (!sheetId) {
      showMessage('Spreadsheet not selected. Please start again.', 'error')
      return
    }

    setIsProcessing(true)
    showMessage('Processing prescription...', 'info')

    try {
      const sessionId = await ensureSession()

      const formData = new FormData()

      formData.append('image', file)
      formData.append('sheetId', sheetId)
      formData.append('sessionId', sessionId)

      const response = await fetch(
        `${API_URL}/api/prescriptions/process`,
        {
          method: 'POST',
          body: formData,
        }
      )

      const data: ProcessResponse = await response.json()

      if (!response.ok) {
        throw new Error(
          data.message || 'Failed to process prescription.'
        )
      }

      if (data.status === 'saved') {
        setAdded(count => count + 1)

        showMessage(
          data.message || 'Prescription successfully added to your spreadsheet.',
          'success'
        )
      } else if (data.status === 'review') {
        setNeedsReview(count => count + 1)

        showMessage(
          data.message || 'Prescription needs review. Some details could not be extracted.',
          'info'
        )
      } else {
        throw new Error('Unexpected response from the server.')
      }
    } catch (error) {
      showMessage(
        error instanceof Error
          ? error.message
          : 'Something went wrong while processing the prescription.',
        'error'
      )
    } finally {
      if (mountedRef.current) {
        setIsProcessing(false)
      }
    }
  }

  // Store the latest image and immediately process it.
  const setLatest = async (file: File) => {
    if (isProcessing) {
      showMessage('Please wait until the current image is processed.', 'info')
      return
    }

    if (latestImageRef.current) {
      URL.revokeObjectURL(latestImageRef.current.preview)
    }

    const image: ScanImage = {
      id: crypto.randomUUID(),
      file,
      preview: URL.createObjectURL(file),
    }

    latestImageRef.current = image
    setLatestImage(image)

    setScanned(count => count + 1)

    await processPrescription(file)
  }

  // Capture a photo from the live camera.
  const capturePhoto = () => {
    const video = videoRef.current
    const canvas = canvasRef.current

    if (isProcessing) return

    if (!video || !canvas || !video.videoWidth) {
      showMessage('Camera is not ready. Please try again.', 'error')
      return
    }

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const context = canvas.getContext('2d')

    if (!context) {
      showMessage('Could not access image canvas.', 'error')
      return
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    canvas.toBlob(
      async blob => {
        if (!blob) {
          showMessage('Could not capture image. Please try again.', 'error')
          return
        }

        const file = new File(
          [blob],
          `prescription-${Date.now()}.jpg`,
          { type: 'image/jpeg' }
        )

        await setLatest(file)
      },
      'image/jpeg',
      0.92
    )
  }

  // Validate and process an uploaded image.
  const handleUpload = async (files: FileList | null) => {
    if (!files?.length) return

    if (isProcessing) {
      showMessage('Please wait until the current image is processed.', 'info')
      return
    }

    const file = files[0]

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      showMessage('Choose a JPG, PNG or WebP image.', 'error')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      showMessage('Image must be smaller than 10 MB.', 'error')
      return
    }

    await setLatest(file)
  }

  // End the scanning session.
  const terminateSession = () => {
    stopCamera()
    navigate('/')
  }

  if (!sheetName || !sheetId) return null

  return (
    <main className="camera-fullscreen">
      <canvas ref={canvasRef} hidden />

      {/* Full-screen camera background */}
      <video
        ref={videoRef}
        className="camera-background"
        autoPlay
        muted
        playsInline
      />

      {/* Camera permission / loading state */}
      {cameraError ? (
        <div className="camera-permission-state">
          <div className="permission-close">
            <button onClick={() => setShowTerminate(true)}>
              <X size={23} />
            </button>
            <span>No photos added yet</span>
          </div>

          <div className="permission-content">
            <Camera size={34} />
            <h2>Camera access was blocked</h2>
            <p>{cameraError}</p>

            <button className="permission-retry" onClick={startCamera}>
              <RefreshCw size={15} />
              Try again
            </button>

            <button
              className="permission-upload"
              onClick={() => fileInputRef.current?.click()}
            >
              Use device photos
            </button>
          </div>

          <button
            className="permission-cancel"
            onClick={() => setShowTerminate(true)}
          >
            Cancel
          </button>
        </div>
      ) : !cameraReady ? (
        <div className="camera-loading-state">
          Starting camera...
        </div>
      ) : (
        <>
          {/* Top glass toolbar */}
          <header className="camera-glass-top">
            <button
              className="glass-icon-button"
              onClick={() => setShowTerminate(true)}
              aria-label="Terminate session"
            >
              <X size={22} />
            </button>

            <div className="glass-sheet-name">
              <FileSpreadsheet size={15} />
              <span>{sheetName}</span>
            </div>

            <span className="camera-live-dot">
              <span />
              LIVE
            </span>
          </header>

          {/* Floating counters */}
          <section className="camera-glass-stats">
            <div>
              <strong>{scanned}</strong>
              <span>Scanned</span>
            </div>

            <div>
              <strong>{added}</strong>
              <span>Added to sheet</span>
            </div>

            <div>
              <strong>{needsReview}</strong>
              <span>Needs review</span>
            </div>
          </section>

          {/* Document alignment frame */}
          <div className="camera-frame-area">
            <p>Keep the entire prescription inside the frame</p>

            <div className="camera-document-frame">
              <span className="camera-corner top-left" />
              <span className="camera-corner top-right" />
              <span className="camera-corner bottom-left" />
              <span className="camera-corner bottom-right" />
            </div>
          </div>

          {/* Bottom glass controls */}
          <footer className="camera-glass-bottom">
            <button
              className="camera-tool-button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
            >
              <Upload size={23} />
              <span>Upload</span>
            </button>

            <button
              className="camera-shutter"
              onClick={capturePhoto}
              aria-label="Capture prescription"
              disabled={isProcessing}
            >
              <span><Camera size={27} /></span>
            </button>

            <div className="camera-latest">
              {latestImage ? (
                <div className="camera-latest-image">
                  <img src={latestImage.preview} alt="Latest prescription" />
                  <CheckCircle2 size={16} />
                </div>
              ) : (
                <div className="camera-latest-empty">
                  <ImagePlus size={22} />
                </div>
              )}

              <span>Latest</span>
            </div>
          </footer>
        </>
      )}

      {/* Image input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={event => {
          handleUpload(event.target.files)
          event.target.value = ''
        }}
      />

      {/* Toast */}
      {toast && (
        <div className={`camera-toast ${toastType}`} role="status">
          {toastType === 'success' ? (
            <CheckCircle2 size={18} />
          ) : toastType === 'error' ? (
            <AlertCircle size={18} />
          ) : (
            <Camera size={18} />
          )}

          <span>{toast}</span>

          <button onClick={() => setToast('')} aria-label="Dismiss">
            <X size={15} />
          </button>
        </div>
      )}

      {/* Termination confirmation */}
      {showTerminate && (
        <div className="camera-confirm-overlay">
          <div className="camera-confirm-dialog">
            <Power size={24} />

            <h2>Terminate scanning session?</h2>

            <p>
              The camera will close and the session will end.
              Any image not saved to the spreadsheet may be lost.
            </p>

            <button onClick={() => setShowTerminate(false)}>
              Continue scanning
            </button>

            <button
              className="confirm-terminate"
              onClick={terminateSession}
            >
              Terminate session
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
