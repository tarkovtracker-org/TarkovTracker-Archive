<template>
  <v-sheet rounded class="elevation-2 pt-2 corner-highlight-parent" color="rgba(33,33,33,1)">
    <div class="mt-n10">
      <span class="elevation-3 corner-highlight" :class="highlightClasses">
        <img class="pt-0" :src="stationAvatar" height="50" />
      </span>
      <span class="text-left pb-0">
        <v-sheet rounded class="px-3 py-3" style="display: inherit">
          <span class="text-subtitle-1">{{ station.name }}</span>
          <span class="text-caption ml-3" :hidden="upgradeDisabled">
            <i18n-t
              keypath="page.hideout.stationcard.level"
              scope="global"
              :plural="currentStationLevel || 0"
            >
              <template #level>
                {{ currentStationLevel || 0 }}
              </template>
            </i18n-t>
          </span>
        </v-sheet>
      </span>
    </div>
    <div v-if="currentLevel" class="text-center text-caption mt-4 mb-2 mx-2">
      {{ getStashAdjustedDescription(currentLevel.description || '') }}
    </div>
    <div v-else-if="nextLevel" class="text-center text-caption mt-4 mb-2 mx-2">
      {{ getStashAdjustedDescription(nextLevel.description || '') }}
    </div>
    <v-sheet
      v-if="props.station.id === STASH_STATION_ID"
      class="text-center pa-2"
      color="secondary"
    >
      <div>
        {{ $t('page.hideout.stationcard.gameeditiondescription') }}
      </div>
      <v-btn variant="tonal" to="/settings">{{
        $t('page.hideout.stationcard.settingsbutton')
      }}</v-btn>
    </v-sheet>
    <v-sheet v-if="nextLevel" color="accent" class="mb-1">
      <div class="text-center pa-2">
        <div class="text-subtitle-1 mb-2">
          <v-icon class="mr-2">mdi-package-variant-closed-check</v-icon
          >{{ $t('page.hideout.stationcard.nextlevel') }}
        </div>
        <div v-for="(requirement, rIndex) in nextLevel.itemRequirements" :key="rIndex">
          <span class="d-flex align-center justify-center">
            <tarkov-item
              :item-id="requirement.item.id"
              :item-name="requirement.item.name"
              :dev-link="requirement.item.link || null"
              :wiki-link="requirement.item.wikiLink || null"
              :count="requirement.count"
              class="mr-2 d-inline-block"
            />
          </span>
        </div>
        <div v-for="(requirement, rIndex) in nextLevel.stationLevelRequirements" :key="rIndex">
          <i18n-t keypath="page.hideout.stationcard.requirements.station" scope="global">
            <template #level>
              {{ requirement.level }}
            </template>
            <template #stationname>
              {{ requirement.station.name }}
            </template>
          </i18n-t>
        </div>
        <div v-for="(requirement, rIndex) in nextLevel.skillRequirements" :key="rIndex">
          <i18n-t keypath="page.hideout.stationcard.requirements.skill" scope="global">
            <template #level>
              {{ requirement.level }}
            </template>
            <template #skillname>
              {{ requirement.name }}
            </template>
          </i18n-t>
        </div>
        <div
          v-for="(requirement, rIndex) in nextLevel.traderRequirements"
          :key="rIndex"
          :class="{ 'text-error': !isTraderRequirementMet(requirement) }"
        >
          <i18n-t keypath="page.hideout.stationcard.requirements.trader" scope="global">
            <template #loyaltylevel>
              {{ requirement.value }}
            </template>
            <template #tradername>
              {{ requirement.trader?.name }}
            </template>
          </i18n-t>
        </div>
        <v-alert
          v-if="hasUnmetTraderRequirement"
          type="warning"
          variant="tonal"
          density="compact"
          class="mt-2"
        >
          {{ t('page.hideout.stationcard.trader_requirement_blocked') }}
        </v-alert>
      </div>
    </v-sheet>
    <v-sheet v-if="!nextLevel" rounded color="accent" class="pa-2">
      <div class="text-center text-subtitle-1">
        <v-icon class="mr-2">mdi-star-check</v-icon>{{ $t('page.hideout.stationcard.maxlevel') }}
      </div>
    </v-sheet>
    <div class="mb-2">
      <v-row v-if="!upgradeDisabled" no-gutters class="align-center justify-center">
        <v-col v-if="nextLevel?.level" cols="auto" class="mx-1 my-1">
          <v-btn
            color="green"
            variant="tonal"
            density="comfortable"
            class="my-1"
            @click="upgradeStation()"
          >
            <i18n-t
              keypath="page.hideout.stationcard.upgradebutton"
              scope="global"
              :plural="nextLevel?.level"
            >
              <template #level>
                {{ nextLevel?.level }}
              </template>
            </i18n-t>
          </v-btn>
        </v-col>
        <v-col v-if="currentLevel" cols="auto" class="mx-1 my-1">
          <v-btn
            color="red"
            variant="tonal"
            density="comfortable"
            :disabled="downgradeDisabled"
            class="my-1"
            @click="downgradeStation()"
          >
            <i18n-t
              keypath="page.hideout.stationcard.downgradebutton"
              scope="global"
              :plural="(currentStationLevel || 0) - 1"
            >
              <template #level>
                {{ (currentStationLevel || 0) - 1 }}
              </template>
            </i18n-t>
          </v-btn>
        </v-col>
      </v-row>
      <v-row v-if="upgradeDisabled" no-gutters class="align-center justify-center">
        <v-col v-if="currentLevel && !downgradeDisabled" cols="auto" class="mx-1 my-1">
          <v-btn
            color="red"
            variant="tonal"
            density="comfortable"
            class="my-1"
            @click="downgradeStation()"
          >
            <i18n-t
              keypath="page.hideout.stationcard.downgradebutton"
              scope="global"
              :plural="(currentStationLevel || 0) - 1"
            >
              <template #level>
                {{ (currentStationLevel || 0) - 1 }}
              </template>
            </i18n-t>
          </v-btn>
        </v-col>
        <v-col
          v-if="nextLevel && (!currentLevel || downgradeDisabled)"
          cols="auto"
          class="mx-1 my-1"
        >
          <span class="mx-3">
            {{ t('page.hideout.stationcard.upgradeunavailable') }}
          </span>
        </v-col>
      </v-row>
    </div>
    <v-snackbar v-model="moduleStatusUpdated" :timeout="4000" color="secondary">
      {{ moduleStatus }}
      <template #actions>
        <v-btn color="white" variant="text" @click="moduleStatusUpdated = false"> Close </v-btn>
      </template>
    </v-snackbar>
  </v-sheet>
