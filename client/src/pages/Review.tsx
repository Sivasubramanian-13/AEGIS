
import { useEffect, useMemo, useState } from 'react'
import { useLocation} from 'react-router-dom'
import {
  ArrowLeft,
  FileSpreadsheet,
  Search,
  Plus,
  Trash2,
  Download,
  Check,
  Clock3,
  ChevronRight,
  X,
  Save,
} from 'lucide-react'

const HEADERS = [
  'Sl.No',
  'Date',
  'Patient Name',
  'Case Sheet Ref.',
  'Name of Medicine',
  'Dose/Quantity',
]

type PrescriptionRow = {
  id: string
  values: string[]
}

type Spreadsheet = {
  id: string
  name: string
  records: number
  modified: string
}

const demoSheets: Spreadsheet[] = [
  { id: 'sheet-1', name: 'November 2026 Prescriptions', records: 24, modified: 'Updated today' },
  { id: 'sheet-2', name: 'October 2026 Prescriptions', records: 86, modified: 'Updated 2 days ago' },
  { id: 'sheet-3', name: 'Patient Records 2026', records: 142, modified: 'Updated 1 week ago' },
]

const demoRows: PrescriptionRow[] = [
  {
    id: 'row-1',
    values: ['1', '23/09', 'joijoi', '109/24', 'Telmisartan 40MG', '40 1-0-1 (60)'],
  },
  {
    id: 'row-2',
    values: ['2', '24/09', 'Patient 2', '110/24', 'Metformin 500MG', '1-0-1'],
  },
]

