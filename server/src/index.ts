
import app from './app.js'
import { config } from './config.js'
import { loadGoogleTokens } from './services/googleSheets.js'

async function startServer() {
  try {
    const connected = await loadGoogleTokens()

    console.log(
      connected
        ? 'Google account restored successfully'
        : 'Google account not connected yet'
    )

    app.listen(config.port, () => {
      console.log(
        `Backend running at http://localhost:${config.port}`
      )
    })
  } catch (error) {
    console.error('Server startup failed:', error)
    process.exit(1)
  }
}

startServer()