</template>
<script setup lang="ts">
  import { defineAsyncComponent } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { STASH_STATION_ID } from '@/stores/progress';
  import { UNHEARD_EDITIONS } from '@/config/gameConstants';
  import { useTarkovStore } from '@/stores/tarkov';
  import { useStationLevels } from '@/composables/hideout/useStationLevels';
  import { useTraderRequirements } from '@/composables/hideout/useTraderRequirements';
  import { useStationActions } from '@/composables/hideout/useStationActions';

  interface Station {
    id: string;
    name: string;
    levels: Array<{
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
    }>;
  }

  const TarkovItem = defineAsyncComponent(() => import('@/components/domain/items/TarkovItem.vue'));

  const props = defineProps<{
    station: Station;
  }>();

  const { t } = useI18n({ useScope: 'global' });
  const tarkovStore = useTarkovStore();

  // Use extracted composables
  const { currentStationLevel, nextLevel, currentLevel, stationAvatar, highlightClasses } =
    useStationLevels(props.station);

  const { hasUnmetTraderRequirement, isTraderRequirementMet } = useTraderRequirements(
    nextLevel.value
  );

  const {
    moduleStatusUpdated,
    moduleStatus,
    upgradeDisabled,
    downgradeDisabled,
    upgradeStation,
    downgradeStation,
  } = useStationActions(
    props.station,
    currentStationLevel.value,
    nextLevel.value,
    currentLevel.value,
    hasUnmetTraderRequirement.value
  );
  const getStashAdjustedDescription = (description: string): string => {
    // Only modify description for stash station
    if (props.station.id !== STASH_STATION_ID) {
      return description;
    }
    // Check if user has Unheard Edition or Unheard + EOD Edition
    const rawEdition = tarkovStore.getGameEdition();
    const editionId = Number(rawEdition);
    const isUnheardEdition = UNHEARD_EDITIONS.has(editionId);
    // For Unheard editions, show static description with 10x72
    if (isUnheardEdition) {
      return t('page.hideout.stationcard.unheard_max_stash');
    }
    return description;
  };
</script>
<style lang="scss" scoped>
  .corner-highlight {
    border-right-style: solid;
    border-right-width: 0px;
    border-bottom-style: solid;
    border-bottom-width: 0px;
    margin: 0px;
    padding: 6px;
    background-clip: padding-box;
    border-radius: 10px 10px 10px 0px;
  }
  .highlight-secondary {
    background: linear-gradient(
      135deg,
      rgba(125, 111, 85, 1) 0%,
      rgba(172, 157, 128, 1) 35%,
      rgba(154, 136, 102, 1) 100%
    );
  }
  .highlight-green {
    background: linear-gradient(
      90deg,
      rgba(1, 36, 0, 0.15) 0%,
      rgba(15, 121, 9, 0.15) 35%,
      rgba(0, 83, 0, 0.15) 100%
    );
  }
</style>
