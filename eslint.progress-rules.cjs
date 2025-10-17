/* eslint-env node */
const restrictedStoreImportRule = {
  files: ['frontend/**/*.{ts,tsx,js,vue}'],
  ignores: [
    'frontend/src/composables/useProgressQueries.ts',
    'frontend/src/composables/livedata.ts',
    'frontend/src/stores/progress.ts',
  ],
  rules: {
    // TODO: Change to 'error' once codebase is refactored to use useProgressQueries
    // See: https://github.com/tarkovtracker-org/TarkovTracker/issues/XXX
    'no-restricted-imports': [
      'warn',
      {
        paths: [
          {
            name: '@/stores/progress',
            importNames: ['useProgressStore'],
            message: 'Import useProgressQueries instead of the raw progress store.',
          },
        ],
      },
    ],
  },
};

const complexityRule = {
  files: ['frontend/**/*.{ts,tsx,js,vue}'],
  ignores: [
    'frontend/src/composables/data/useTaskData.ts',
    'frontend/src/composables/useTaskFiltering.ts',
    'frontend/src/features/drawer/DrawerTraderStandings.vue',
    'frontend/src/features/maps/MapMarker.vue',
    'frontend/src/features/maps/TarkovMap.vue',
    'frontend/src/features/neededitems/NeededItem.vue',
    'frontend/src/features/neededitems/useNeedVisibility.ts',
    'frontend/src/features/settings/AccountDeletionCard.vue',
    'frontend/src/features/tasks/TaskCard.vue',
    'frontend/src/features/tasks/TaskInfo.vue',
    'frontend/src/features/team/TeamInvite.vue',
    'frontend/src/features/team/TeammemberCard.vue',
    'frontend/src/pages/NeededItems.vue',
    'frontend/src/pages/TaskList.vue',
    'frontend/src/pages/TrackerDashboard.vue',
    'frontend/src/plugins/pinia-firestore.ts',
    'frontend/src/shared_state.ts',
    'frontend/src/stores/progress.ts',
    'frontend/src/utils/DataMigrationService.ts',
    'frontend/src/utils/tarkovdataquery.ts',
    'frontend/src/utils/taskFilters.ts',
  ],
  rules: {
    'max-lines': ['error', { max: 600, skipBlankLines: true, skipComments: true }],
    complexity: ['error', 10],
  },
};

module.exports = [restrictedStoreImportRule, complexityRule];
