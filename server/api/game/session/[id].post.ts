import { createError, getCookie, readBody } from 'h3'
import { ACCESS_COOKIE, isAccessTokenValid, updateGameSession } from '../../../utils/game-session'
import type { FinalScorePayload } from '#shared/game/types'

export default defineEventHandler(async (event) => {
  const accessToken = getCookie(event, ACCESS_COOKIE)
  if (!isAccessTokenValid(accessToken)) {
    throw createError({ statusCode: 401, statusMessage: 'Game access required' })
  }

  const body = await readBody<Partial<FinalScorePayload>>(event)
  if (typeof body?.score !== 'number' || !Number.isFinite(body.score) || body.score < 0 || body.score > 1_000_000) {
    throw createError({ statusCode: 400, statusMessage: 'Score must be a valid non-negative number' })
  }

  const session = updateGameSession(event.context.params?.id || '', accessToken!, {
    score: Math.round(body.score),
    completed: body.completed !== false,
  })

  if (!session) {
    throw createError({ statusCode: 404, statusMessage: 'Game session not found' })
  }

  return { session }
})
