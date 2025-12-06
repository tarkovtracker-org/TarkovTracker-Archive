import { computed, type ComputedRef } from 'vue';
import { hideoutStations } from '@/composables/tarkovdata';
import { getCurrentGameModeData } from '../utils/gameModeHelpers';
import { GAME_EDITIONS, HIDEOUT_STATION_IDS } from '@/config/gameConstants';
import type { HideoutStation } from '@/types/tarkov';
import type { TeamStoresMap, HideoutLevelMap, CompletionsMap } from './types';
import type { Store } from 'pinia';
import type { UserProgressData, UserState } from '@/shared_state';

type GameEdition = (typeof GAME_EDITIONS)[keyof typeof GAME_EDITIONS];
const gameEditions: GameEdition[] = Object.values(GAME_EDITIONS);

export function createHideoutProgressGetters(stores: ComputedRef<TeamStoresMap>) {
  const hideoutLevels = computed<HideoutLevelMap>(() => {
    if (!hideoutStations.value || !stores.value) return {};
    return buildHideoutLevelMap(hideoutStations.value, stores.value);
  });

  const moduleCompletions = computed<CompletionsMap>(() => {
    const completions: CompletionsMap = {};
    if (!hideoutStations.value || !stores.value) return {};

    const allModuleIds = hideoutStations.value.flatMap(
      (station) => station.levels?.map((level) => level.id) || []
    );

    for (const moduleId of allModuleIds) {
      completions[moduleId] = {};
      for (const teamId of Object.keys(stores.value)) {
        const store = stores.value[teamId];
        const { currentData } = getCurrentGameModeData<UserProgressData | undefined>(store);
        completions[moduleId][teamId] = currentData?.hideoutModules?.[moduleId]?.complete ?? false;
      }
    }
    return completions;
  });

  const modulePartCompletions = computed<CompletionsMap>(() => {
    const completions: CompletionsMap = {};
    if (!hideoutStations.value || !stores.value) return {};

    const allPartIds = hideoutStations.value.flatMap(
      (station) =>
        station.levels?.flatMap((level) => level.itemRequirements?.map((req) => req.id) || []) || []
    );

    for (const partId of allPartIds) {
      completions[partId] = {};
      for (const teamId of Object.keys(stores.value)) {
        const store = stores.value[teamId];
        const { currentData } = getCurrentGameModeData<UserProgressData | undefined>(store);
        completions[partId][teamId] = currentData?.hideoutParts?.[partId]?.complete ?? false;
      }
    }
    return completions;
  });

  return { hideoutLevels, moduleCompletions, modulePartCompletions };
}

function gameEditionData(version: number) {
  return gameEditions.find((edition) => edition.version === version);
}

function buildHideoutLevelMap(stations: HideoutStation[], teamStores: TeamStoresMap) {
  return stations.reduce<HideoutLevelMap>((acc, station) => {
    if (!station?.id) return acc;
    acc[station.id] = Object.entries(teamStores).reduce<Record<string, number>>(
      (teamAcc, [teamId, store]) => {
        teamAcc[teamId] = calculateStationLevel(station, store);
        return teamAcc;
      },
      {}
    );
    return acc;
  }, {});
}

function calculateStationLevel(station: HideoutStation, store: Store<string, UserState>) {
  const { currentData } = getCurrentGameModeData<UserProgressData | undefined>(store);
  const modulesState = currentData?.hideoutModules ?? {};
  const manualLevel = computeMaxManualLevel(station, modulesState);

  if (station.id === HIDEOUT_STATION_IDS.STASH) {
    return calculateStashLevel(station, store, manualLevel);
  }

  if (station.id === HIDEOUT_STATION_IDS.CULTIST_CIRCLE) {
    return calculateCultistLevel(station, store, manualLevel);
  }

  return manualLevel;
}

function computeMaxManualLevel(
  station: HideoutStation,
  modulesState: Record<string, { complete?: boolean }>
) {
  if (!Array.isArray(station.levels)) return 0;
  return station.levels.reduce((max, level) => {
    if (level && level.id && modulesState[level.id]?.complete && typeof level.level === 'number') {
      return Math.max(max, level.level);
    }
    return max;
  }, 0);
}

function calculateStashLevel(
  station: HideoutStation,
  store: Store<string, UserState>,
  manualLevel: number
) {
  const gameEditionVersion = store?.$state?.gameEdition ?? 0;
  const edition = gameEditionData(gameEditionVersion);
  const defaultStashFromEdition = edition?.defaultStashLevel ?? 0;
  const maxLevel = station.levels?.length || 0;
  const effectiveStashLevel = Math.min(defaultStashFromEdition, maxLevel);
  if (effectiveStashLevel === maxLevel) {
    return maxLevel;
  }
  return Math.max(effectiveStashLevel, manualLevel);
}

function calculateCultistLevel(
  station: HideoutStation,
  store: Store<string, UserState>,
  manualLevel: number
) {
  const gameEditionVersion = store?.$state?.gameEdition ?? 0;
  const cultistUnlocked = gameEditionVersion === 5 || gameEditionVersion === 6;
  if (cultistUnlocked && station.levels?.length) {
    return station.levels.length;
  }
  return manualLevel;
}
