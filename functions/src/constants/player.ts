export const MAX_PLAYER_LEVEL = 79;

export const ALLOWED_PMC_FACTIONS = ['USEC', 'BEAR'] as const;

export type AllowedPmcFaction = (typeof ALLOWED_PMC_FACTIONS)[number];

export const OBJECTIVE_PROGRESS_STATES = ['completed', 'uncompleted'] as const;

export type ObjectiveProgressState = (typeof OBJECTIVE_PROGRESS_STATES)[number];
