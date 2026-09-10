import type { QuizQuestion } from './types'

export const defaultQuizzes: QuizQuestion[] = [
  { q: 'I have keys but no locks. I have space but no room. You can enter but not go outside. What am I?', options: ['Keyboard', 'Database', 'Warehouse', 'Van'], correct: 0 },
  { q: 'I have a screen but no face. I process data but have no brain. What am I?', options: ['Router', 'Monitor/Laptop', 'Scanner', 'Barcode'], correct: 1 },
  { q: 'What travels around the world but stays in one corner?', options: ['Email', 'IP Address', 'Postage Stamp', 'Data Packet'], correct: 2 },
]
