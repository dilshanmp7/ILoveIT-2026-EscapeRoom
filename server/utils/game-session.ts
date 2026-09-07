import { randomUUID } from 'node:crypto'
import type { FinalScorePayload, GameSession } from '#shared/game/types'

export const ACCESS_COOKIE = 'courier_access'

interface AccessRecord {
  token: string
  createdAt: number
}

const accessRecords = new Map<string, AccessRecord>()
const sessions = new Map<string, GameSession & { accessToken: string }>()

export function createAccessToken() {
  const token = randomUUID()
  accessRecords.set(token, { token, createdAt: Date.now() })
  return token
}

export function isAccessTokenValid(token: string | undefined) {
  if (!token) return false
  const record = accessRecords.get(token)
  if (!record) return false
  if (Date.now() - record.createdAt > 1000 * 60 * 60 * 12) {
    accessRecords.delete(token)
    return false
  }
  return true
}

export function createGameSession(accessToken: string): GameSession {
  const now = new Date().toISOString()
  const session: GameSession & { accessToken: string } = {
    id: randomUUID(),
    status: 'active',
    score: 0,
    createdAt: now,
    updatedAt: now,
    accessToken,
  }
  sessions.set(session.id, session)
  return toPublicSession(session)
}

export function updateGameSession(id: string, accessToken: string, payload: FinalScorePayload) {
  const session = sessions.get(id)
  if (!session || session.accessToken !== accessToken) return null

  session.score = payload.score
  session.status = payload.completed === false ? 'active' : 'completed'
  session.updatedAt = new Date().toISOString()
  return toPublicSession(session)
}

function toPublicSession(session: GameSession & { accessToken: string }): GameSession {
  const { accessToken: _accessToken, ...publicSession } = session
  return publicSession
}
