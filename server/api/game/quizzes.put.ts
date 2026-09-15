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
    && quiz.options.every(option => option && typeof option === 'object'
      && Number.isInteger(option.id) && typeof option.text === 'string' && option.text.trim().length > 0)
    && new Set(quiz.options.map(option => option.id)).size === quiz.options.length
    && Number.isInteger(quiz.correct) && quiz.options.some(option => option.id === quiz.correct)
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