
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Camera,
  Upload,
  FileSpreadsheet,
  Plus,
  X,
  Search,
  Clock3,
  ArrowRight,
} from 'lucide-react'
import '../styles/Scan.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

type ActionType = 'scan' | 'upload'
type SheetMode = 'existing' | 'new'

type Spreadsheet = {
  id: string
  name: string
  modifiedTime?: string
}

export default function Scan() {
  const navigate = useNavigate()

  const [action, setAction] = useState<ActionType | null>(null)
  const [mode, setMode] = useState<SheetMode>('existing')

  const [sheets, setSheets] = useState<Spreadsheet[]>([])
  const [selectedSheet, setSelectedSheet] = useState('')
  const [newSheetName, setNewSheetName] = useState('')
  const [addHeaders, setAddHeaders] = useState(true)
  const [search, setSearch] = useState('')

  const [loadingSheets, setLoadingSheets] = useState(false)
  const [creatingSheet, setCreatingSheet] = useState(false)
  const [sheetError, setSheetError] = useState('')

  // Fetch real Google spreadsheets whenever the existing-sheet
  // tab is opened while the modal is visible.
  useEffect(() => {
    if (!action || mode !== 'existing') return

    const fetchSheets = async () => {
      setLoadingSheets(true)
      setSheetError('')

      try {
        const response = await fetch(`${API_URL}/api/sheets`)
        const data = await response.json()

        if (!response.ok || !data.success) {
          throw new Error(data.message || 'Failed to load spreadsheets.')
        }

        const fetchedSheets: Spreadsheet[] = data.spreadsheets || []

        setSheets(fetchedSheets)

        setSelectedSheet(current =>
          fetchedSheets.some(sheet => sheet.id === current)
            ? current
            : fetchedSheets[0]?.id || ''
        )
      } catch (error) {
        setSheetError(
          error instanceof Error
            ? error.message
            : 'Unable to load spreadsheets.'
        )
      } finally {
        setLoadingSheets(false)
      }
    }

    fetchSheets()
  }, [action, mode])

  const filteredSheets = sheets.filter(sheet =>
    sheet.name.toLowerCase().includes(search.toLowerCase())
  )

  const openSheetDialog = (selectedAction: ActionType) => {
    setAction(selectedAction)
    setMode('existing')
    setSearch('')
    setSheetError('')
  }

  const continueToNextStep = async () => {
    if (!action) return

    setSheetError('')

    try {
      let sheetId = selectedSheet
      let sheetName = sheets.find(
        sheet => sheet.id === selectedSheet
      )?.name

      // Create a real Google spreadsheet when Create new is selected.
      if (mode === 'new') {
        const name = newSheetName.trim()

        if (!name) return

        setCreatingSheet(true)

        const response = await fetch(`${API_URL}/api/sheets`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name,
            addHeader: addHeaders,
          }),
        })

        const data = await response.json()

        if (!response.ok || !data.success) {
          throw new Error(data.message || 'Could not create spreadsheet.')
        }

        sheetId = data.spreadsheet.id
        sheetName = data.spreadsheet.name

        setSheets(previous => [
          data.spreadsheet,
          ...previous.filter(sheet => sheet.id !== data.spreadsheet.id),
        ])
      }

      if (!sheetId || !sheetName) {
        throw new Error('Please select a valid spreadsheet.')
      }

      navigate(
        action === 'scan' ? '/scan-session' : '/upload-session',
        {
          state: {
            action,
            sheetId,
            sheetName,
            isNew: mode === 'new',
            addHeaders: mode === 'new' ? addHeaders : false,
          },
        }
      )
    } catch (error) {
      setSheetError(
        error instanceof Error
          ? error.message
          : 'Something went wrong.'
      )
    } finally {
      setCreatingSheet(false)
    }
  }

  return (
    <div className="page-container">
      <div className="page-heading">
        <span className="eyebrow">PRESCRIPTION WORKSPACE</span>
        <h1>Scan prescriptions</h1>
        <p>Capture or upload prescriptions to extract their details.</p>
      </div>

      <div className="scan-workspace">
        {/* Primary camera action */}
        <button
          className="camera-action-card"
          onClick={() => openSheetDialog('scan')}
        >
          <div className="camera-card-top">
            <span className="section-number">01</span>
            <span className="camera-status">
              <span className="status-dot" />
              CAMERA SCAN
            </span>
          </div>

          <div className="camera-preview">
            <div className="scan-corners">
              <span />
              <span />
              <span />
              <span />
            </div>

            <div className="camera-preview-content">
              <div className="camera-icon-circle">
                <Camera size={25} strokeWidth={1.6} />
              </div>

              <span>Position your prescription within the frame</span>

              <div className="camera-open-label">
                <Camera size={15} />
                Open camera
              </div>
            </div>
          </div>

          <div className="camera-card-footer">
            <div>
              <h3>Scan prescription</h3>
              <p>Take a clear photo to extract prescription details.</p>
            </div>
          </div>
        </button>

        {/* Secondary upload action */}
        <button
          className="upload-action-card"
          onClick={() => openSheetDialog('upload')}
        >
          <div className="upload-icon">
            <Upload size={25} />
          </div>

          <div className="upload-card-content">
            <span className="section-number">02 · UPLOAD</span>
            <h3>Upload prescriptions</h3>
            <p>Select one or more prescription images.</p>
          </div>
        </button>
      </div>

      {/* Spreadsheet destination modal */}
      {action && (
        <div
          className="sheet-modal-overlay"
          onMouseDown={event => {
            if (event.target === event.currentTarget && !creatingSheet) {
              setAction(null)
            }
          }}
        >
          <div
            className="sheet-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sheet-modal-title"
          >
            <div className="sheet-modal-header">
              <div>
                <span className="eyebrow">DESTINATION</span>
                <h2 id="sheet-modal-title">Choose spreadsheet</h2>
                <p>
                  Select where the extracted prescription records should be saved.
                </p>
              </div>

              <button
                className="modal-close"
                onClick={() => setAction(null)}
                aria-label="Close"
                disabled={creatingSheet}
              >
                <X size={19} />
              </button>
            </div>

<div className="sheet-mode-switch">
  <button
    className={mode === 'existing' ? 'selected' : ''}
    onClick={() => {
      setMode('existing')
      setSheetError('')
    }}
    disabled={creatingSheet}
  >
    <FileSpreadsheet size={16} />
    Existing sheet
  </button>

  <button
    className={mode === 'new' ? 'selected' : ''}
    onClick={() => {
      setMode('new')
      setSheetError('')
    }}
    disabled={creatingSheet}
  >
    <Plus size={16} />
    Create new
  </button>
</div>

            {mode === 'existing' ? (
              <div className="modal-sheet-content">
                <div className="sheet-search">
                  <Search size={16} />
                  <input
                    value={search}
                    onChange={event => setSearch(event.target.value)}
                    placeholder="Search spreadsheets..."
                  />
                </div>

                <div className="sheet-list">
                  {loadingSheets ? (
                    <div className="sheet-empty">
                      Loading your spreadsheets...
                    </div>
                  ) : sheetError ? (
                    <div className="sheet-empty sheet-error">
                      {sheetError}
                    </div>
                  ) : filteredSheets.length > 0 ? (
                    filteredSheets.map(sheet => (
                      <button
                        key={sheet.id}
                        className={`sheet-option ${
                          selectedSheet === sheet.id ? 'active' : ''
                        }`}
                        onClick={() => setSelectedSheet(sheet.id)}
                      >
                        <div className="sheet-icon">
                          <FileSpreadsheet size={20} />
                        </div>

                        <div className="sheet-info">
                          <strong>{sheet.name}</strong>
                          <span>
                            <Clock3 size={12} />
                            {sheet.modifiedTime
                              ? `Modified ${new Date(
                                  sheet.modifiedTime
                                ).toLocaleDateString()}`
                              : 'Google spreadsheet'}
                          </span>
                        </div>

                        <span className="sheet-radio">
  {selectedSheet === sheet.id && (
    <span><span /></span>
  )}
</span>
                      </button>
                    ))
                  ) : (
                    <div className="sheet-empty">
                      {search
                        ? 'No matching spreadsheets found.'
                        : 'No spreadsheets found. Create a new one.'}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="new-sheet-panel modal-new-sheet">
                <div className="new-sheet-icon">
                  <Plus size={22} />
                </div>

                <h3>Create a new spreadsheet</h3>
                <p>Enter a name for your prescription spreadsheet.</p>

                <label htmlFor="sheet-name">Spreadsheet name</label>
                <input
                  id="sheet-name"
                  value={newSheetName}
                  onChange={event => setNewSheetName(event.target.value)}
                  placeholder="e.g. November 2026 Prescriptions"
                  maxLength={100}
                />

                <label className="header-option">
                  <input
                    type="checkbox"
                    checked={addHeaders}
                    onChange={event => setAddHeaders(event.target.checked)}
                  />
                  <span>
                    <strong>Add column headers</strong>
                    <small>
                      Add Sl.No, Date, Patient Name, Case Sheet Ref.,
                      Name of Medicine and Dose/Quantity.
                    </small>
                  </span>
                </label>
              </div>
            )}

            {sheetError && mode === 'new' && (
              <p className="sheet-error">{sheetError}</p>
            )}

<div className="sheet-modal-footer">
  <span className="modal-destination">
    <FileSpreadsheet size={15} />
    <span>
      {mode === 'new'
        ? newSheetName.trim() || 'New spreadsheet'
        : sheets.find(sheet => sheet.id === selectedSheet)?.name ||
          'Select a spreadsheet'}
    </span>
  </span>

  <div className="modal-buttons">
    <button
      className="secondary-button"
      onClick={() => setAction(null)}
      disabled={creatingSheet}
    >
      Cancel
    </button>

    <button
      className="primary-button"
      onClick={continueToNextStep}
      disabled={
        loadingSheets ||
        creatingSheet ||
        (mode === 'new'
          ? !newSheetName.trim()
          : !selectedSheet ||
            !sheets.some(sheet => sheet.id === selectedSheet))
      }
    >
      {creatingSheet
        ? 'Creating...'
        : action === 'scan'
          ? 'Continue to scanning'
          : 'Continue to uploading'}
      {!creatingSheet && <ArrowRight size={16} />}
    </button>
  </div>
</div>
          </div>
        </div>
      )}
    </div>
  )
}
