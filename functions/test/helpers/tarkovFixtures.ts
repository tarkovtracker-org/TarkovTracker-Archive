import { TARKOV_TASKS_FIXTURE } from '../fixtures/tarkovdata/tasks';
import { TARKOV_HIDEOUT_FIXTURE } from '../fixtures/tarkovdata/hideout';

type AnyRecord = Record<string, any>;

const clone = <T>(value: T): T => {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
};

const deepMerge = <T extends AnyRecord>(target: T, source: AnyRecord): T => {
  for (const [key, value] of Object.entries(source)) {
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      typeof (target as AnyRecord)[key] === 'object' &&
      !Array.isArray((target as AnyRecord)[key])
    ) {
      (target as AnyRecord)[key] = deepMerge({ ...(target as AnyRecord)[key] }, value as AnyRecord);
    } else {
      (target as AnyRecord)[key] = value;
    }
  }
  return target;
};

export const getTarkovSeedData = (): Record<string, any> => ({
  tarkovdata: {
    tasks: clone(TARKOV_TASKS_FIXTURE),
    hideout: clone(TARKOV_HIDEOUT_FIXTURE),
  },
});

export const createProgressDoc = (overrides: AnyRecord = {}): AnyRecord => {
  const base = {
    currentGameMode: 'pvp',
    pvp: {
      displayName: 'Fixture User',
      level: 15,
      gameEdition: 3,
      pmcFaction: 'USEC',
      taskCompletions: {},
      taskObjectives: {},
      hideoutModules: {},
      hideoutParts: {},
    },
  };
  return deepMerge(base, overrides);
};
