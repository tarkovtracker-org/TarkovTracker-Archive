import { computed, type ComputedRef, type WritableComputedRef } from 'vue';
import type { UserStore } from '@/stores/user';

type ToggleGetter = () => boolean;
type ToggleSetter = (value: boolean) => void;

type StoreToggle = WritableComputedRef<boolean>;

type ToggleControl = {
  key: string;
  model: StoreToggle;
  labelKey: string;
  tooltipKey?: string;
};

const createStoreToggle = (getter: ToggleGetter, setter: ToggleSetter): StoreToggle =>
  computed({
    get: getter,
    set: setter,
  });

const createVisibleToggle = (hiddenToggle: StoreToggle): StoreToggle =>
  computed({
    get: () => !hiddenToggle.value,
    set: (value: boolean) => {
      hiddenToggle.value = !value;
    },
  });

const filterLabels = {
  globalTasks: 'page.tasks.filters.show_global_tasks',
  kappaRequired: 'page.tasks.filters.show_kappa_required_tasks',
  lightkeeperRequired: 'page.tasks.filters.show_lightkeeper_required_tasks',
  eodOnly: 'page.tasks.filters.show_eod_only_tasks',
};

const appearanceLabels = {
  requiredRequirement: 'page.tasks.filters.show_required_requirement_labels',
  optionalRequirement: 'page.tasks.filters.show_optional_requirement_labels',
  experienceRewards: 'page.tasks.filters.show_experience_rewards',
  taskIds: 'page.tasks.filters.show_task_ids',
  nextTasks: 'page.tasks.filters.show_next_tasks',
  previousTasks: 'page.tasks.filters.show_previous_tasks',
};

const filterTooltips = {
  globalTasks: 'page.tasks.filters.tooltips.show_global_tasks',
  kappaRequired: 'page.tasks.filters.tooltips.show_kappa_required_tasks',
  lightkeeperRequired: 'page.tasks.filters.tooltips.show_lightkeeper_required_tasks',
  eodOnly: 'page.tasks.filters.tooltips.show_eod_only_tasks',
};

const appearanceTooltips = {
  requiredRequirement: 'page.tasks.filters.required_requirement_labels_tooltip',
  optionalRequirement: 'page.tasks.filters.optional_requirement_labels_tooltip',
  experienceRewards: 'page.tasks.filters.experience_rewards_tooltip',
  taskIds: 'page.tasks.filters.task_ids_tooltip',
  nextTasks: 'page.tasks.filters.next_tasks_tooltip',
  previousTasks: 'page.tasks.filters.previous_tasks_tooltip',
};

export interface UseTaskSettingsOptions {
  isSelfEod: ComputedRef<boolean>;
  createNonKappaLabel: () => string;
  createNonKappaTooltip: () => string;
}

export interface UseTaskSettingsResult {
  showGlobalTasks: StoreToggle;
  hideGlobalTasks: StoreToggle;
  showNonEndgameTasks: StoreToggle;
  hideNonKappaTasks: StoreToggle;
  showKappaRequiredTasks: StoreToggle;
  hideKappaRequiredTasks: StoreToggle;
  showLightkeeperRequiredTasks: StoreToggle;
  hideLightkeeperRequiredTasks: StoreToggle;
  showEodOnlyTasks: StoreToggle;
  hideEodOnlyTasks: StoreToggle;
  showOptionalRequirementLabels: StoreToggle;
  showRequiredRequirementLabels: StoreToggle;
  showExperienceRewards: StoreToggle;
  showTaskIds: StoreToggle;
  showNextTasks: StoreToggle;
  showPreviousTasks: StoreToggle;
  filterControls: ComputedRef<ToggleControl[]>;
  appearanceControls: ComputedRef<ToggleControl[]>;
}

type TaskSettingsStore = Pick<
  UserStore,
  | 'getHideGlobalTasks'
  | 'setHideGlobalTasks'
  | 'getHideNonKappaTasks'
  | 'setHideNonKappaTasks'
  | 'getHideKappaRequiredTasks'
  | 'setHideKappaRequiredTasks'
  | 'getHideLightkeeperRequiredTasks'
  | 'setHideLightkeeperRequiredTasks'
  | 'getHideEodOnlyTasks'
  | 'setHideEodOnlyTasks'
  | 'getShowOptionalTaskRequirementLabels'
  | 'setShowOptionalTaskRequirementLabels'
  | 'getShowRequiredTaskRequirementLabels'
  | 'setShowRequiredTaskRequirementLabels'
  | 'getShowExperienceRewards'
  | 'setShowExperienceRewards'
  | 'getShowTaskIds'
  | 'setShowTaskIds'
  | 'getShowNextTasks'
  | 'setShowNextTasks'
  | 'getShowPreviousTasks'
  | 'setShowPreviousTasks'
>;

