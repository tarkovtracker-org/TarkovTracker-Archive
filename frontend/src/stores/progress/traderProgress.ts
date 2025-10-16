import { computed, type ComputedRef } from 'vue';
import { traders } from '@/composables/tarkovdata';
import { getCurrentGameModeData } from '../utils/gameModeHelpers';
import type { UserProgressData } from '@/shared_state';
import type { TeamStoresMap, TraderLevelsMap, TraderStandingMap } from './types';

type TraderStandingEntry = { loyaltyLevel?: number; standing?: number } | undefined;

function buildTraderMetric(
  stores: ComputedRef<TeamStoresMap>,
  selector: (entry: TraderStandingEntry) => number
) {
  const result: Record<string, Record<string, number>> = {};
  if (!traders.value || !stores.value) {
    return result;
  }

  traders.value.forEach((trader) => {
    Object.entries(stores.value).forEach(([teamId, store]) => {
      if (!result[teamId]) {
        result[teamId] = {};
      }
      const { currentData } = getCurrentGameModeData<UserProgressData | undefined>(store);
      const traderData = currentData?.traderStandings ?? {};
      result[teamId][trader.id] = selector(traderData[trader.id]);
    });
  });

  return result;
}

export function createTraderProgressGetters(stores: ComputedRef<TeamStoresMap>) {
  const traderLevelsAchieved = computed<TraderLevelsMap>(() =>
    buildTraderMetric(stores, (entry) => entry?.loyaltyLevel ?? 0) as TraderLevelsMap
  );

  const traderStandings = computed<TraderStandingMap>(() =>
    buildTraderMetric(stores, (entry) => entry?.standing ?? 0) as TraderStandingMap
  );

  return { traderLevelsAchieved, traderStandings };
}
