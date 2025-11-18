<template>
  <fitted-card icon="mdi-database-import-outline" icon-color="white">
    <template #title>Data Migration</template>
    <template #content>
      <p class="mb-4">Migrate your progress data from the old TarkovTracker site.</p>
      <v-card variant="flat" class="mb-3">
        <v-card-text>
          <MigrationSteps />
          <form @submit.prevent="migration.fetchWithApiToken">
            <v-text-field
              v-model="migration.apiToken.value"
              label="API Token from Old Site"
              placeholder="Paste your API token here..."
              variant="outlined"
              :disabled="migration.fetchingApi.value"
              :error-messages="migration.apiError.value"
              hide-details="auto"
              class="mb-4"
              :type="migration.showToken.value ? 'text' : 'password'"
              :append-inner-icon="migration.showToken.value ? 'mdi-eye-off' : 'mdi-eye'"
              autocomplete="off"
              @click:append-inner="migration.showToken.value = !migration.showToken.value"
            ></v-text-field>
            <div class="d-flex justify-space-between align-center">
              <div v-if="migration.fetchingApi.value">
                <v-progress-circular
                  indeterminate
                  color="primary"
                  size="24"
                  class="mr-2"
                ></v-progress-circular>
                <span>Fetching data...</span>
              </div>
              <v-alert
                v-else-if="migration.apiFetchSuccess.value"
                type="success"
                variant="tonal"
                density="compact"
                class="mb-0 mt-0 flex-grow-1 mr-4"
              >
                Data ready to import
              </v-alert>
              <v-spacer v-else></v-spacer>
              <v-btn
                color="primary"
                :loading="migration.fetchingApi.value"
                :disabled="!migration.apiToken.value || migration.fetchingApi.value"
                class="px-4"
                @click="migration.fetchWithApiToken"
              >
                Fetch Data
              </v-btn>
            </div>
          </form>
        </v-card-text>
      </v-card>
      <ImportConfirmDialog
        v-model:show="migration.confirmDialog.value"
        :data="migration.importedData.value || undefined"
        :completed-tasks="migration.countCompletedTasks.value"
        :failed-tasks="migration.countFailedTasks.value"
        :task-objectives="migration.countTaskObjectives.value"
        :hideout-modules="migration.countHideoutModules.value"
        :hideout-parts="migration.countHideoutParts.value"
        :importing="migration.importing.value"
        @confirm="migration.confirmImport"
        @show-objectives-details="migration.showObjectivesDetails.value = true"
        @show-failed-tasks-details="migration.showFailedTaskDetails.value = true"
      />
      <v-dialog v-model="migration.showObjectivesDetails.value" max-width="500">
        <v-card>
          <v-card-title class="text-h6">Task Objectives Information</v-card-title>
          <v-card-text>
            <p>
              The count of {{ migration.countTaskObjectives.value }} task objectives represents all
              objective data in your import.
            </p>
            <p class="mt-3">
              The dashboard may show a different number because it only counts unique task
              objectives that are currently relevant to your progress.
            </p>
            <p class="mt-3">
              This difference is normal and doesn't indicate any problem with your data migration.
            </p>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn
              color="primary"
              variant="flat"
              @click="migration.showObjectivesDetails.value = false"
              >Close</v-btn
            >
          </v-card-actions>
        </v-card>
      </v-dialog>
      <v-dialog v-model="migration.showFailedTaskDetails.value" max-width="500">
        <v-card>
          <v-card-title class="text-h6">Failed Task Details</v-card-title>
          <v-card-text>
            <p>
              These tasks are marked as "failed" in your data. This typically happens when you chose
              a different quest branch or when a task became unavailable.
            </p>
            <v-list density="compact">
              <v-list-item v-for="task in migration.failedTasks.value" :key="task.id">
                <v-list-item-title>
                  Task ID: {{ task.id }}
                  <v-chip size="small" color="red" class="ml-2">Failed</v-chip>
                </v-list-item-title>
                <v-list-item-subtitle>
                  This task will remain marked as failed after migration.
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
            <p class="mt-3">
              <strong>Note:</strong> This is normal for tasks that are mutually exclusive with other
              tasks you've completed.
            </p>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn
              color="primary"
              variant="flat"
              @click="migration.showFailedTaskDetails.value = false"
              >Close</v-btn
            >
          </v-card-actions>
        </v-card>
      </v-dialog>
    </template>
  </fitted-card>
</template>
<script setup lang="ts">
  import { useDataMigration } from '@/composables/useDataMigration';
  import FittedCard from '@/components/ui/FittedCard.vue';
  import MigrationSteps from './MigrationSteps.vue';
  import ImportConfirmDialog from './ImportConfirmDialog.vue';

  const migration = useDataMigration();
</script>
