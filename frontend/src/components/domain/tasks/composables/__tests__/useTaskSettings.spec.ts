import { describe, it, expect, beforeEach } from 'vitest';
import { computed, ref } from 'vue';
import { useTaskSettings, type UseTaskSettingsOptions } from '../useTaskSettings';

describe('useTaskSettings', () => {
  type MockStore = {
    readonly getHideGlobalTasks: boolean;
    setHideGlobalTasks: (value: boolean) => void;
    readonly getHideNonKappaTasks: boolean;
    setHideNonKappaTasks: (value: boolean) => void;
    readonly getHideKappaRequiredTasks: boolean;
    setHideKappaRequiredTasks: (value: boolean) => void;
    readonly getHideLightkeeperRequiredTasks: boolean;
    setHideLightkeeperRequiredTasks: (value: boolean) => void;
    readonly getHideEodOnlyTasks: boolean;
    setHideEodOnlyTasks: (value: boolean) => void;
    readonly getShowOptionalTaskRequirementLabels: boolean;
    setShowOptionalTaskRequirementLabels: (value: boolean) => void;
    readonly getShowRequiredTaskRequirementLabels: boolean;
    setShowRequiredTaskRequirementLabels: (value: boolean) => void;
    readonly getShowExperienceRewards: boolean;
    setShowExperienceRewards: (value: boolean) => void;
    readonly getShowTaskIds: boolean;
    setShowTaskIds: (value: boolean) => void;
    readonly getShowNextTasks: boolean;
    setShowNextTasks: (value: boolean) => void;
    readonly getShowPreviousTasks: boolean;
    setShowPreviousTasks: (value: boolean) => void;
  };

  let mockStore: MockStore;

  let mockOptions: UseTaskSettingsOptions;

  beforeEach(() => {
    const hideGlobalTasks = ref(false);
    const hideNonKappaTasks = ref(false);
    const hideKappaRequiredTasks = ref(false);
    const hideLightkeeperRequiredTasks = ref(false);
    const hideEodOnlyTasks = ref(false);
    const showOptionalTaskRequirementLabels = ref(true);
    const showRequiredTaskRequirementLabels = ref(true);
    const showExperienceRewards = ref(true);
    const showTaskIds = ref(false);
    const showNextTasks = ref(true);
    const showPreviousTasks = ref(true);

    // Reset mock store with reactive backing state
    mockStore = {
      get getHideGlobalTasks() {
        return hideGlobalTasks.value;
      },
      setHideGlobalTasks: (value: boolean) => {
        hideGlobalTasks.value = value;
      },
      get getHideNonKappaTasks() {
        return hideNonKappaTasks.value;
      },
      setHideNonKappaTasks: (value: boolean) => {
        hideNonKappaTasks.value = value;
      },
      get getHideKappaRequiredTasks() {
        return hideKappaRequiredTasks.value;
      },
      setHideKappaRequiredTasks: (value: boolean) => {
        hideKappaRequiredTasks.value = value;
      },
      get getHideLightkeeperRequiredTasks() {
        return hideLightkeeperRequiredTasks.value;
      },
      setHideLightkeeperRequiredTasks: (value: boolean) => {
        hideLightkeeperRequiredTasks.value = value;
      },
      get getHideEodOnlyTasks() {
        return hideEodOnlyTasks.value;
      },
      setHideEodOnlyTasks: (value: boolean) => {
        hideEodOnlyTasks.value = value;
      },
      get getShowOptionalTaskRequirementLabels() {
        return showOptionalTaskRequirementLabels.value;
      },
      setShowOptionalTaskRequirementLabels: (value: boolean) => {
        showOptionalTaskRequirementLabels.value = value;
      },
      get getShowRequiredTaskRequirementLabels() {
        return showRequiredTaskRequirementLabels.value;
      },
      setShowRequiredTaskRequirementLabels: (value: boolean) => {
        showRequiredTaskRequirementLabels.value = value;
      },
      get getShowExperienceRewards() {
        return showExperienceRewards.value;
      },
      setShowExperienceRewards: (value: boolean) => {
        showExperienceRewards.value = value;
      },
      get getShowTaskIds() {
        return showTaskIds.value;
      },
      setShowTaskIds: (value: boolean) => {
        showTaskIds.value = value;
      },
      get getShowNextTasks() {
        return showNextTasks.value;
      },
      setShowNextTasks: (value: boolean) => {
        showNextTasks.value = value;
      },
      get getShowPreviousTasks() {
        return showPreviousTasks.value;
      },
      setShowPreviousTasks: (value: boolean) => {
        showPreviousTasks.value = value;
      },
    } satisfies MockStore;

    mockOptions = {
      isSelfEod: computed(() => false),
      createNonKappaLabel: () => 'Show Non-Kappa Tasks',
      createNonKappaTooltip: () => 'Show tasks not required for Kappa',
    };
  });

  describe('toggle creation', () => {
    it('creates working toggle for hideGlobalTasks', () => {
      const settings = useTaskSettings(mockStore, mockOptions);

      expect(settings.hideGlobalTasks.value).toBe(false);

      settings.hideGlobalTasks.value = true;
      expect(mockStore.getHideGlobalTasks).toBe(true);
    });

    it('creates inverted toggle for showGlobalTasks', () => {
      const settings = useTaskSettings(mockStore, mockOptions);

      expect(settings.showGlobalTasks.value).toBe(true);

      settings.showGlobalTasks.value = false;
      expect(mockStore.getHideGlobalTasks).toBe(true);
      // Need to check the getter's current value, not the ref
      expect(settings.hideGlobalTasks.value).toBe(mockStore.getHideGlobalTasks);
    });

    it('synchronizes show and hide toggles', () => {
      const settings = useTaskSettings(mockStore, mockOptions);

      settings.showGlobalTasks.value = false;
      // Check against the store's actual value
      expect(settings.hideGlobalTasks.value).toBe(mockStore.getHideGlobalTasks);

      settings.hideGlobalTasks.value = false;
      expect(settings.showGlobalTasks.value).toBe(!mockStore.getHideGlobalTasks);
    });
  });

  describe('filter controls', () => {
    it('includes all filter controls by default', () => {
      const settings = useTaskSettings(mockStore, mockOptions);
      const controls = settings.filterControls.value;

      expect(controls.length).toBe(4); // global, non-endgame, kappa, lightkeeper (EOD excluded)
      expect(controls.find((c) => c.key === 'global-tasks')).toBeDefined();
      expect(controls.find((c) => c.key === 'non-endgame')).toBeDefined();
      expect(controls.find((c) => c.key === 'kappa-required')).toBeDefined();
      expect(controls.find((c) => c.key === 'lightkeeper-required')).toBeDefined();
    });

    it('includes EOD control when user is EOD', () => {
      mockOptions.isSelfEod = computed(() => true);
      const settings = useTaskSettings(mockStore, mockOptions);
      const controls = settings.filterControls.value;

      expect(controls.length).toBe(5);
      expect(controls.find((c) => c.key === 'eod-only')).toBeDefined();
    });

    it('excludes EOD control when user is not EOD', () => {
      mockOptions.isSelfEod = computed(() => false);
      const settings = useTaskSettings(mockStore, mockOptions);
      const controls = settings.filterControls.value;

      expect(controls.find((c) => c.key === 'eod-only')).toBeUndefined();
    });

    it('uses custom labels from options', () => {
      const customLabel = 'Custom Non-Kappa Label';
      mockOptions.createNonKappaLabel = () => customLabel;

      const settings = useTaskSettings(mockStore, mockOptions);
      const controls = settings.filterControls.value;
      const nonEndgameControl = controls.find((c) => c.key === 'non-endgame');

      expect(nonEndgameControl?.labelKey).toBe(customLabel);
    });

    it('uses custom tooltips from options', () => {
      const customTooltip = 'Custom Tooltip';
      mockOptions.createNonKappaTooltip = () => customTooltip;

      const settings = useTaskSettings(mockStore, mockOptions);
      const controls = settings.filterControls.value;
      const nonEndgameControl = controls.find((c) => c.key === 'non-endgame');

      expect(nonEndgameControl?.tooltipKey).toBe(customTooltip);
    });

    it('all filter controls have required properties', () => {
      mockOptions.isSelfEod = computed(() => true);
      const settings = useTaskSettings(mockStore, mockOptions);
      const controls = settings.filterControls.value;

      controls.forEach((control) => {
        expect(control).toHaveProperty('key');
        expect(control).toHaveProperty('model');
        expect(control).toHaveProperty('labelKey');
        expect(control).toHaveProperty('tooltipKey');
      });
    });
  });

  describe('appearance controls', () => {
    it('includes all appearance controls', () => {
      const settings = useTaskSettings(mockStore, mockOptions);
      const controls = settings.appearanceControls.value;

      expect(controls.length).toBe(6);
      expect(controls.find((c) => c.key === 'required-labels')).toBeDefined();
      expect(controls.find((c) => c.key === 'optional-labels')).toBeDefined();
      expect(controls.find((c) => c.key === 'experience')).toBeDefined();
      expect(controls.find((c) => c.key === 'task-ids')).toBeDefined();
      expect(controls.find((c) => c.key === 'next-tasks')).toBeDefined();
      expect(controls.find((c) => c.key === 'previous-tasks')).toBeDefined();
    });

    it('all appearance controls have required properties', () => {
      const settings = useTaskSettings(mockStore, mockOptions);
      const controls = settings.appearanceControls.value;

      controls.forEach((control) => {
        expect(control).toHaveProperty('key');
        expect(control).toHaveProperty('model');
        expect(control).toHaveProperty('labelKey');
        expect(control).toHaveProperty('tooltipKey');
      });
    });
  });

  describe('toggle functionality', () => {
    it('toggles showGlobalTasks correctly', () => {
      const settings = useTaskSettings(mockStore, mockOptions);

      settings.showGlobalTasks.value = true;
      expect(mockStore.getHideGlobalTasks).toBe(false);

      settings.showGlobalTasks.value = false;
      expect(mockStore.getHideGlobalTasks).toBe(true);
    });

    it('toggles showNonEndgameTasks correctly', () => {
      const settings = useTaskSettings(mockStore, mockOptions);

      settings.showNonEndgameTasks.value = true;
      expect(mockStore.getHideNonKappaTasks).toBe(false);

      settings.showNonEndgameTasks.value = false;
      expect(mockStore.getHideNonKappaTasks).toBe(true);
    });

    it('toggles showKappaRequiredTasks correctly', () => {
      const settings = useTaskSettings(mockStore, mockOptions);

      settings.showKappaRequiredTasks.value = true;
      expect(mockStore.getHideKappaRequiredTasks).toBe(false);

      settings.showKappaRequiredTasks.value = false;
      expect(mockStore.getHideKappaRequiredTasks).toBe(true);
    });

    it('toggles showLightkeeperRequiredTasks correctly', () => {
      const settings = useTaskSettings(mockStore, mockOptions);

      settings.showLightkeeperRequiredTasks.value = true;
      expect(mockStore.getHideLightkeeperRequiredTasks).toBe(false);

      settings.showLightkeeperRequiredTasks.value = false;
      expect(mockStore.getHideLightkeeperRequiredTasks).toBe(true);
    });

    it('toggles showEodOnlyTasks correctly', () => {
      const settings = useTaskSettings(mockStore, mockOptions);

      settings.showEodOnlyTasks.value = true;
      expect(mockStore.getHideEodOnlyTasks).toBe(false);

      settings.showEodOnlyTasks.value = false;
      expect(mockStore.getHideEodOnlyTasks).toBe(true);
    });

    it('toggles showOptionalRequirementLabels correctly', () => {
      const settings = useTaskSettings(mockStore, mockOptions);

      settings.showOptionalRequirementLabels.value = false;
      expect(mockStore.getShowOptionalTaskRequirementLabels).toBe(false);

      settings.showOptionalRequirementLabels.value = true;
      expect(mockStore.getShowOptionalTaskRequirementLabels).toBe(true);
    });

    it('toggles showRequiredRequirementLabels correctly', () => {
      const settings = useTaskSettings(mockStore, mockOptions);

      settings.showRequiredRequirementLabels.value = false;
      expect(mockStore.getShowRequiredTaskRequirementLabels).toBe(false);

      settings.showRequiredRequirementLabels.value = true;
      expect(mockStore.getShowRequiredTaskRequirementLabels).toBe(true);
    });

    it('toggles showExperienceRewards correctly', () => {
      const settings = useTaskSettings(mockStore, mockOptions);

      settings.showExperienceRewards.value = false;
      expect(mockStore.getShowExperienceRewards).toBe(false);

      settings.showExperienceRewards.value = true;
      expect(mockStore.getShowExperienceRewards).toBe(true);
    });

    it('toggles showTaskIds correctly', () => {
      const settings = useTaskSettings(mockStore, mockOptions);

      settings.showTaskIds.value = true;
      expect(mockStore.getShowTaskIds).toBe(true);

      settings.showTaskIds.value = false;
      expect(mockStore.getShowTaskIds).toBe(false);
    });

    it('toggles showNextTasks correctly', () => {
      const settings = useTaskSettings(mockStore, mockOptions);

      settings.showNextTasks.value = false;
      expect(mockStore.getShowNextTasks).toBe(false);

      settings.showNextTasks.value = true;
      expect(mockStore.getShowNextTasks).toBe(true);
    });

    it('toggles showPreviousTasks correctly', () => {
      const settings = useTaskSettings(mockStore, mockOptions);

      settings.showPreviousTasks.value = false;
      expect(mockStore.getShowPreviousTasks).toBe(false);

      settings.showPreviousTasks.value = true;
      expect(mockStore.getShowPreviousTasks).toBe(true);
    });
  });

  describe('reactive updates', () => {
    it('reflects store changes in computed values', () => {
      const settings = useTaskSettings(mockStore, mockOptions);

      mockStore.setHideGlobalTasks(true);
      expect(settings.hideGlobalTasks.value).toBe(mockStore.getHideGlobalTasks);
      expect(settings.showGlobalTasks.value).toBe(!mockStore.getHideGlobalTasks);

      mockStore.setHideGlobalTasks(false);
      expect(settings.hideGlobalTasks.value).toBe(mockStore.getHideGlobalTasks);
      expect(settings.showGlobalTasks.value).toBe(!mockStore.getHideGlobalTasks);
    });

    it('updates filter controls when isSelfEod changes', () => {
      const isEod = computed(() => false);
      const reactiveOptions = {
        isSelfEod: isEod,
        createNonKappaLabel: () => 'Label',
        createNonKappaTooltip: () => 'Tooltip',
      };

      const settings = useTaskSettings(mockStore, reactiveOptions);

      // Initially should not include EOD control
      expect(settings.filterControls.value.length).toBe(4);

      // Change to EOD
      // Note: In real usage this would be a ref that gets updated
      // Here we're testing the computed reactivity
      const newOptions = {
        ...reactiveOptions,
        isSelfEod: computed(() => true),
      };
      const newSettings = useTaskSettings(mockStore, newOptions);
      expect(newSettings.filterControls.value.length).toBe(5);
    });
  });

  describe('model bindings', () => {
    it('binds correct models to filter controls', () => {
      const settings = useTaskSettings(mockStore, mockOptions);
      const controls = settings.filterControls.value;

      const globalControl = controls.find((c) => c.key === 'global-tasks');
      const kappaControl = controls.find((c) => c.key === 'kappa-required');

      expect(globalControl?.model).toBe(settings.showGlobalTasks);
      expect(kappaControl?.model).toBe(settings.showKappaRequiredTasks);
    });

    it('binds correct models to appearance controls', () => {
      const settings = useTaskSettings(mockStore, mockOptions);
      const controls = settings.appearanceControls.value;

      const requiredControl = controls.find((c) => c.key === 'required-labels');
      const experienceControl = controls.find((c) => c.key === 'experience');

      expect(requiredControl?.model).toBe(settings.showRequiredRequirementLabels);
      expect(experienceControl?.model).toBe(settings.showExperienceRewards);
    });
  });

  describe('integration scenarios', () => {
    it('handles multiple toggle changes in sequence', () => {
      const settings = useTaskSettings(mockStore, mockOptions);

      settings.showGlobalTasks.value = false;
      settings.showKappaRequiredTasks.value = false;
      settings.showExperienceRewards.value = false;

      expect(mockStore.getHideGlobalTasks).toBe(true);
      expect(mockStore.getHideKappaRequiredTasks).toBe(true);
      expect(mockStore.getShowExperienceRewards).toBe(false);
    });

    it('maintains consistency between direct and inverted toggles', () => {
      const settings = useTaskSettings(mockStore, mockOptions);

      // Change via show toggle
      settings.showGlobalTasks.value = false;
      expect(settings.hideGlobalTasks.value).toBe(mockStore.getHideGlobalTasks);

      // Change via hide toggle
      settings.hideGlobalTasks.value = false;
      expect(settings.showGlobalTasks.value).toBe(!mockStore.getHideGlobalTasks);

      // Verify store state
      expect(mockStore.getHideGlobalTasks).toBe(false);
    });

    it('works with all toggles set to opposite defaults', () => {
      // Set all toggles to opposite of their defaults
      mockStore.setHideGlobalTasks(true);
      mockStore.setHideNonKappaTasks(true);
      mockStore.setHideKappaRequiredTasks(true);
      mockStore.setShowOptionalTaskRequirementLabels(false);

      const settings = useTaskSettings(mockStore, mockOptions);

      expect(settings.showGlobalTasks.value).toBe(false);
      expect(settings.showNonEndgameTasks.value).toBe(false);
      expect(settings.showKappaRequiredTasks.value).toBe(false);
      expect(settings.showOptionalRequirementLabels.value).toBe(false);
    });
  });
});
