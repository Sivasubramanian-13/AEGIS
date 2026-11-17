
import { useCallback, useEffect, useState } from 'react'
import {
  Cloud, RefreshCw, LogOut, Unplug, AlertCircle,
  X, ShieldCheck, LockKeyhole, Check, Info
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || ''

type GoogleUser = {
  name?: string
  email?: string
  picture?: string
}

type DialogType = 'disconnect' | 'signout' | null

export default function Settings() {
  const [user, setUser] = useState<GoogleUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [connectionError, setConnectionError] = useState(false)
  const [dialog, setDialog] = useState<DialogType>(null)
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  const showNotice = (message: string) => {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 3500)
  }

  const loadAccount = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/api/auth/me`, {
        credentials: 'include'
      })

      if (!response.ok) throw new Error('Unable to load account')

      const data = await response.json()
      const account = data.user ?? data

      if (!account.email) throw new Error('No connected account')

      setUser({
        name: account.name,
        email: account.email,
        picture: account.picture
      })
      setConnectionError(false)
    } catch {
      setUser(null)
      setConnectionError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAccount()
  }, [loadAccount])

  const handleAccountAction = async () => {
    if (!dialog) return

    setBusy(true)

    try {
      const response = await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      })

      if (!response.ok) throw new Error('Request failed')

      const action = dialog
      setDialog(null)
      setUser(null)
      setConnectionError(false)

      if (action === 'signout') {
        window.location.href = '/signin'
        return
      }

      showNotice('Google account disconnected successfully.')
    } catch {
      showNotice('Unable to complete the request. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page-container settings-page">
      <div className="page-heading">
        <span className="eyebrow">ACCOUNT</span>
        <h1>Settings</h1>
        <p>Manage your account, Google connection and privacy.</p>
      </div>

      {/* Account and Google */}
      <section className="settings-section">
        <div className="settings-section-heading">
          <div className="settings-section-icon"><Cloud size={18} /></div>
          <div>
            <h2>Account and Google</h2>
            <p>Manage your AEGIS account and Google Sheets connection.</p>
          </div>
        </div>

        <div className="settings-account-row">
          <div className="settings-profile">
            {user?.picture ? (
              <img
                src={user.picture}
                alt="Google profile"
                className="settings-avatar"
              />
            ) : (
              <div className="settings-avatar-placeholder">
                {user?.name?.charAt(0) || 'G'}
              </div>
            )}

            <div>
              <strong>
                {loading ? 'Loading account...' : user?.name || 'Not connected'}
              </strong>
              <span>{user?.email || 'No Google account connected'}</span>
              {user && <small className="settings-connected-label">Google account connected</small>}
            </div>
          </div>
        </div>

        <div className="settings-account-actions">
          {user ? (
            <>
              <button
                className="settings-outline-button"
                onClick={() => setDialog('disconnect')}
              >
                <Unplug size={15} /> Disconnect Google
              </button>

              <button
                className="settings-outline-button"
                onClick={() => setDialog('signout')}
              >
                <LogOut size={15} /> Sign out
              </button>
            </>
          ) : (
            <button
              className="settings-outline-button"
              disabled={loading}
              onClick={() => window.location.href = `${API_URL}/api/auth/google`}
            >
              Connect Google account
            </button>
          )}
        </div>

        {connectionError && !loading && (
          <div className="settings-connection-error">
            <AlertCircle size={18} />
            <div>
              <strong>Could not verify Google connection</strong>
              <p>Check your connection and try again.</p>
              <button onClick={loadAccount}>
                <RefreshCw size={14} /> Try again
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Privacy */}
      <section className="settings-section settings-privacy-section">
        <div className="settings-section-heading">
          <div className="settings-section-icon"><ShieldCheck size={18} /></div>
          <div>
            <h2>Privacy and accuracy</h2>
            <p>How AEGIS handles prescription information.</p>
          </div>
        </div>

        <div className="settings-privacy-item">
          <LockKeyhole size={17} />
          <div>
            <strong>Patient information is sensitive</strong>
            <p>
              Keep prescription records and exported files private.
              Only share them with authorised people.
            </p>
          </div>
        </div>

        <div className="settings-privacy-item">
          <ShieldCheck size={17} />
          <div>
            <strong>Image retention</strong>
            <p>
              Temporary prescription images should be removed after processing.
              Actual retention depends on the backend implementation.
            </p>
          </div>
        </div>

        <div className="settings-privacy-item">
          <Check size={17} />
          <div>
            <strong>Verify extracted records</strong>
            <p>
              Handwriting recognition can make mistakes. Review patient details,
              medicine names and quantities before using the spreadsheet.
            </p>
          </div>
        </div>
      </section>

      {/* About */}
      <section className="settings-section">
        <div className="settings-section-heading">
          <div className="settings-section-icon"><Info size={18} /></div>
          <div>
            <h2>About AEGIS</h2>
            <p>
              AEGIS is a prescription scanning and spreadsheet management
              application designed to simplify prescription data entry.
              Version 1.0.0
            </p>
          </div>
        </div>
      </section>

      <div className="settings-version">
        AEGIS · Prescription Management System
      </div>

      {notice && (
        <div className="settings-notice" role="status">
          <span>{notice}</span>
          <button onClick={() => setNotice('')} aria-label="Dismiss">
            <X size={15} />
          </button>
        </div>
      )}

      {dialog && (
        <div className="settings-dialog-overlay">
          <div className="settings-dialog" role="dialog" aria-modal="true">
            <button
              className="settings-dialog-close"
              onClick={() => setDialog(null)}
              aria-label="Close"
            >
              <X size={17} />
            </button>

            <div className="settings-dialog-icon">
              {dialog === 'disconnect' ? <Unplug size={22} /> : <LogOut size={22} />}
            </div>

            <h2>
              {dialog === 'disconnect'
                ? 'Disconnect Google account?'
                : 'Sign out of AEGIS?'}
            </h2>

            <p>
              {dialog === 'disconnect'
                ? 'Your Google Sheets connection will be removed. You will need to reconnect to access your spreadsheets.'
                : 'You will be signed out and redirected to the sign-in page.'}
            </p>

            <div className="settings-dialog-actions">
              <button onClick={() => setDialog(null)} disabled={busy}>
                Cancel
              </button>
              <button
                className="settings-dialog-confirm"
                onClick={handleAccountAction}
                disabled={busy}
              >
                {busy ? 'Please wait...' : dialog === 'disconnect' ? 'Disconnect' : 'Sign out'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
