import type { Floorplan, GameSession, MapAsset, QuizQuestion } from '#shared/game/types'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import seedFloorplan from '../../public/game/defaultLayout.json'
import { defaultQuizzes } from '../../shared/game/defaults'

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
    CREATE TABLE IF NOT EXISTS quiz_sets (
      id TEXT PRIMARY KEY,
      quizzes_json TEXT NOT NULL,
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

  const quizSet = database.prepare('SELECT id FROM quiz_sets WHERE id = ?').get('main')
  if (!quizSet) {
    database.prepare('INSERT INTO quiz_sets (id, quizzes_json, updated_at) VALUES (?, ?, ?)').run('main', JSON.stringify(defaultQuizzes), new Date().toISOString())
  }

  return database
}

export function readQuizzes(): QuizQuestion[] {
  const row = getDatabase().prepare('SELECT quizzes_json FROM quiz_sets WHERE id = ?').get('main') as { quizzes_json: string } | undefined
  return row ? JSON.parse(row.quizzes_json) as QuizQuestion[] : structuredClone(defaultQuizzes)
}

export function writeQuizzes(quizzes: QuizQuestion[]) {
  const updatedAt = new Date().toISOString()
  getDatabase().prepare('UPDATE quiz_sets SET quizzes_json = ?, updated_at = ? WHERE id = ?').run(JSON.stringify(quizzes), updatedAt, 'main')
  return { id: 'main', quizzes, updatedAt }
}

export function readFloorplan(): Floorplan {
  const row = getDatabase().prepare('SELECT layout_json FROM floorplans WHERE id = ?').get('main') as { layout_json: string } | undefined
  const value = row ? JSON.parse(row.layout_json) as Floorplan | MapAsset[] : structuredClone(seedFloorplan) as MapAsset[]
  return Array.isArray(value) ? { layout: value, playerSpawn: { x: 0, z: 2 } } : { ...value, playerSpawn: value.playerSpawn || { x: 0, z: 2 } }
}

export function writeFloorplan(floorplan: Floorplan) {
  const updatedAt = new Date().toISOString()
  getDatabase().prepare('UPDATE floorplans SET layout_json = ?, updated_at = ? WHERE id = ?').run(JSON.stringify(floorplan), updatedAt, 'main')
  return { id: 'main', name: 'Main dispatch floor', ...floorplan, updatedAt }
}

export function resetFloorplan() {
  return writeFloorplan({ layout: structuredClone(seedFloorplan) as MapAsset[], playerSpawn: { x: 0, z: 2 } })
}

export function insertGameSession(session: GameSession, accessToken: string) {
  getDatabase().prepare(`INSERT INTO game_sessions (id, access_token, status, score, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`).run(
    session.id, accessToken, session.status, session.score, session.createdAt, session.updatedAt,
  )
}

export function updateStoredSession(id: string, accessToken: string, score: number, status: GameSession['status'], updatedAt: string) {
  const result = getDatabase().prepare('UPDATE game_sessions SET score = ?, status = ?, updated_at = ? WHERE id = ? AND access_token = ?').run(score, status, updatedAt, id, accessToken)
  if (!result.changes) return null
  const row = getDatabase().prepare('SELECT id, status, score, created_at AS createdAt, updated_at AS updatedAt FROM game_sessions WHERE id = ?').get(id) as Record<string, unknown> | undefined
  if (!row || typeof row.id !== 'string' || (row.status !== 'active' && row.status !== 'completed') || typeof row.score !== 'number' || typeof row.createdAt !== 'string' || typeof row.updatedAt !== 'string') return null
  return { id: row.id, status: row.status, score: row.score, createdAt: row.createdAt, updatedAt: row.updatedAt } satisfies GameSession
}
