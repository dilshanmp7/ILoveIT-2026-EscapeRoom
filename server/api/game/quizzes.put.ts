import type { QuizQuestion } from '#shared/game/types'
import { createError, getCookie, readBody } from 'h3'
import { isEditorAuthorized } from '../../utils/editor-access'
import { writeQuizzes } from '../../utils/game-database'
import { ACCESS_COOKIE, isAccessTokenValid } from '../../utils/game-session'

function isQuiz(value: unknown): value is QuizQuestion {
  if (!value || typeof value !== 'object') return false
  const quiz = value as Partial<QuizQuestion>
  return typeof quiz.q === 'string' && quiz.q.trim().length > 0
    && Array.isArray(quiz.options) && quiz.options.length === 4
    && quiz.options.every(option => typeof option === 'string' && option.trim().length > 0)
    && Number.isInteger(quiz.correct) && quiz.correct >= 0 && quiz.correct < 4
}

export default defineEventHandler(async (event) => {
  if (!isEditorAuthorized(event) && !isAccessTokenValid(getCookie(event, ACCESS_COOKIE))) {
    throw createError({ statusCode: 401, statusMessage: 'Game access required' })
  }
  const body = await readBody<{ quizzes?: unknown }>(event)
  if (!Array.isArray(body?.quizzes) || body.quizzes.length > 100 || !body.quizzes.every(isQuiz)) {
    throw createError({ statusCode: 400, statusMessage: 'A valid security check pool is required' })
  }
  return { quizSet: writeQuizzes(body.quizzes) }
})