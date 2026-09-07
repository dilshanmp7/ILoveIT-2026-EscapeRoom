import type { MapAsset } from '#shared/game/types'
import { createError, getCookie, readBody } from 'h3'
import { isEditorAuthorized } from '../../utils/editor-access'
import { writeFloorplan } from '../../utils/game-database'
import { ACCESS_COOKIE, isAccessTokenValid } from '../../utils/game-session'

function isMapAsset(value: unknown): value is MapAsset {
  if (!value || typeof value !== 'object') return false
  const asset = value as Partial<MapAsset>
  return typeof asset.id === 'string'
    && typeof asset.x === 'number'
    && typeof asset.z === 'number'
    && typeof asset.w === 'number'
    && typeof asset.d === 'number'
    && typeof asset.rotation === 'number'
    && typeof asset.type === 'string'
    && typeof asset.label === 'string'
}

export default defineEventHandler(async (event) => {
  if (!isAccessTokenValid(getCookie(event, ACCESS_COOKIE)) && !isEditorAuthorized(event)) {
    throw createError({ statusCode: 401, statusMessage: 'Game access required' })
  }

  const body = await readBody<{ layout?: unknown }>(event)
  if (!Array.isArray(body?.layout) || body.layout.length > 100 || !body.layout.every(isMapAsset)) {
    throw createError({ statusCode: 400, statusMessage: 'A valid floorplan layout is required' })
  }

  return { floorplan: writeFloorplan(body.layout) }
})
