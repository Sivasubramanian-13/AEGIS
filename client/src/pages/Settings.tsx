
import { useState } from 'react'
import {
  Sun,
  Moon,
  Monitor,
  Check,
  ShieldCheck,
  Sparkles,
  Cloud,
  RefreshCw,
  LogOut,
  Unplug,
  AlertCircle,
  X,
  User,
  LockKeyhole,
} from 'lucide-react'

type Appearance = 'light' | 'dark' | 'system'
type Provider = 'gemini' | 'groq'
type DialogType = 'disconnect' | 'signout' | null

export default function Settings() {
  const [appearance, setAppearance] = useState<Appearance>('system')
  const [provider, setProvider] = useState<Provider>('gemini')
  const [googleConnected, setGoogleConnected] = useState(true)
  const [connectionError, setConnectionError] = useState(true)
  const [dialog, setDialog] = useState<DialogType>(null)
  const [notice, setNotice] = useState('')

  const showNotice = (message: string) => {
    setNotice(message)
  }

  const retryGoogleConnection = () => {
    showNotice('Connection testing will be available after the Google Sheets backend is connected.')
  }

  const confirmDialog = () => {
    if (dialog === 'disconnect') {
      setGoogleConnected(false)
      setConnectionError(false)
      showNotice('Google account disconnected in this preview.')
    }

    if (dialog === 'signout') {
      showNotice('Sign out will be connected to authentication in the backend stage.')
    }

    setDialog(null)
  }

  return (
    <div className="page-container settings-page">
      <div className="page-heading">
        <span className="eyebrow">PREFERENCES</span>
        <h1>Settings</h1>
        <p>Appearance, AI provider, your Google account and privacy.</p>
      </div>

      {/* Appearance */}
      <section className="settings-section">
        <div className="settings-section-heading">
          <div className="settings-section-icon">
            <Sun size={18} />
          </div>
          <div>
            <h2>Appearance</h2>
            <p>Applies to every screen, dialog and the camera.</p>
          </div>
        </div>

        <div className="settings-choice-list">
          {([
            { value: 'light', label: 'Light', icon: Sun },
            { value: 'dark', label: 'Dark', icon: Moon },
            { value: 'system', label: 'System', icon: Monitor },
          ] as const).map(option => {
            const Icon = option.icon
            const selected = appearance === option.value

            return (
              <button
                key={option.value}
                className={`settings-choice ${selected ? 'selected' : ''}`}
                onClick={() => setAppearance(option.value)}
              >
                <span className="settings-radio">
                  {selected && <span />}
                </span>
                <Icon size={17} />
                <span>{option.label}</span>
                {selected && <Check className="settings-selected-check" size={16} />}
              </button>
            )
          })}
        </div>
      </section>

      {/* AI provider */}
      <section className="settings-section">
        <div className="settings-section-heading">
          <div className="settings-section-icon">
            <Sparkles size={18} />
          </div>
          <div>
            <h2>AI provider</h2>
            <p>Choose which vision model processes prescription images. API keys stay on the server.</p>
          </div>
        </div>

        <div className="settings-choice-list">
          <button
            className={`settings-provider-choice ${provider === 'gemini' ? 'selected' : ''}`}
            onClick={() => setProvider('gemini')}
          >
            <span className="settings-radio">
              {provider === 'gemini' && <span />}
            </span>
            <span className="settings-provider-details">
              <strong>Gemini</strong>
              <span>Configured · Server default</span>
            </span>
            {provider === 'gemini' && (
              <Check className="settings-selected-check" size={16} />
            )}
          </button>

          <button
            className={`settings-provider-choice ${provider === 'groq' ? 'selected' : ''}`}
            onClick={() => setProvider('groq')}
          >
            <span className="settings-radio">
              {provider === 'groq' && <span />}
            </span>
            <span className="settings-provider-details">
              <strong>Groq</strong>
              <span>Configured</span>
            </span>
            {provider === 'groq' && (
              <Check className="settings-selected-check" size={16} />
            )}
          </button>
        </div>
        <p className="settings-helper">
          Provider selection is a frontend preference until the backend provider configuration is connected.
        </p>
      </section>

      {/* Google account */}
      <section className="settings-section">
        <div className="settings-section-heading">
          <div className="settings-section-icon">
            <Cloud size={18} />
          </div>
          <div>
            <h2>Google account and Sheets</h2>
            <p>
              Records are saved to spreadsheets in your own Google Drive.
              AEGIS only accesses spreadsheets it creates or that you explicitly open with it.
            </p>
          </div>
        </div>

        <div className="settings-account-row">
          <div>
            <strong>{googleConnected ? 'Connected' : 'Not connected'}</strong>
            <span>{googleConnected ? 'siddharth.work6@gmail.com' : 'Connect your Google account to continue.'}</span>
          </div>

          {googleConnected ? (
            <button
              className="settings-outline-button"
              onClick={() => setDialog('disconnect')}
            >
              <Unplug size={15} />
              Disconnect
            </button>
          ) : (
            <button
              className="settings-outline-button"
              onClick={() => showNotice('Google OAuth connection will be enabled in the backend stage.')}
            >
              Connect
            </button>
          )}
        </div>

        {googleConnected && connectionError && (
          <div className="settings-connection-error">
            <AlertCircle size={18} />
            <div>
              <strong>Could not reach Google Sheets</strong>
              <p>Google Sheets could not be updated. Nothing was lost; try again.</p>
              <button onClick={retryGoogleConnection}>
                <RefreshCw size={14} />
                Try again
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Account */}
      <section className="settings-section">
        <div className="settings-section-heading">
          <div className="settings-section-icon">
            <User size={18} />
          </div>
          <div>
            <h2>Account</h2>
            <p>Your AEGIS account details.</p>
          </div>
        </div>

        <div className="settings-account-row">
          <div>
            <strong>Siddharth V</strong>
            <span>siddharth.work6@gmail.com</span>
          </div>
          <button
            className="settings-outline-button"
            onClick={() => setDialog('signout')}
          >
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      </section>

      {/* Privacy */}
      <section className="settings-section settings-privacy-section">
        <div className="settings-section-heading">
          <div className="settings-section-icon">
            <ShieldCheck size={18} />
          </div>
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
              Prescription photos and extracted patient details must be handled securely.
              Avoid sharing exported files or account access with unauthorized people.
            </p>
          </div>
        </div>

        <div className="settings-privacy-item">
          <ShieldCheck size={17} />
          <div>
            <strong>Image retention</strong>
            <p>
              The intended workflow is to remove temporary server images after processing.
              Retention behaviour will be enforced by the backend.
            </p>
          </div>
        </div>

        <div className="settings-privacy-item">
          <Check size={17} />
          <div>
            <strong>Always verify extracted records</strong>
            <p>
              Handwriting recognition can make mistakes. Review medicine names,
              strengths and quantities before relying on the spreadsheet.
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
                ? 'AEGIS will no longer be able to access your Google Sheets until you reconnect.'
                : 'You will need to sign in again to access your prescription records.'}
            </p>

            <div className="settings-dialog-actions">
              <button onClick={() => setDialog(null)}>Cancel</button>
              <button className="settings-dialog-confirm" onClick={confirmDialog}>
                {dialog === 'disconnect' ? 'Disconnect' : 'Sign out'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
