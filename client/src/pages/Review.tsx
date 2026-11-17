
import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import {
  ArrowLeft,
  FileSpreadsheet,
  Plus,
  Trash2,
  Download,
  Check,
  Clock3,
  ChevronLeft,
  ChevronRight,
  Save,
  LayoutGrid,
  List,
  X,
  Search,
} from 'lucide-react'
import '../styles/Review.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

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
  modified: string
}

type ViewMode = 'excel' | 'form'
type Orientation = 'vertical' | 'horizontal'

type ApiSpreadsheet = {
  id: string
  name: string
  modifiedTime?: string | null
}

export default function Review() {
  const location = useLocation()

  const incomingSheetName = location.state?.sheetName as string | undefined
  const incomingSheetId = location.state?.sheetId as string | undefined

  const [sheets, setSheets] = useState<Spreadsheet[]>([])
  const [selectedSheet, setSelectedSheet] = useState<Spreadsheet | null>(null)
  const [rows, setRows] = useState<PrescriptionRow[]>([])

  const [search, setSearch] = useState('')
  const [loadingSheets, setLoadingSheets] = useState(true)
  const [loadingRows, setLoadingRows] = useState(false)
  const [sheetError, setSheetError] = useState('')
  const [rowError, setRowError] = useState('')

  const [viewMode, setViewMode] = useState<ViewMode>('excel')
  const [orientation, setOrientation] = useState<Orientation>('vertical')
  const [currentRow, setCurrentRow] = useState(0)

  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState('All changes saved')

  const [deleteRowId, setDeleteRowId] = useState<string | null>(null)
  const [deleteSheet, setDeleteSheet] = useState(false)
  const [deletingSheet, setDeletingSheet] = useState(false)

  // Fetch Google spreadsheets.
  const fetchSheets = async () => {
    try {
      setLoadingSheets(true)
      setSheetError('')

      const response = await fetch(`${API_URL}/api/sheets`)
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Unable to fetch spreadsheets')
      }

      const spreadsheetList: Spreadsheet[] = (
        data.spreadsheets as ApiSpreadsheet[]
      ).map(sheet => ({
        id: sheet.id,
        name: sheet.name || 'Untitled spreadsheet',
        modified: sheet.modifiedTime
          ? `Updated ${new Date(sheet.modifiedTime).toLocaleDateString()}`
          : 'Recently updated',
      }))

      setSheets(spreadsheetList)
    } catch (error) {
      setSheetError(
        error instanceof Error
          ? error.message
          : 'Unable to fetch spreadsheets'
      )
    } finally {
      setLoadingSheets(false)
    }
  }

  useEffect(() => {
    fetchSheets()
  }, [])

  // Load actual prescription rows from Google Sheets.
  const openSheet = async (sheet: Spreadsheet) => {
    setSelectedSheet(sheet)
    setRows([])
    setCurrentRow(0)
    setDirty(false)
    setRowError('')
    setLastSaved('Loading records...')
    setLoadingRows(true)

    try {
      const response = await fetch(
        `${API_URL}/api/sheets/${sheet.id}/rows`
      )

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Unable to load records')
      }

      setRows(
        (data.rows || []).map(
          (row: { id?: string; values: string[] }, index: number) => ({
            id: row.id || String(index + 1),
            values: Array.from(
              { length: 6 },
              (_, columnIndex) => String(row.values?.[columnIndex] ?? '')
            ),
          })
        )
      )

      setLastSaved('All changes saved')
    } catch (error) {
      setRowError(
        error instanceof Error ? error.message : 'Unable to load records'
      )
      setLastSaved('Unable to load records')
    } finally {
      setLoadingRows(false)
    }
  }

  // Open spreadsheet passed from Scan or another page.
  useEffect(() => {
    if (!incomingSheetId || !incomingSheetName) return

    openSheet({
      id: incomingSheetId,
      name: incomingSheetName,
      modified: 'Current spreadsheet',
    })
  }, [incomingSheetId, incomingSheetName])

  const filteredSheets = sheets.filter(sheet =>
    sheet.name.toLowerCase().includes(search.toLowerCase())
  )

  // Edit a cell. Both correction modes share this data.
  const updateCell = (
    rowId: string,
    columnIndex: number,
    value: string
  ) => {
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

  // Add a row without changing the current correction mode.
  const addRow = () => {
    const nextNumber = rows.length + 1

    const newRow: PrescriptionRow = {
      id: crypto.randomUUID(),
      values: [String(nextNumber), '', '', '', '', ''],
    }

    setRows(previous => [...previous, newRow])

    if (viewMode === 'form') {
      setCurrentRow(rows.length)
    }

    setDirty(true)
    setLastSaved('Unsaved changes')
  }

  // Delete a row.
  const deleteRow = () => {
    if (!deleteRowId) return

    const deletedIndex = rows.findIndex(row => row.id === deleteRowId)

    setRows(previous =>
      previous
        .filter(row => row.id !== deleteRowId)
        .map((row, index) => ({
          ...row,
          values: [String(index + 1), ...row.values.slice(1)],
        }))
    )

    if (deletedIndex !== -1 && deletedIndex <= currentRow) {
      setCurrentRow(previous => Math.max(0, previous - 1))
    }

    setDeleteRowId(null)
    setDirty(true)
    setLastSaved('Unsaved changes')
  }

  // Save all corrections to Google Sheets.
  const saveChanges = async () => {
    if (!selectedSheet || saving || !dirty) return

    try {
      setSaving(true)
      setLastSaved('Saving...')

      const response = await fetch(
        `${API_URL}/api/sheets/${selectedSheet.id}/rows`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ rows }),
        }
      )

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Unable to save changes')
      }

      setDirty(false)
      setLastSaved('All changes saved')
    } catch (error) {
      setLastSaved(
        error instanceof Error ? error.message : 'Save failed'
      )
    } finally {
      setSaving(false)
    }
  }

  // Delete the actual Google spreadsheet.
  const deleteCurrentSheet = async () => {
    if (!selectedSheet || deletingSheet) return

    try {
      setDeletingSheet(true)

      const response = await fetch(
        `${API_URL}/api/sheets/${selectedSheet.id}`,
        { method: 'DELETE' }
      )

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Unable to delete spreadsheet')
      }

      setSheets(previous =>
        previous.filter(sheet => sheet.id !== selectedSheet.id)
      )

      setSelectedSheet(null)
      setRows([])
      setDirty(false)
      setDeleteSheet(false)
    } catch (error) {
      alert(
        error instanceof Error ? error.message : 'Unable to delete spreadsheet'
      )
    } finally {
      setDeletingSheet(false)
    }
  }

  const downloadExcel = () => {
    alert('XLSX export endpoint is not connected yet.')
  }

  const goBackToSheets = () => {
    if (dirty) {
      const confirmed = window.confirm(
        'You have unsaved changes. Leave without saving?'
      )

      if (!confirmed) return
    }

    setSelectedSheet(null)
    setRows([])
    setDirty(false)
    setRowError('')
    fetchSheets()
  }

  const activeRow = rows[currentRow]

  // Spreadsheet selection screen.
  if (!selectedSheet) {
    return (
      <div className="page-container review-page">
        <div className="page-heading">
          <span className="eyebrow">WORKSPACE</span>
          <h1>Review</h1>
          <p>Open a spreadsheet to review and correct its records.</p>
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
          {loadingSheets && (
            <div className="review-list-empty">
              <Clock3 size={24} />
              <strong>Loading spreadsheets...</strong>
              <span>Fetching your Google Sheets.</span>
            </div>
          )}

          {!loadingSheets && sheetError && (
            <div className="review-list-empty">
              <FileSpreadsheet size={25} />
              <strong>Unable to load spreadsheets</strong>
              <span>{sheetError}</span>
              <button onClick={fetchSheets}>Try again</button>
            </div>
          )}

          {!loadingSheets &&
            !sheetError &&
            filteredSheets.map(sheet => (
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
                    {sheet.modified}
                  </span>
                </div>

                <ChevronRight size={18} />
              </button>
            ))}

          {!loadingSheets &&
            !sheetError &&
            filteredSheets.length === 0 && (
              <div className="review-list-empty">
                <FileSpreadsheet size={25} />
                <strong>
                  {search ? 'No spreadsheets found' : 'No spreadsheets yet'}
                </strong>
                <span>
                  {search
                    ? 'Try another search.'
                    : 'Create a spreadsheet or start a scanning session first.'}
                </span>
              </div>
            )}
        </div>
      </div>
    )
  }

  // Spreadsheet correction screen.
  return (
    <div className="review-editor-page">
      <header className="review-editor-header">
        <button
          className="review-back-button"
          onClick={goBackToSheets}
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
            <h1>Review records</h1>
            <p>{rows.length} records · Correction workspace</p>
          </div>

          <button
            className="review-add-row"
            onClick={addRow}
            disabled={loadingRows}
          >
            <Plus size={16} />
            Add row
          </button>
        </div>

        {/* Correction mode switch */}
        <div className="review-mode-toolbar">
          <div className="review-mode-switch">
            <button
              className={viewMode === 'excel' ? 'active' : ''}
              onClick={() => setViewMode('excel')}
            >
              <LayoutGrid size={16} />
              Excel view
            </button>

            <button
              className={viewMode === 'form' ? 'active' : ''}
              onClick={() => setViewMode('form')}
            >
              <List size={16} />
              Form view
            </button>
          </div>

          {/* Orientation applies only to Excel view */}
          {viewMode === 'excel' && (
            <div className="review-orientation-switch">
              <button
                className={orientation === 'vertical' ? 'active' : ''}
                onClick={() => setOrientation('vertical')}
              >
                Vertical
              </button>

              <button
                className={orientation === 'horizontal' ? 'active' : ''}
                onClick={() => setOrientation('horizontal')}
              >
                Horizontal
              </button>
            </div>
          )}
        </div>

        {/* Excel correction mode */}
        {viewMode === 'excel' && (
          <div
            className={`spreadsheet-grid-wrap ${orientation}`}
          >
            {loadingRows ? (
              <div className="spreadsheet-no-rows">
                Loading prescription records...
              </div>
            ) : rowError ? (
              <div className="spreadsheet-no-rows">
                {rowError}
                <button onClick={() => openSheet(selectedSheet)}>
                  Try again
                </button>
              </div>
            ) : (
              <>
                <table className="spreadsheet-grid">
                  <thead>
                    <tr>
                      <th className="spreadsheet-row-number">#</th>

                      {HEADERS.map(header => (
                        <th key={header}>{header}</th>
                      ))}

                      <th className="spreadsheet-actions-heading" />
                    </tr>
                  </thead>

                  <tbody>
                    {rows.map((row, rowIndex) => (
                      <tr key={row.id}>
                        <td className="spreadsheet-row-number">
                          {rowIndex + 1}
                        </td>

                        {row.values.map((value, columnIndex) => (
                          <td key={`${row.id}-${columnIndex}`}>
                            <input
                              value={value}
                              aria-label={`${HEADERS[columnIndex]}, row ${rowIndex + 1}`}
                              onChange={event =>
                                updateCell(
                                  row.id,
                                  columnIndex,
                                  event.target.value
                                )
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
                    No records available yet. Add a row or process
                    prescriptions first.
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Form correction mode */}
        {viewMode === 'form' && (
          <section className="review-form-card">
            {loadingRows ? (
              <div className="spreadsheet-no-rows">
                Loading prescription records...
              </div>
            ) : rowError ? (
              <div className="spreadsheet-no-rows">
                {rowError}
                <button onClick={() => openSheet(selectedSheet)}>
                  Try again
                </button>
              </div>
            ) : activeRow ? (
              <>
                <div className="review-form-heading">
                  <div>
                    <span className="eyebrow">PRESCRIPTION RECORD</span>
                    <h2>Record {currentRow + 1}</h2>
                  </div>

                  <button
                    className="review-delete-button"
                    onClick={() => setDeleteRowId(activeRow.id)}
                    aria-label="Delete current record"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="review-form-fields">
                  {HEADERS.map((header, index) => (
                    <label className="review-form-field" key={header}>
                      <span>{header}</span>
                      <input
                        value={activeRow.values[index]}
                        onChange={event =>
                          updateCell(
                            activeRow.id,
                            index,
                            event.target.value
                          )
                        }
                        placeholder={`Enter ${header.toLowerCase()}`}
                      />
                    </label>
                  ))}
                </div>

                <div className="review-form-navigation">
                  <button
                    className="review-nav-button"
                    disabled={currentRow === 0}
                    onClick={() =>
                      setCurrentRow(previous => previous - 1)
                    }
                  >
                    <ChevronLeft size={17} />
                    Previous
                  </button>

                  <span>
                    {currentRow + 1} of {rows.length}
                  </span>

                  <button
                    className="review-nav-button"
                    disabled={currentRow >= rows.length - 1}
                    onClick={() =>
                      setCurrentRow(previous => previous + 1)
                    }
                  >
                    Next
                    <ChevronRight size={17} />
                  </button>
                </div>
              </>
            ) : (
              <div className="spreadsheet-no-rows">
                No records available. Add a row to start reviewing.
              </div>
            )}
          </section>
        )}

        <div className="review-editor-bottom-note">
          <span>{rows.length} rows</span>
          <span>6 columns</span>
          <span>
            {viewMode === 'excel'
              ? `${orientation === 'vertical' ? 'Vertical' : 'Horizontal'} spreadsheet view`
              : 'One record at a time'}
          </span>
        </div>
      </main>

      <footer className="review-editor-footer">
        <div className="review-footer-save">
          <button
            onClick={saveChanges}
            disabled={!dirty || saving || loadingRows}
          >
            <Save size={16} />
            {saving ? 'Saving...' : 'Save changes'}
          </button>
          <span>{lastSaved}</span>
        </div>

        <div className="review-footer-actions">
          <button onClick={downloadExcel}>
            <Download size={16} />
            Download .xlsx
          </button>

          <button onClick={() => setDeleteSheet(true)}>
            <Trash2 size={16} />
            Delete spreadsheet
          </button>
        </div>
      </footer>

      {/* Delete row confirmation */}
      {deleteRowId && (
        <div className="review-confirm-overlay">
          <div className="review-confirm-dialog">
            <h2>Delete this row?</h2>
            <p>This record will be removed from the editor.</p>

            <div>
              <button onClick={() => setDeleteRowId(null)}>
                Cancel
              </button>

              <button
                className="review-confirm-delete"
                onClick={deleteRow}
              >
                Delete
              </button>
            </div>

            <button
              className="review-confirm-close"
              onClick={() => setDeleteRowId(null)}
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Delete spreadsheet confirmation */}
      {deleteSheet && (
        <div className="review-confirm-overlay">
          <div className="review-confirm-dialog">
            <h2>Delete spreadsheet?</h2>
            <p>
              This permanently deletes "{selectedSheet.name}" from Google
              Drive. This action cannot be undone.
            </p>

            <div>
              <button
                onClick={() => setDeleteSheet(false)}
                disabled={deletingSheet}
              >
                Cancel
              </button>

              <button
                className="review-confirm-delete"
                onClick={deleteCurrentSheet}
                disabled={deletingSheet}
              >
                {deletingSheet ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
