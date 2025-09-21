<template>
  <div class="d-flex justify-space-between align-center">
    <v-tooltip v-if="hasWikiLink" location="top">
      <template #activator="{ props: tooltipProps }">
        <a
          v-bind="tooltipProps"
          :href="task.wikiLink"
          target="_blank"
          rel="noopener"
          class="task-link__anchor"
        >
          <v-avatar size="1.5em" style="vertical-align: middle">
            <v-img :src="traderAvatar" />
          </v-avatar>
          <template v-if="isFactionTask">
            <v-avatar size="1.5em" rounded="0" style="vertical-align: middle" class="ml-2">
              <v-img :src="factionImage" class="faction-icon" />
            </v-avatar>
          </template>
          <span class="ml-2 font-weight-bold">{{ task?.name }}</span>
        </a>
      </template>
      {{ t('page.tasks.questcard.wiki_tooltip') }}
    </v-tooltip>
    <span v-else class="task-link__anchor">
      <v-avatar size="1.5em" style="vertical-align: middle">
        <v-img :src="traderAvatar" />
      </v-avatar>
      <template v-if="isFactionTask">
        <v-avatar size="1.5em" rounded="0" style="vertical-align: middle" class="ml-2">
          <v-img :src="factionImage" class="faction-icon" />
        </v-avatar>
      </template>
      <span class="ml-2 font-weight-bold">{{ task?.name }}</span>
    </span>
  </div>
</template>
<script setup>
  import { computed } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { useTarkovData } from '@/composables/tarkovdata';

  // Define the props for the component
  const props = defineProps({
    task: {
      type: Object,
      required: true,
    },
    showWikiLink: {
      type: Boolean,
      required: false,
      default: false,
    },
  });
  useTarkovData();
  const { t } = useI18n({ useScope: 'global' });
  // Check if there are two faction tasks for this task
  const task = computed(() => props.task);
  const isFactionTask = computed(() => task.value?.factionName != 'Any');
  const factionImage = computed(() => `/img/factions/${task.value?.factionName}.webp`);
  const traderAvatar = computed(() => task.value?.trader?.imageLink);
  const hasWikiLink = computed(() => typeof task.value?.wikiLink === 'string' && task.value?.wikiLink);
</script>
<style lang="scss" scoped>
  .task-link__anchor,
  a:any-link {
    display: inline-flex;
    align-items: center;
    color: rgba(var(--v-theme-tasklink), 1) !important;
    text-decoration: none;
  }
  .faction-icon {
    filter: invert(1);
    max-width: 24px;
    max-height: 24px;
  }
</style>
