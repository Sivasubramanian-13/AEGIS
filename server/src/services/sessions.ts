
import { randomUUID } from 'node:crypto'
import {
  mkdir,
  readFile,
  rename,
  writeFile,
} from 'node:fs/promises'
import path from 'node:path'

export type SessionStatus =
  | 'processing'
  | 'review'
  | 'completed'
  | 'failed'

export type ScanSession = {
  id: string
  sheetId: string
  sheetName: string
  startedAt: string
  updatedAt: string
  totalImages: number
  saved: number
  needsReview: number
  failed: number
  status: SessionStatus
}

const dataDirectory = path.resolve(process.cwd(), 'data')
const sessionsPath = path.join(dataDirectory, 'sessions.json')
const temporaryPath = path.join(dataDirectory, 'sessions.tmp.json')

let writeQueue: Promise<void> = Promise.resolve()

async function readSessions(): Promise<ScanSession[]> {
  try {
    const content = await readFile(sessionsPath, 'utf-8')
    const sessions = JSON.parse(content) as Array<ScanSession & { images?: unknown }>

    // Remove the old images array from existing session records.
    return sessions.map(({ images, ...session }) => session)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return []
    }
    throw error
  }
}

async function writeSessions(sessions: ScanSession[]) {
  await mkdir(dataDirectory, { recursive: true })
  await writeFile(temporaryPath, JSON.stringify(sessions, null, 2), 'utf-8')
  await rename(temporaryPath, sessionsPath)
}

async function mutateSessions<T>(
  operation: (sessions: ScanSession[]) => T
): Promise<T> {
  const task = writeQueue.then(async () => {
    const sessions = await readSessions()
    const result = operation(sessions)
    await writeSessions(sessions)
    return result
  })

  writeQueue = task.then(() => undefined, () => undefined)
  return task
}

function refreshStatus(session: ScanSession) {
  const processed =
    session.saved + session.needsReview + session.failed

  if (session.totalImages === 0 || processed < session.totalImages) {
    session.status = 'processing'
  } else if (session.needsReview > 0) {
    session.status = 'review'
  } else if (session.saved === 0 && session.failed > 0) {
    session.status = 'failed'
  } else {
    session.status = 'completed'
  }

  session.updatedAt = new Date().toISOString()
}

export async function createSession(input: {
  sheetId: string
  sheetName: string
  totalImages?: number
}) {
  const now = new Date().toISOString()

  const session: ScanSession = {
    id: randomUUID(),
    sheetId: input.sheetId,
    sheetName: input.sheetName,
    startedAt: now,
    updatedAt: now,
    totalImages: input.totalImages ?? 0,
    saved: 0,
    needsReview: 0,
    failed: 0,
    status: 'processing',
  }

  return mutateSessions(sessions => {
    sessions.unshift(session)
    return session
  })
}

export async function updateSession(
  sessionId: string,
  updates: Partial<
    Pick<
      ScanSession,
      'totalImages' | 'saved' | 'needsReview' | 'failed'
    >
  >
) {
  return mutateSessions(sessions => {
    const session = sessions.find(item => item.id === sessionId)
    if (!session) return null

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        session[key as keyof typeof updates] = value as never
      }
    }

    refreshStatus(session)
    return session
  })
}

export async function getSessions() {
  await writeQueue
  return readSessions()
}

export async function getSession(sessionId: string) {
  const sessions = await getSessions()
  return sessions.find(session => session.id === sessionId) || null
}

export async function deleteSession(sessionId: string) {
  return mutateSessions(sessions => {
    const index = sessions.findIndex(session => session.id === sessionId)
    if (index === -1) return false

    sessions.splice(index, 1)
    return true
  })
}
