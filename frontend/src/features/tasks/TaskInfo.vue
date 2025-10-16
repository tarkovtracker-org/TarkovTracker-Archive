<template>
  <div>
    <template v-if="!xs">
      <v-container class="ma-0 pa-0">
        <v-row no-gutters class="mb-2" style="font-size: 1.1em">
          <v-col cols="12">
            <task-link :task="task" />
          </v-col>
        </v-row>

        <v-tooltip v-if="task.minPlayerLevel != 0" location="top">
          <template #activator="{ props: levelTooltipProps }">
            <span class="tooltip-activator" v-bind="levelTooltipProps">
              <InfoRow icon="mdi-menu-right">
                <i18n-t keypath="page.tasks.questcard.level" scope="global">
                  <template #count>{{ task.minPlayerLevel }}</template>
                </i18n-t>
              </InfoRow>
            </span>
          </template>
          {{ t('page.tasks.questcard.level_tooltip') }}
        </v-tooltip>

        <InfoRow
          v-for="requirement in traderLoyaltyRequirements"
          :key="`loyalty-${requirement.id}`"
          icon="mdi-handshake"
          class="mb-1"
          :class="{ 'text-error': !requirement.met }"
        >
          <i18n-t keypath="page.tasks.questcard.trader_loyalty_requirement" scope="global">
            <template #trader>{{ requirement.name }}</template>
            <template #level>{{ requirement.required }}</template>
            <template #current>{{ requirement.current }}</template>
          </i18n-t>
        </InfoRow>

        <InfoRow
          v-for="requirement in traderStandingRequirements"
          :key="`standing-${requirement.id}`"
          icon="mdi-thumb-up-outline"
          class="mb-1"
          :class="{ 'text-error': !requirement.met }"
        >
          <i18n-t keypath="page.tasks.questcard.trader_standing_requirement" scope="global">
            <template #trader>{{ requirement.name }}</template>
            <template #comparison>{{ requirement.operator }}</template>
            <template #value>{{ requirement.required }}</template>
            <template #current>{{ requirement.current }}</template>
          </i18n-t>
        </InfoRow>

        <v-tooltip v-if="task?.predecessors?.length" location="top">
          <template #activator="{ props: predecessorsTooltipProps }">
            <span class="tooltip-activator" v-bind="predecessorsTooltipProps">
              <InfoRow icon="mdi-lock-open-outline" class="mb-1 lock-indicator">
                <span class="lock-label">{{ t('page.tasks.questcard.lockedbefore_label') }}</span>
                <span class="lock-count">{{ lockedBefore }}</span>
              </InfoRow>
            </span>
          </template>
          {{ t('page.tasks.questcard.lockedbefore_tooltip') }}
        </v-tooltip>

        <v-tooltip v-if="task?.successors?.length" location="top">
          <template #activator="{ props: successorsTooltipProps }">
            <span class="tooltip-activator" v-bind="successorsTooltipProps">
              <InfoRow icon="mdi-lock" class="mb-1 lock-indicator">
                <span class="lock-label">{{ t('page.tasks.questcard.lockedbehind_label') }}</span>
                <span class="lock-count">{{ lockedBehind }}</span>
              </InfoRow>
            </span>
          </template>
          {{ t('page.tasks.questcard.lockedbehind_tooltip') }}
        </v-tooltip>

        <InfoRow v-if="task?.factionName != 'Any'" class="mb-1">
          <template #icon>
            <img :src="factionImage" class="faction-icon mx-1" />
          </template>
          {{ task.factionName }}
        </InfoRow>

        <v-row
          v-if="showKappaStatus || showLightkeeperStatus || showEodChip"
          no-gutters
          class="mb-1 requirement-chips"
        >
          <v-col v-if="showKappaStatus" cols="auto" class="mr-1">
            <v-chip
              size="x-small"
              :class="[
                'status-chip',
                'status-chip--kappa',
                kappaRequired ? 'status-chip--required' : 'status-chip--optional',
              ]"
            >
              {{
                t(
                  kappaRequired
                    ? 'page.tasks.questcard.kapparequired'
                    : 'page.tasks.questcard.nonkappa'
                )
              }}
            </v-chip>
          </v-col>
          <v-col v-if="showLightkeeperStatus" cols="auto">
            <v-chip
              size="x-small"
              :class="[
                'status-chip',
                'status-chip--lightkeeper',
                lightkeeperRequired ? 'status-chip--required' : 'status-chip--optional',
              ]"
            >
              {{
                t(
                  lightkeeperRequired
                    ? 'page.tasks.questcard.lightkeeperrequired'
                    : 'page.tasks.questcard.nonlightkeeper'
                )
              }}
            </v-chip>
          </v-col>
          <v-col v-if="showEodChip" cols="auto">
            <v-chip size="x-small" :class="['status-chip', 'status-chip--eod']">
              {{ t('page.tasks.questcard.eodonly') }}
            </v-chip>
          </v-col>
        </v-row>

        <InfoRow
          v-if="showNextTasks && nextTasks?.length"
          icon="mdi-arrow-right-bold"
          class="mb-1 next-tasks-row"
        >
          <span class="next-tasks__label">{{ t('page.tasks.questcard.next_tasks') }}:</span>
          <span class="next-tasks__list">
            <span
              v-for="(nextTask, index) in nextTasks"
              :key="nextTask.id || index"
              class="next-task"
            >
              <template v-if="nextTask?.wikiLink">
                <a :href="nextTask.wikiLink" target="_blank" rel="noopener" class="next-task__link">
                  {{ nextTask?.name || nextTask?.id || t('page.tasks.questcard.unknown_task') }}
                </a>
              </template>
              <template v-else>
                <span class="next-task__link next-task__link--plain">
                  {{ nextTask?.name || nextTask?.id || t('page.tasks.questcard.unknown_task') }}
                </span>
              </template>
              <span v-if="index < nextTasks.length - 1" class="next-task__separator">•</span>
            </span>
          </span>
        </InfoRow>

        <InfoRow
          v-if="showPreviousTasks && previousTasks?.length"
          icon="mdi-arrow-left-bold"
          class="mb-1 next-tasks-row"
        >
          <span class="next-tasks__label">{{ t('page.tasks.questcard.previous_tasks') }}:</span>
          <span class="next-tasks__list">
            <span
              v-for="(prevTask, index) in previousTasks"
              :key="prevTask.id || index"
              class="next-task"
            >
              <template v-if="prevTask?.wikiLink">
                <a :href="prevTask.wikiLink" target="_blank" rel="noopener" class="next-task__link">
                  {{ prevTask?.name || prevTask?.id || t('page.tasks.questcard.unknown_task') }}
                </a>
              </template>
              <template v-else>
                <span class="next-task__link next-task__link--plain">
                  {{ prevTask?.name || prevTask?.id || t('page.tasks.questcard.unknown_task') }}
                </span>
              </template>
              <span v-if="index < previousTasks.length - 1" class="next-task__separator">•</span>
            </span>
          </span>
        </InfoRow>

        <InfoRow
          v-if="activeUserView === 'all' && neededBy.length > 0"
          icon="mdi-account-multiple-outline"
          class="mb-1"
        >
          <i18n-t keypath="page.tasks.questcard.neededby" scope="global">
            <template #names>{{ neededBy.join(', ') }}</template>
          </i18n-t>
        </InfoRow>

        <InfoRow v-if="showTaskIds" icon="mdi-identifier" class="mb-1 task-id-row">
          {{ task.id }}
        </InfoRow>
      </v-container>
    </template>
    <template v-else>
      <task-link :task="task" class="d-flex justify-center" />
      <div v-if="showTaskIds" class="task-id-row text-center mt-1">
        <v-icon size="small" class="mr-1">mdi-identifier</v-icon>{{ task.id }}
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
  import { computed, defineAsyncComponent, toRef } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { useTarkovStore } from '@/stores/tarkov';
  import { EOD_EDITIONS } from '@/config/gameConstants';
  import { useTaskRequirements } from './composables/useTaskRequirements';
  import type { Task } from '@/types/tarkov';

  const TaskLink = defineAsyncComponent(() => import('./TaskLink.vue'));
  const InfoRow = defineAsyncComponent(() => import('./InfoRow.vue'));

  interface RelatedTaskSummary {
    id?: string;
    name?: string;
    wikiLink?: string;
  }

  interface TaskInfoProps {
    task: Task;
    xs: boolean;
    lockedBefore: number;
    lockedBehind: number;
    factionImage: string;
    showKappaStatus: boolean;
    kappaRequired: boolean;
    showLightkeeperStatus: boolean;
    lightkeeperRequired: boolean;
    neededBy: string[];
    activeUserView: string;
    showNextTasks: boolean;
    nextTasks: RelatedTaskSummary[];
    showPreviousTasks: boolean;
    previousTasks: RelatedTaskSummary[];
    showTaskIds: boolean;
    showEodStatus: boolean;
  }

  const props = defineProps<TaskInfoProps>();

  const { t } = useI18n({ useScope: 'global' });

  const taskRef = toRef(props, 'task');
  const { traderLoyaltyRequirements, traderStandingRequirements } = useTaskRequirements(taskRef);

  const tarkovStore = useTarkovStore();
  const showEodChip = computed(() => {
    if (!props.showEodStatus || !props.task?.eodOnly) {
      return false;
    }

    if (typeof tarkovStore.getGameEdition !== 'function') {
      return false;
    }

    const edition = tarkovStore.getGameEdition();
    return EOD_EDITIONS.has(edition ?? 0);
  });
