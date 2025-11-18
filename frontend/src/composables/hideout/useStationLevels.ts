import { computed } from 'vue';
import { useProgressQueries } from '@/composables/useProgressQueries';
import { useTarkovStore } from '@/stores/tarkov';

interface StationLevel {
  id: string;
  level: number;
  description?: string;
  itemRequirements?: Array<{
    id: string;
    item: {
      id: string;
      name: string;
      link?: string;
      wikiLink?: string;
    };
    count: number;
  }>;
  stationLevelRequirements?: Array<{
    level: number;
    station: {
      name: string;
    };
  }>;
  skillRequirements?: Array<{
    level: number;
    name: string;
  }>;
  traderRequirements?: Array<{
    trader?: {
      id?: string;
      name?: string;
    };
    value?: string | number;
  }>;
}

interface Station {
  id: string;
  name: string;
  levels: StationLevel[];
}

export function useStationLevels(station: Station) {
  const { getHideoutLevelFor } = useProgressQueries();

  const currentStationLevel = computed(() => getHideoutLevelFor(station.id, 'self') || 0);

  const nextLevel = computed(() => {
    return station.levels.find((level) => level.level === currentStationLevel.value + 1) ?? null;
  });

  const currentLevel = computed(() => {
    return station.levels.find((level) => level.level === currentStationLevel.value) ?? null;
  });

  const stationAvatar = computed(() => {
    return `/img/hideout/${station.id}.avif`;
  });

  const highlightClasses = computed(() => {
    const classes = {} as Record<string, boolean>;
    if (currentStationLevel.value > 0) {
      classes['highlight-secondary'] = true;
    } else {
      classes['highlight-green'] = true;
    }
    return classes;
  });

  return {
    currentStationLevel,
    nextLevel,
    currentLevel,
    stationAvatar,
    highlightClasses,
  };
}
