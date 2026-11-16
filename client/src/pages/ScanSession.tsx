
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

type ScanImage = {
  id: string
  file: File
  preview: string
}

export default function ScanSession() {
  const navigate = useNavigate()
  const location = useLocation()
  const { sheetName } = location.state || {}

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const latestImageRef = useRef<ScanImage | null>(null)

  const [cameraReady, setCameraReady] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [scanned, setScanned] = useState(0)
  const [added] = useState(0)
  const [needsReview] = useState(0)
  const [latestImage, setLatestImage] = useState<ScanImage | null>(null)
  const [showTerminate, setShowTerminate] = useState(false)
  const [toast, setToast] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info')

  const showMessage = (
    message: string,
    type: 'success' | 'error' | 'info' = 'info'
  ) => {
    setToast(message)
    setToastType(type)
  }

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(track => track.stop())
    streamRef.current = null
    setCameraReady(false)
  }, [])

  const startCamera = useCallback(async () => {
    setCameraError('')
    setCameraReady(false)
    stopCamera()

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera is unavailable. Please upload an image instead.')
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

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setCameraReady(true)
      }
    } catch {
      setCameraError(
        'Allow camera access for this site in your browser settings, then try again. You can also upload photos instead.'
      )
    }
  }, [stopCamera])

  useEffect(() => {
    if (!sheetName) {
      navigate('/', { replace: true })
      return
    }

    startCamera()

    return () => {
      streamRef.current?.getTracks().forEach(track => track.stop())
      if (latestImageRef.current) {
        URL.revokeObjectURL(latestImageRef.current.preview)
      }
    }
  }, [sheetName, navigate, startCamera])

  const setLatest = (file: File) => {
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

    // Placeholder until the backend processing API is connected.
    showMessage('Image captured. Ready for processing.', 'info')
  }

  const capturePhoto = () => {
    const video = videoRef.current
    const canvas = canvasRef.current

    if (!video || !canvas || !video.videoWidth) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const context = canvas.getContext('2d')
    if (!context) return

    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    canvas.toBlob(blob => {
      if (!blob) {
        showMessage('Could not capture image. Please try again.', 'error')
        return
      }

      const file = new File(
        [blob],
        `prescription-${Date.now()}.jpg`,
        { type: 'image/jpeg' }
      )

      setLatest(file)
    }, 'image/jpeg', 0.92)
  }

  const handleUpload = (files: FileList | null) => {
    if (!files?.length) return

    const file = files[0]

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      showMessage('Choose a JPG, PNG or WebP image.', 'error')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      showMessage('Image must be smaller than 10 MB.', 'error')
      return
    }

    setLatest(file)
  }

  const terminateSession = () => {
    stopCamera()
    navigate('/')
  }

  if (!sheetName) return null

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
            >
              <Upload size={23} />
              <span>Upload</span>
            </button>

            <button
              className="camera-shutter"
              onClick={capturePhoto}
              aria-label="Capture prescription"
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
            <button className="confirm-terminate" onClick={terminateSession}>
              Terminate session
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
