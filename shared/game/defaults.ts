import type { MapAsset, QuizQuestion } from './types'

export const defaultMapLayout: MapAsset[] = [
  { id: 'c1', x: -4, z: -5.5, w: 1.5, d: 1.2, rotation: 0, color: 0x334155, type: 'box_laptop', label: 'Laptops Box', canHold: true, canPush: true, allowGrab: true, actionType: 'none', acceptsDrop: 'laptop', dropRule: { mode: 'types', types: ['laptop'], maxContents: 4 } },
  { id: 'c2', x: -2, z: -5.5, w: 1.5, d: 1.2, rotation: 0, color: 0x334155, type: 'box_laptop', label: 'Laptops Box', canHold: true, canPush: true, allowGrab: true, actionType: 'none', acceptsDrop: 'laptop', dropRule: { mode: 'types', types: ['laptop'], maxContents: 4 } },
  { id: 'c3', x: 0, z: -5.5, w: 1.5, d: 1.2, rotation: 0, color: 0x334155, type: 'box_server', label: 'Servers Box', canHold: true, canPush: true, allowGrab: true, actionType: 'none', acceptsDrop: 'server', dropRule: { mode: 'types', types: ['server'], maxContents: 4 } },
  { id: 'c5', x: -4, z: -2.5, w: 1.5, d: 1.2, rotation: 90, color: 0x1e293b, type: 'config_desk', label: 'Config Station 1', canHold: false, canPush: false, allowGrab: false, actionType: 'config', acceptsDrop: 'laptop', dropRule: { mode: 'types', types: ['laptop'] } },
  { id: 'admin_comp', x: -1.5, z: -2.5, w: 1.5, d: 1.2, rotation: 90, color: 0x2563eb, type: 'config_desk', label: 'Admin Terminal', canHold: false, canPush: false, allowGrab: false, useAction: 'quiz', useRequiredKey: 'ADMIN_KEY', acceptsDrop: 'none', dropRule: { mode: 'none' } },
  { id: 'c7', x: 4, z: -2.5, w: 1.5, d: 1.2, rotation: 270, color: 0x1e293b, type: 'server_rack', label: 'Server Rack A', canHold: false, canPush: false, allowGrab: false, actionType: 'config', acceptsDrop: 'server', dropRule: { mode: 'types', types: ['server'] } },
  { id: 'c9', x: 0, z: -1, w: 1.4, d: 1.4, rotation: 0, color: 0x1d4ed8, type: 'riddle', label: 'Security Terminal', allowGrab: false, actionType: 'quiz', acceptsDrop: '' },
  { id: 'c12', x: 6, z: 4.5, w: 1.2, d: 1.2, rotation: 0, color: 0x4b5563, type: 'trash', label: 'Recycle Bin', canHold: false, canPush: false, allowGrab: false, actionType: 'trash', acceptsDrop: 'any', dropRule: { mode: 'any' } },
  { id: 'c11', x: -4, z: 4.5, w: 2.5, d: 1.5, rotation: 0, color: 0xd40511, type: 'delivery', label: 'IT Dispatch Hatch', canHold: false, canPush: false, allowGrab: false, actionType: 'deliver', acceptsDrop: 'configured', dropRule: { mode: 'configured' } },
  { id: 'key_admin', x: -6.5, z: 2, w: 0.8, d: 0.8, rotation: 0, color: 0x0ea5e9, type: 'key', label: 'Admin Badge', canHold: true, canPush: false, allowGrab: true, keyId: 'ADMIN_KEY', actionType: 'key', acceptsDrop: 'none' },
  { id: 'key_slide', x: 6.5, z: 2, w: 0.8, d: 0.8, rotation: 0, color: 0xfacc15, type: 'key', label: 'Sliding Key', canHold: true, canPush: false, allowGrab: true, keyId: 'SLIDING_DOR_KEY', actionType: 'key', acceptsDrop: 'none' },
  { id: 'slide_door', x: 0, z: 2, w: 2.5, d: 0.4, rotation: 0, color: 0x3b82f6, type: 'door', label: 'Secure Sliding Door', allowGrab: false, useAction: 'open_door', useRequiredKey: 'SLIDING_DOR_KEY', isOpen: false },
  { id: 'w1', x: -8.5, z: 0, w: 0.5, d: 13, rotation: 0, color: 0x94a3b8, type: 'wall', label: 'Left Wall', allowGrab: false, actionType: 'none' },
  { id: 'w2', x: 8.5, z: 0, w: 0.5, d: 13, rotation: 0, color: 0x94a3b8, type: 'wall', label: 'Right Wall', allowGrab: false, actionType: 'none' },
  { id: 'w3', x: 0, z: 6.2, w: 17, d: 0.5, rotation: 0, color: 0x94a3b8, type: 'wall', label: 'Front Wall', allowGrab: false, actionType: 'none' },
]

export const defaultQuizzes: QuizQuestion[] = [
  { q: 'I have keys but no locks. I have space but no room. You can enter but not go outside. What am I?', options: ['Keyboard', 'Database', 'Warehouse', 'Van'], correct: 0 },
  { q: 'I have a screen but no face. I process data but have no brain. What am I?', options: ['Router', 'Monitor/Laptop', 'Scanner', 'Barcode'], correct: 1 },
  { q: 'What travels around the world but stays in one corner?', options: ['Email', 'IP Address', 'Postage Stamp', 'Data Packet'], correct: 2 },
]
