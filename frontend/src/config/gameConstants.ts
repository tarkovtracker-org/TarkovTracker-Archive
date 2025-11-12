export const GAME_EDITIONS = {
  STANDARD: { version: 1, value: 0.0, defaultStashLevel: 1 },
  LEFT_BEHIND: { version: 2, value: 0.0, defaultStashLevel: 2 },
  PREPARE_FOR_ESCAPE: { version: 3, value: 0.2, defaultStashLevel: 3 },
  EDGE_OF_DARKNESS: { version: 4, value: 0.2, defaultStashLevel: 4 },
  UNHEARD: { version: 5, value: 0.2, defaultStashLevel: 5 },
  UNHEARD_TRIAL: { version: 6, value: 0.2, defaultStashLevel: 5 },
} as const;
export const EOD_EDITIONS = new Set<number>([4, 6]);
// Unheard editions (Unheard and Unheard+EOD) - used for Cultist Circle station
export const UNHEARD_EDITIONS = new Set<number>([
  GAME_EDITIONS.UNHEARD.version,
  GAME_EDITIONS.UNHEARD_TRIAL.version,
]);
export const DISABLED_TASK_IDS: ReadonlyArray<string> = [
  '61e6e5e0f5b9633f6719ed95',
  '61e6e60223374d168a4576a6',
  '61e6e621bfeab00251576265',
  '61e6e615eea2935bc018a2c5',
  '61e6e60c5ca3b3783662be27',
];
export const EOD_ONLY_TASK_IDS: ReadonlySet<string> = new Set<string>([
  '666314b4d7f171c4c20226c3',
  '666314b0acf8442f8b0531a1',
  '666314b696a9349baa021bac',
  '666314b8312343839d032d24',
  '666314bafd5ca9577902e03a',
  '666314bc1d3ec95634095e77',
  '666314bd920800278d0f6748',
  '666314bf1cd52e3d040a2e78',
  '666314c10aa5c7436c00908c',
  '666314c3acf8442f8b0531a3',
  '666314c5a9290f9e0806cca5',
]);
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
// UI Constants
export const TASK_CARD_HEIGHT = 203 as const;
// Skeleton loader configuration for task lists (CLS optimization)
export const SKELETON_CONFIG = {
  CARD_HEIGHT: TASK_CARD_HEIGHT, // Height matches --task-card-min-height CSS custom property (numeric for calculations)
  CARD_VERTICAL_SPACING: 16, // Vertical spacing between skeleton cards in pixels
  MIN_SKELETONS: 3, // Minimum number of skeleton cards to show
  MAX_SKELETONS: 20, // Maximum number of skeleton cards to show
  MIN_SKELETON_DURATION: 400, // Minimum time (ms) to show skeleton to avoid flicker
} as const;
// Individual exports for easy importing
export const SKELETON_CARD_HEIGHT = SKELETON_CONFIG.CARD_HEIGHT;
export const SKELETON_CARD_VERTICAL_SPACING = SKELETON_CONFIG.CARD_VERTICAL_SPACING;
export const MIN_SKELETONS = SKELETON_CONFIG.MIN_SKELETONS;
export const MAX_SKELETONS = SKELETON_CONFIG.MAX_SKELETONS;
export const MIN_SKELETON_DURATION = SKELETON_CONFIG.MIN_SKELETON_DURATION;
