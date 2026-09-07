import type { GameSession, MapAsset } from '#shared/game/types'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import seedFloorplan from '../data/floorplan.json'

let database: DatabaseSync | undefined

function getDatabase() {
  if (database) return database

  const filePath = process.env.NUXT_GAME_DB_PATH || join(process.cwd(), 'data', 'courier.sqlite')
  mkdirSync(dirname(filePath), { recursive: true })
  database = new DatabaseSync(filePath)
  database.exec(`
    CREATE TABLE IF NOT EXISTS floorplans (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      layout_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS game_sessions (
      id TEXT PRIMARY KEY,
      access_token TEXT NOT NULL,
      status TEXT NOT NULL,
      score INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `)

  const existing = database.prepare('SELECT id FROM floorplans WHERE id = ?').get('main')
  if (!existing) {
    const now = new Date().toISOString()
    database.prepare('INSERT INTO floorplans (id, name, layout_json, updated_at) VALUES (?, ?, ?, ?)').run(
      'main',
      'Main dispatch floor',
      JSON.stringify(seedFloorplan),
      now,
    )
  }

  return database
}

export function readFloorplan(): MapAsset[] {
  const row = getDatabase().prepare('SELECT layout_json FROM floorplans WHERE id = ?').get('main') as { layout_json: string } | undefined
  return row ? JSON.parse(row.layout_json) as MapAsset[] : structuredClone(seedFloorplan) as MapAsset[]
}

export function writeFloorplan(layout: MapAsset[]) {
  const updatedAt = new Date().toISOString()
  getDatabase().prepare('UPDATE floorplans SET layout_json = ?, updated_at = ? WHERE id = ?').run(JSON.stringify(layout), updatedAt, 'main')
  return { id: 'main', name: 'Main dispatch floor', layout, updatedAt }
}

export function insertGameSession(session: GameSession, accessToken: string) {
  getDatabase().prepare(`INSERT INTO game_sessions (id, access_token, status, score, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`).run(
    session.id, accessToken, session.status, session.score, session.createdAt, session.updatedAt,
  )
}

export function updateStoredSession(id: string, accessToken: string, score: number, status: GameSession['status'], updatedAt: string) {
  const result = getDatabase().prepare('UPDATE game_sessions SET score = ?, status = ?, updated_at = ? WHERE id = ? AND access_token = ?').run(score, status, updatedAt, id, accessToken)
  if (!result.changes) return null
  return getDatabase().prepare('SELECT id, status, score, created_at AS createdAt, updated_at AS updatedAt FROM game_sessions WHERE id = ?').get(id) as GameSession
}