export default function Review() {
  const location = useLocation()
  const incomingSheetName = location.state?.sheetName as string | undefined
  const incomingSheetId = location.state?.sheetId as string | undefined

  const [sheets, setSheets] = useState(demoSheets)
  const [selectedSheet, setSelectedSheet] = useState<Spreadsheet | null>(null)
  const [rows, setRows] = useState<PrescriptionRow[]>(demoRows)
  const [search, setSearch] = useState('')
  const [dirty, setDirty] = useState(false)
  const [lastSaved, setLastSaved] = useState('All changes saved')
  const [deleteRowId, setDeleteRowId] = useState<string | null>(null)
  const [deleteSheet, setDeleteSheet] = useState(false)

  useEffect(() => {
    if (incomingSheetName) {
      setSelectedSheet({
        id: incomingSheetId || 'current-sheet',
        name: incomingSheetName,
        records: 0,
        modified: 'Just opened',
      })
      setRows([])
    }
  }, [incomingSheetName, incomingSheetId])

  const filteredSheets = useMemo(
    () => sheets.filter(sheet =>
      sheet.name.toLowerCase().includes(search.toLowerCase())
    ),
    [sheets, search]
  )

  const openSheet = (sheet: Spreadsheet) => {
    setSelectedSheet(sheet)
    setRows(demoRows)
    setDirty(false)
    setLastSaved('All changes saved')
  }

  const updateCell = (rowId: string, columnIndex: number, value: string) => {
    setRows(previous =>
      previous.map(row => {
        if (row.id !== rowId) return row
        const values = [...row.values]
        values[columnIndex] = value
        return { ...row, values }
      })
    )
    setDirty(true)
    setLastSaved('Unsaved changes')
  }

  const addRow = () => {
    const nextNumber = rows.length + 1
    setRows(previous => [
      ...previous,
      {
        id: crypto.randomUUID(),
        values: [String(nextNumber), '', '', '', '', ''],
      },
    ])
    setDirty(true)
    setLastSaved('Unsaved changes')
  }

  const confirmDeleteRow = () => {
    if (!deleteRowId) return
    setRows(previous =>
      previous
        .filter(row => row.id !== deleteRowId)
        .map((row, index) => ({
          ...row,
          values: [String(index + 1), ...row.values.slice(1)],
        }))
    )
    setDeleteRowId(null)
    setDirty(true)
    setLastSaved('Unsaved changes')
  }

  const saveChanges = async () => {
    // Connect this to the Google Sheets update endpoint in the backend stage.
    setLastSaved('Saving...')
    await new Promise(resolve => setTimeout(resolve, 400))
    setDirty(false)
    setLastSaved('All changes saved')
  }

  const downloadExcel = () => {
    // Connect to the genuine XLSX export endpoint when the backend is ready.
    alert('Excel export will be enabled when the backend is connected.')
  }

  const deleteCurrentSheet = () => {
    if (!selectedSheet) return
    setSheets(previous => previous.filter(sheet => sheet.id !== selectedSheet.id))
    setSelectedSheet(null)
    setDeleteSheet(false)
  }

  if (!selectedSheet) {
    return (
      <div className="page-container review-page">
        <div className="page-heading">
          <span className="eyebrow">WORKSPACE</span>
          <h1>Review</h1>
          <p>Open a spreadsheet to view and edit its prescription records.</p>
        </div>

        <div className="review-search">
          <Search size={17} />
          <input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Search spreadsheets..."
          />
        </div>

        <div className="review-sheet-list">
          {filteredSheets.map(sheet => (
            <button
              className="review-sheet-row"
              key={sheet.id}
              onClick={() => openSheet(sheet)}
            >
              <div className="review-sheet-icon">
                <FileSpreadsheet size={21} />
              </div>
              <div className="review-sheet-info">
                <strong>{sheet.name}</strong>
                <span>
                  <Clock3 size={12} />
                  {sheet.modified} · {sheet.records} records
                </span>
              </div>
              <ChevronRight size={18} />
            </button>
          ))}

          {filteredSheets.length === 0 && (
            <div className="review-list-empty">
              <FileSpreadsheet size={25} />
              <strong>No spreadsheets found</strong>
              <span>Try another search.</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="review-editor-page">
      <header className="review-editor-header">
        <button
          className="review-back-button"
          onClick={() => setSelectedSheet(null)}
        >
          <ArrowLeft size={17} />
          <span>Spreadsheets</span>
        </button>

        <div className="review-editor-title">
          <FileSpreadsheet size={19} />
          <strong>{selectedSheet.name}</strong>
        </div>

        <div className="review-save-state">
          {dirty ? <Clock3 size={14} /> : <Check size={14} />}
          <span>{lastSaved}</span>
        </div>
      </header>

      <main className="review-editor-content">
        <div className="review-editor-toolbar">
          <div>
            <h1>{selectedSheet.name}</h1>
            <p>{rows.length} records · Spreadsheet editor</p>
          </div>
          <button className="review-add-row" onClick={addRow}>
            <Plus size={16} /> Add row
          </button>
        </div>

        <div className="spreadsheet-grid-wrap">
          <table className="spreadsheet-grid">
            <thead>
              <tr>
                <th className="spreadsheet-row-number">#</th>
                {HEADERS.map(header => (
                  <th key={header}>{header}</th>
                ))}
                <th className="spreadsheet-actions-heading"> </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={row.id}>
                  <td className="spreadsheet-row-number">{rowIndex + 1}</td>
                  {row.values.map((value, columnIndex) => (
                    <td key={`${row.id}-${columnIndex}`}>
                      <input
                        value={value}
                        aria-label={`${HEADERS[columnIndex]}, row ${rowIndex + 1}`}
                        onChange={event =>
                          updateCell(row.id, columnIndex, event.target.value)
                        }
                      />
                    </td>
                  ))}
                  <td className="spreadsheet-actions-cell">
                    <button
                      onClick={() => setDeleteRowId(row.id)}
                      aria-label={`Delete row ${rowIndex + 1}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {rows.length === 0 && (
            <div className="spreadsheet-no-rows">
              No records yet. Add a row or process prescriptions first.
            </div>
          )}
        </div>

        <div className="review-editor-bottom-note">
          <span>{rows.length} rows</span>
          <span>6 columns</span>
          <span>Changes are editable in the grid</span>
        </div>
      </main>

      <footer className="review-editor-footer">
        <div className="review-footer-save">
          <button onClick={saveChanges} disabled={!dirty}>
            <Save size={16} /> Save changes
          </button>
          <span>{lastSaved}</span>
        </div>

        <div className="review-footer-actions">
          <button onClick={downloadExcel}>
            <Download size={16} /> Download .xlsx
          </button>
          <button onClick={() => setDeleteSheet(true)}>
            <Trash2 size={16} /> Delete sheet
          </button>
        </div>
      </footer>

      {(deleteRowId || deleteSheet) && (
        <div className="review-confirm-overlay">
          <div className="review-confirm-dialog">
            <h2>{deleteSheet ? 'Delete spreadsheet?' : 'Delete this row?'}</h2>
            <p>
              {deleteSheet
                ? `This will remove "${selectedSheet.name}" from your spreadsheet list.`
                : 'This row will be removed from the editor.'}
            </p>
            <div>
              <button
                onClick={() => {
                  setDeleteRowId(null)
                  setDeleteSheet(false)
                }}
              >
                Cancel
              </button>
              <button
                className="review-confirm-delete"
                onClick={deleteSheet ? deleteCurrentSheet : confirmDeleteRow}
              >
                Delete
              </button>
            </div>
            <button
              className="review-confirm-close"
              onClick={() => {
                setDeleteRowId(null)
                setDeleteSheet(false)
              }}
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
