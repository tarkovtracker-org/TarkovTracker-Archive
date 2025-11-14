/**
 * Deterministic Tarkov.dev hideout fixture.
 */

const STASH_STATION_ID = '5d484fc0654e76006657e0ab';
const CULTIST_CIRCLE_STATION_ID = '667298e75ea6b4493c08f266';

const HIDEOUT_STATIONS = [
  {
    id: STASH_STATION_ID,
    name: 'Stash',
    description: 'Fixture stash station',
    levels: [
      {
        id: 'stash-level-1',
        level: 1,
        itemRequirements: [{ id: 'stash-wood', count: 2 }],
      },
      {
        id: 'stash-level-2',
        level: 2,
        itemRequirements: [
          { id: 'stash-hinge', count: 4 },
          { id: 'stash-screw', count: 6 },
        ],
      },
    ],
  },
  {
    id: CULTIST_CIRCLE_STATION_ID,
    name: 'Cultist Circle',
    description: 'Fixture cultist circle station',
    levels: [
      {
        id: 'cultist-circle-1',
        level: 1,
        itemRequirements: [{ id: 'cultist-candle', count: 3 }],
      },
      {
        id: 'cultist-circle-2',
        level: 2,
        itemRequirements: [{ id: 'cultist-manual', count: 1 }],
      },
    ],
  },
] as const;

export const TARKOV_HIDEOUT_FIXTURE = {
  hideoutStations: HIDEOUT_STATIONS,
  data: HIDEOUT_STATIONS,
  lastUpdated: 'fixture',
  source: 'tarkov.dev-fixture',
} as const;
