import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useTarkovStore } from '@/stores/tarkov';
import { STASH_STATION_ID, CULTIST_CIRCLE_STATION_ID } from '@/stores/progress';
import { UNHEARD_EDITIONS } from '@/config/gameConstants';
import { useProgressQueries } from '@/composables/useProgressQueries';

interface StationLevel {
  id: string;
  level: number;
  itemRequirements?: Array<{
    id: string;
    count: number;
  }>;
}

interface Station {
  id: string;
  name: string;
  levels: StationLevel[];
}

export function useStationActions(
  station: Station,
  currentStationLevel: number,
  nextLevel: StationLevel | null,
  currentLevel: StationLevel | null,
  hasUnmetTraderRequirement: boolean
) {
  const { gameEditionData } = useProgressQueries();
  const tarkovStore = useTarkovStore();
  const { t } = useI18n({ useScope: 'global' });

  const moduleStatusUpdated = ref(false);
  const moduleStatus = ref('');

  const upgradeDisabled = computed(() => {
    return nextLevel === null || hasUnmetTraderRequirement;
  });

  const downgradeDisabled = computed(() => {
    if (station.id === STASH_STATION_ID) {
      const currentStash = currentStationLevel;
      const rawEdition = tarkovStore.getGameEdition();
      const editionId = Number(rawEdition);
      const editionData = gameEditionData.value?.find((e) => {
        const version = Number(e.version);
        return Number.isFinite(version) && Number.isFinite(editionId) && version === editionId;
      });
      const defaultStash = editionData?.defaultStashLevel ?? 0;
      return currentStash <= defaultStash;
    }
    if (station.id === CULTIST_CIRCLE_STATION_ID) {
      const rawEdition = tarkovStore.getGameEdition();
      const editionId = Number(rawEdition);
      // If Unheard Edition or Unheard+EOD Edition, disable downgrade
      return UNHEARD_EDITIONS.has(editionId);
    }
    return false;
  });

  const upgradeStation = () => {
    // Store next level to a variable because it can change mid-function
    const upgradeLevel = nextLevel;
    if (!upgradeLevel) return;

    tarkovStore.setHideoutModuleComplete(upgradeLevel.id);
    // For each objective, mark it as complete
    upgradeLevel.itemRequirements?.forEach((o) => {
      tarkovStore.setHideoutPartComplete(o.id);
    });

    moduleStatus.value = t('page.hideout.stationcard.statusupgraded', {
      name: station.name,
      level: upgradeLevel.level,
    });
    moduleStatusUpdated.value = true;
  };

  const downgradeStation = () => {
    // Store current level to a variable because it can change mid-function
    const downgradeLevel = currentLevel;
    if (!downgradeLevel) return;

    tarkovStore.setHideoutModuleUncomplete(downgradeLevel.id);
    // For each objective, mark it as incomplete
    downgradeLevel.itemRequirements?.forEach((o) => {
      tarkovStore.setHideoutPartUncomplete(o.id);
    });

    moduleStatus.value = t('page.hideout.stationcard.statusdowngraded', {
      name: station.name,
      level: downgradeLevel.level,
    });
    moduleStatusUpdated.value = true;
  };

  return {
    moduleStatusUpdated,
    moduleStatus,
    upgradeDisabled,
    downgradeDisabled,
    upgradeStation,
    downgradeStation,
  };
}
