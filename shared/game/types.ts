export type AssetType =
  | 'box_laptop'
  | 'box_server'
  | 'config_desk'
  | 'server_rack'
  | 'riddle'
  | 'delivery'
  | 'wall'
  | 'office_desk'
  | 'trash'
  | 'door'
  | 'key'

export interface MapAsset {
  id: string
  x: number
  z: number
  w: number
  d: number
  rotation: number
  color: number
  type: AssetType
  label: string
  allowGrab?: boolean
  keyId?: string
  requiredKeyIds?: string[]
  isOpen?: boolean
  actionType?: 'none' | 'config' | 'quiz' | 'deliver' | 'trash' | 'key'
  acceptsDrop?: string
  useAction?: 'none' | 'open_door' | 'quiz'
  useRequiredKey?: string
}

export interface QuizQuestion {
  q: string
  options: string[]
  correct: number
}

export interface GameSession {
  id: string
  status: 'active' | 'completed'
  score: number
  createdAt: string
  updatedAt: string
}

export interface AccessResponse {
  authenticated: boolean
}

export interface FinalScorePayload {
  score: number
  completed?: boolean
}
