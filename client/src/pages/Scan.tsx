
import { useState } from 'react'
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

const existingSheets = [
  { id: 'sheet-1', name: 'November 2026 Prescriptions', updated: 'Updated today', rows: 24 },
  { id: 'sheet-2', name: 'October 2026 Prescriptions', updated: 'Updated 2 days ago', rows: 86 },
  { id: 'sheet-3', name: 'Patient Records 2026', updated: 'Updated 1 week ago', rows: 142 },
]

type ActionType = 'scan' | 'upload'
type SheetMode = 'existing' | 'new'

export default function Scan() {
  const navigate = useNavigate()

  const [action, setAction] = useState<ActionType | null>(null)
  const [mode, setMode] = useState<SheetMode>('existing')
  const [selectedSheet, setSelectedSheet] = useState('sheet-1')
  const [newSheetName, setNewSheetName] = useState('')
  const [addHeaders, setAddHeaders] = useState(true)
  const [search, setSearch] = useState('')

  const filteredSheets = existingSheets.filter(sheet =>
    sheet.name.toLowerCase().includes(search.toLowerCase())
  )

  const openSheetDialog = (selectedAction: ActionType) => {
    setAction(selectedAction)
    setMode('existing')
    setSearch('')
  }

  const continueToNextStep = () => {
    const existing = existingSheets.find(sheet => sheet.id === selectedSheet)
    const sheetName = mode === 'new'
      ? newSheetName.trim()
      : existing?.name

    if (!sheetName || !action) return

    navigate(action === 'scan' ? '/scan-session' : '/upload-session', {
      state: {
        action,
        sheetId: mode === 'existing' ? selectedSheet : null,
        sheetName,
        isNew: mode === 'new',
        addHeaders: mode === 'new' ? addHeaders : false,
      },
    })
  }

  return (
    <div className="page-container">
      <div className="page-heading">
        <span className="eyebrow">PRESCRIPTION WORKSPACE</span>
        <h1>Scan prescriptions</h1>
        <p>Capture or upload prescriptions to extract their details.</p>
      </div>

      <div className="scan-actions">
        <button className="action-card" onClick={() => openSheetDialog('scan')}>
          <div className="action-icon"><Camera size={22} /></div>
          <h3>Scan prescription</h3>
          <p>Use your device camera to capture handwritten prescriptions.</p>
          <span>Open camera <ArrowRight size={14} /></span>
        </button>

        <button className="action-card" onClick={() => openSheetDialog('upload')}>
          <div className="action-icon"><Upload size={22} /></div>
          <h3>Upload prescriptions</h3>
          <p>Select one or multiple prescription images from your device.</p>
          <span>Choose images <ArrowRight size={14} /></span>
        </button>
      </div>

      {action && (
        <div className="sheet-modal-overlay" onMouseDown={event => {
          if (event.target === event.currentTarget) setAction(null)
        }}>
          <div className="sheet-modal" role="dialog" aria-modal="true" aria-labelledby="sheet-modal-title">
            <div className="sheet-modal-header">
              <div>
                <span className="eyebrow">DESTINATION</span>
                <h2 id="sheet-modal-title">Choose spreadsheet</h2>
                <p>
                  Select where the extracted prescription records should be saved.
                </p>
              </div>
              <button className="modal-close" onClick={() => setAction(null)} aria-label="Close">
                <X size={19} />
              </button>
            </div>

            <div className="sheet-mode-switch">
              <button
                className={mode === 'existing' ? 'selected' : ''}
                onClick={() => setMode('existing')}
              >
                <FileSpreadsheet size={16} /> Existing sheet
              </button>
              <button
                className={mode === 'new' ? 'selected' : ''}
                onClick={() => setMode('new')}
              >
                <Plus size={17} /> Create new
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
                  {filteredSheets.map(sheet => (
                    <button
                      key={sheet.id}
                      className={`sheet-option ${selectedSheet === sheet.id ? 'active' : ''}`}
                      onClick={() => setSelectedSheet(sheet.id)}
                    >
                      <div className="sheet-icon"><FileSpreadsheet size={20} /></div>
                      <div className="sheet-info">
                        <strong>{sheet.name}</strong>
                        <span>
                          <Clock3 size={12} /> {sheet.updated}
                          <span>·</span> {sheet.rows} records
                        </span>
                      </div>
                      <span className="sheet-radio">
                        {selectedSheet === sheet.id && <span />}
                      </span>
                    </button>
                  ))}
                  {filteredSheets.length === 0 && (
                    <div className="sheet-empty">No spreadsheets found.</div>
                  )}
                </div>
              </div>
            ) : (
              <div className="new-sheet-panel modal-new-sheet">
                <div className="new-sheet-icon"><Plus size={22} /></div>
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

            <div className="sheet-modal-footer">
              <span className="modal-destination">
                <FileSpreadsheet size={16} />
                {mode === 'new'
                  ? newSheetName.trim() || 'New spreadsheet'
                  : existingSheets.find(sheet => sheet.id === selectedSheet)?.name}
              </span>
              <div className="modal-buttons">
                <button className="secondary-button" onClick={() => setAction(null)}>
                  Cancel
                </button>
                <button
                  className="primary-button"
                  onClick={continueToNextStep}
                  disabled={mode === 'new' ? !newSheetName.trim() : !selectedSheet}
                >
                  {action === 'scan' ? 'Continue to scanning' : 'Continue to uploading'}
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
