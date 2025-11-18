import { computed } from 'vue';
import { useTarkovStore } from '@/stores/tarkov';

interface TraderRequirement {
  trader?: {
    id?: string;
    name?: string;
  };
  value?: string | number;
}

interface StationLevel {
  traderRequirements?: TraderRequirement[];
}

export function useTraderRequirements(nextLevel: StationLevel | null) {
  const tarkovStore = useTarkovStore();

  const isTraderRequirementMet = (requirement: TraderRequirement): boolean => {
    const traderId = requirement?.trader?.id;
    if (!traderId) return true;

    const rawReq = Number(requirement?.value);
    const requiredLevel = Number.isFinite(rawReq)
      ? Math.max(0, Math.min(10, Math.floor(rawReq)))
      : 0;

    const rawCur = Number(tarkovStore.getTraderLoyaltyLevel(traderId));
    const currentLevel = Number.isFinite(rawCur)
      ? Math.max(0, Math.min(10, Math.floor(rawCur)))
      : 0;

    return currentLevel >= requiredLevel;
  };

  const hasUnmetTraderRequirement = computed(() => {
    if (!nextLevel?.traderRequirements?.length) return false;
    return (nextLevel.traderRequirements ?? []).some((req) => !isTraderRequirementMet(req));
  });

  return {
    isTraderRequirementMet,
    hasUnmetTraderRequirement,
  };
}
