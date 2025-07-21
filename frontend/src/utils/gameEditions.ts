export const GAME_EDITIONS = {
  1: 'Standard Edition',
  2: 'Left Behind Edition',
  3: 'Prepare for Escape Edition',
  4: 'Edge of Darkness Edition',
  5: 'Unheard Edition'
} as const

export function getEditionName(edition: number | undefined): string {
  if (!edition) return 'N/A'
  return GAME_EDITIONS[edition as keyof typeof GAME_EDITIONS] || `Edition ${edition}`
}