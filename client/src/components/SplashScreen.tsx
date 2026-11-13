
export default function SplashScreen() {
  return (
    <div className="splash-screen">
      <div className="splash-content">
        <img
          src="/logo.png"
          alt="AEGIS Logo"
          className="splash-logo"
        />

        <h1>AEGIS</h1>

        <p>From prescription to spreadsheet.</p>

        <div className="splash-loader">
          <span />
        </div>
      </div>

      <div className="splash-footer">
        Prescription Management System
      </div>
    </div>
  )
}
