<template>
  <div>
    <template v-if="!xs">
      <v-container class="ma-0 pa-0">
        <v-row no-gutters class="mb-2" style="font-size: 1.1em">
          <v-col cols="12">
            <task-link :task="task" />
          </v-col>
        </v-row>
        
        <InfoRow v-if="task.minPlayerLevel != 0" icon="mdi-menu-right">
          <i18n-t keypath="page.tasks.questcard.level" scope="global">
            <template #count>{{ task.minPlayerLevel }}</template>
          </i18n-t>
        </InfoRow>

        <InfoRow v-if="task?.predecessors?.length" icon="mdi-lock-open-outline" class="mb-1">
          <i18n-t keypath="page.tasks.questcard.lockedbefore" scope="global">
            <template #count>{{ lockedBefore }}</template>
          </i18n-t>
        </InfoRow>

        <InfoRow v-if="task?.successors?.length" icon="mdi-lock" class="mb-1">
          <i18n-t keypath="page.tasks.questcard.lockedbehind" scope="global">
            <template #count>{{ lockedBehind }}</template>
          </i18n-t>
        </InfoRow>

        <InfoRow v-if="task?.factionName != 'Any'" class="mb-1">
          <template #icon>
            <img :src="factionImage" class="faction-icon mx-1" />
          </template>
          {{ task.factionName }}
        </InfoRow>

        <v-row v-if="nonKappa" no-gutters class="mb-1">
          <v-col cols="auto" class="mr-1">
            <v-chip size="x-small" color="red" variant="outlined">
              {{ t('page.tasks.questcard.nonkappa') }}
            </v-chip>
          </v-col>
        </v-row>

        <InfoRow 
          v-if="activeUserView === 'all' && neededBy.length > 0" 
          icon="mdi-account-multiple-outline" 
          class="mb-1"
        >
          <i18n-t keypath="page.tasks.questcard.neededby" scope="global">
            <template #names>{{ neededBy.join(', ') }}</template>
          </i18n-t>
        </InfoRow>

        <v-row no-gutters class="mb-1">
          <a :href="task.wikiLink" target="_blank" class="wiki-link">
            <InfoRow icon="mdi-information-outline">
              {{ t('page.tasks.questcard.wiki') }}
            </InfoRow>
          </a>
        </v-row>
      </v-container>
    </template>
    <template v-else>
      <task-link :task="task" class="d-flex justify-center" />
    </template>
  </div>
</template>

<script setup>
import { defineAsyncComponent } from 'vue'
import { useI18n } from 'vue-i18n'

const TaskLink = defineAsyncComponent(() => import('./TaskLink'))
const InfoRow = defineAsyncComponent(() => import('./InfoRow'))

defineProps({
  task: { type: Object, required: true },
  xs: { type: Boolean, required: true },
  lockedBefore: { type: Number, required: true },
  lockedBehind: { type: Number, required: true },
  factionImage: { type: String, required: true },
  nonKappa: { type: Boolean, required: true },
  neededBy: { type: Array, required: true },
  activeUserView: { type: String, required: true }
})

const { t } = useI18n({ useScope: 'global' })
</script>

<style lang="scss" scoped>
.wiki-link {
  text-decoration: none;
  color: rgba(var(--v-theme-tasklink), 1) !important;
}

.faction-icon {
  filter: invert(1);
  max-width: 24px;
  max-height: 24px;
}
</style>