</script>

<style lang="scss" scoped>
  .faction-icon {
    filter: invert(1);
    max-width: 24px;
    max-height: 24px;
  }

  .lock-indicator {
    align-items: center;
    display: inline-flex;
    width: auto;
    max-width: 100%;
  }

  .lock-indicator :deep(.info-row__content) {
    flex: 0 0 auto;
    gap: 4px;
    width: auto;
  }

  .tooltip-activator {
    display: block;
    width: fit-content;
    max-width: 100%;
  }

  .lock-label {
    font-weight: 500;
    font-size: 0.95em;
  }

  .lock-count {
    font-weight: 500;
    font-variant-numeric: tabular-nums;
  }

  .requirement-chips {
    gap: 4px;
  }

  .status-chip {
    font-weight: 600;
    letter-spacing: 0.5px;
    font-size: 0.9rem;
    text-transform: uppercase;
    border-radius: 999px;
    padding: 4px 14px;
    color: #ffffff;
    border: 1px solid rgba(255, 255, 255, 0.1);
    margin-right: 6px;
  }

  .status-chip--required.status-chip--kappa {
    background-color: #0e8b4a;
  }

  .status-chip--optional.status-chip--kappa {
    background-color: #7b2d2d;
  }

  .status-chip--required.status-chip--lightkeeper {
    background-color: #1764d0;
  }

  .status-chip--optional.status-chip--lightkeeper {
    background-color: #b8860b;
  }

  .status-chip--eod {
    background-color: #6b2dbf;
  }

  .task-id-row {
    font-size: 0.85rem;
    color: rgba(var(--v-theme-on-surface), 0.7);
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .next-tasks-row {
    align-items: center;
    flex-wrap: wrap;
  }

  .next-tasks__label {
    font-weight: 600;
    margin-right: 6px;
  }

  .next-tasks__list {
    display: inline-flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .next-task__link {
    color: rgba(var(--v-theme-tasklink), 1) !important;
    text-decoration: none;
    font-weight: 600;
  }

  .next-task__link--plain {
    color: rgba(var(--v-theme-on-surface), 0.8) !important;
  }

  .next-task__separator {
    color: rgba(var(--v-theme-on-surface), 0.5);
  }
</style>
