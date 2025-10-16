export const GAME_EDITIONS = {
  STANDARD: { version: 1, value: 0.0, defaultStashLevel: 1 },
  LEFT_BEHIND: { version: 2, value: 0.0, defaultStashLevel: 2 },
  PREPARE_FOR_ESCAPE: { version: 3, value: 0.2, defaultStashLevel: 3 },
  EDGE_OF_DARKNESS: { version: 4, value: 0.2, defaultStashLevel: 4 },
  UNHEARD: { version: 5, value: 0.2, defaultStashLevel: 5 },
  UNHEARD_TRIAL: { version: 6, value: 0.2, defaultStashLevel: 5 },
} as const;

export const EOD_EDITIONS = new Set<number>([4, 6]);

export const HIDEOUT_STATION_IDS = {
  STASH: '5d484fc0654e76006657e0ab',
  CULTIST_CIRCLE: '667298e75ea6b4493c08f266',
} as const;

export const MAP_OBJECTIVE_TYPES = [
  'mark',
  'zone',
  'extract',
  'visit',
  'findItem',
  'findQuestItem',
  'plantItem',
  'plantQuestItem',
  'shoot',
] as const;

export const TRADER_ORDER = [
  'Prapor',
  'Therapist',
  'Fence',
  'Skier',
  'Peacekeeper',
  'Mechanic',
  'Ragman',
  'Jaeger',
  'Ref',
  'Lightkeeper',
  'BTR Driver',
] as const;