export const useTaskSettings = (
  userStore: TaskSettingsStore,
  options: UseTaskSettingsOptions
): UseTaskSettingsResult => {
  const hideGlobalTasks = createStoreToggle(
    () => userStore.getHideGlobalTasks,
    (value) => userStore.setHideGlobalTasks(value)
  );
  const showGlobalTasks = createVisibleToggle(hideGlobalTasks);

  const hideNonKappaTasks = createStoreToggle(
    () => userStore.getHideNonKappaTasks,
    (value) => userStore.setHideNonKappaTasks(value)
  );
  const showNonEndgameTasks = createVisibleToggle(hideNonKappaTasks);

  const hideKappaRequiredTasks = createStoreToggle(
    () => userStore.getHideKappaRequiredTasks,
    (value) => userStore.setHideKappaRequiredTasks(value)
  );
  const showKappaRequiredTasks = createVisibleToggle(hideKappaRequiredTasks);

  const hideLightkeeperRequiredTasks = createStoreToggle(
    () => userStore.getHideLightkeeperRequiredTasks,
    (value) => userStore.setHideLightkeeperRequiredTasks(value)
  );
  const showLightkeeperRequiredTasks = createVisibleToggle(hideLightkeeperRequiredTasks);

  const hideEodOnlyTasks = createStoreToggle(
    () => Boolean(userStore.getHideEodOnlyTasks),
    (value) => userStore.setHideEodOnlyTasks(value)
  );
  const showEodOnlyTasks = createVisibleToggle(hideEodOnlyTasks);

  const showOptionalRequirementLabels = createStoreToggle(
    () => userStore.getShowOptionalTaskRequirementLabels,
    (value) => userStore.setShowOptionalTaskRequirementLabels(value)
  );

  const showRequiredRequirementLabels = createStoreToggle(
    () => userStore.getShowRequiredTaskRequirementLabels,
    (value) => userStore.setShowRequiredTaskRequirementLabels(value)
  );

  const showExperienceRewards = createStoreToggle(
    () => userStore.getShowExperienceRewards,
    (value) => userStore.setShowExperienceRewards(value)
  );

  const showTaskIds = createStoreToggle(
    () => userStore.getShowTaskIds,
    (value) => userStore.setShowTaskIds(value)
  );

  const showNextTasks = createStoreToggle(
    () => userStore.getShowNextTasks,
    (value) => userStore.setShowNextTasks(value)
  );

  const showPreviousTasks = createStoreToggle(
    () => userStore.getShowPreviousTasks,
    (value) => userStore.setShowPreviousTasks(value)
  );

  const filterControls = computed<ToggleControl[]>(() => {
    const baseControls: (ToggleControl & { condition?: boolean })[] = [
      {
        key: 'global-tasks',
        model: showGlobalTasks,
        labelKey: filterLabels.globalTasks,
        tooltipKey: filterTooltips.globalTasks,
      },
      {
        key: 'non-endgame',
        model: showNonEndgameTasks,
        labelKey: options.createNonKappaLabel(),
        tooltipKey: options.createNonKappaTooltip(),
      },
      {
        key: 'kappa-required',
        model: showKappaRequiredTasks,
        labelKey: filterLabels.kappaRequired,
        tooltipKey: filterTooltips.kappaRequired,
      },
      {
        key: 'lightkeeper-required',
        model: showLightkeeperRequiredTasks,
        labelKey: filterLabels.lightkeeperRequired,
        tooltipKey: filterTooltips.lightkeeperRequired,
      },
      {
        key: 'eod-only',
        model: showEodOnlyTasks,
        labelKey: filterLabels.eodOnly,
        tooltipKey: filterTooltips.eodOnly,
        condition: options.isSelfEod.value,
      },
    ];

    return baseControls.filter((control) => control.condition !== false);
  });

  const appearanceControls = computed<ToggleControl[]>(() => [
    {
      key: 'required-labels',
      model: showRequiredRequirementLabels,
      labelKey: appearanceLabels.requiredRequirement,
      tooltipKey: appearanceTooltips.requiredRequirement,
    },
    {
      key: 'optional-labels',
      model: showOptionalRequirementLabels,
      labelKey: appearanceLabels.optionalRequirement,
      tooltipKey: appearanceTooltips.optionalRequirement,
    },
    {
      key: 'experience',
      model: showExperienceRewards,
      labelKey: appearanceLabels.experienceRewards,
      tooltipKey: appearanceTooltips.experienceRewards,
    },
    {
      key: 'task-ids',
      model: showTaskIds,
      labelKey: appearanceLabels.taskIds,
      tooltipKey: appearanceTooltips.taskIds,
    },
    {
      key: 'next-tasks',
      model: showNextTasks,
      labelKey: appearanceLabels.nextTasks,
      tooltipKey: appearanceTooltips.nextTasks,
    },
    {
      key: 'previous-tasks',
      model: showPreviousTasks,
      labelKey: appearanceLabels.previousTasks,
      tooltipKey: appearanceTooltips.previousTasks,
    },
  ]);

  return {
    showGlobalTasks,
    hideGlobalTasks,
    showNonEndgameTasks,
    hideNonKappaTasks,
    showKappaRequiredTasks,
    hideKappaRequiredTasks,
    showLightkeeperRequiredTasks,
    hideLightkeeperRequiredTasks,
    showEodOnlyTasks,
    hideEodOnlyTasks,
    showOptionalRequirementLabels,
    showRequiredRequirementLabels,
    showExperienceRewards,
    showTaskIds,
    showNextTasks,
    showPreviousTasks,
    filterControls,
    appearanceControls,
  };
};
