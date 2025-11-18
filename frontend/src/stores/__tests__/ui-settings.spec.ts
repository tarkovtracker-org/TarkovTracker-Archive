import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useUiSettingsStore } from '../ui-settings';

describe('UI Settings Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('initializes with default state', () => {
    const store = useUiSettingsStore();

    expect(store.taskPrimaryView).toBe(null);
    expect(store.itemsHideNonFIR).toBe(false);
    expect(store.showExperienceRewards).toBe(true);
  });

  describe('Task View Settings', () => {
    it('can set task primary view', () => {
      const store = useUiSettingsStore();

      store.setTaskPrimaryView('completed');

      expect(store.taskPrimaryView).toBe('completed');
    });

    it('can set task map view', () => {
      const store = useUiSettingsStore();

      store.setTaskMapView('factory');

      expect(store.taskMapView).toBe('factory');
    });

    it('can set task trader view', () => {
      const store = useUiSettingsStore();

      store.setTaskTraderView('prapor');

      expect(store.taskTraderView).toBe('prapor');
    });

    it('can set task secondary view', () => {
      const store = useUiSettingsStore();

      store.setTaskSecondaryView('completed');

      expect(store.taskSecondaryView).toBe('completed');
    });

    it('can set task user view', () => {
      const store = useUiSettingsStore();

      store.setTaskUserView('mine');

      expect(store.taskUserView).toBe('mine');
    });
  });

  describe('Item Display Settings', () => {
    it('can set needed type view', () => {
      const store = useUiSettingsStore();

      store.setNeededTypeView('barter');

      expect(store.neededTypeView).toBe('barter');
    });

    it('can toggle non-FIR items hiding', () => {
      const store = useUiSettingsStore();

      store.setItemsNeededHideNonFIR(true);

      expect(store.itemsHideNonFIR).toBe(true);
      expect(store.saving?.itemsNeededHideNonFIR).toBe(true);
    });

    it('can set needed items style', () => {
      const store = useUiSettingsStore();

      store.setNeededItemsStyle('smallCard');

      expect(store.neededitemsStyle).toBe('smallCard');
    });
  });

  describe('Hideout Settings', () => {
    it('can set hideout primary view', () => {
      const store = useUiSettingsStore();

      store.setHideoutPrimaryView('all');

      expect(store.hideoutPrimaryView).toBe('all');
    });
  });

  describe('Task Display Toggles', () => {
    it('can toggle optional requirement labels', () => {
      const store = useUiSettingsStore();

      store.setShowOptionalTaskRequirementLabels(false);

      expect(store.showOptionalTaskRequirementLabels).toBe(false);
    });

    it('can toggle required requirement labels', () => {
      const store = useUiSettingsStore();

      store.setShowRequiredTaskRequirementLabels(false);

      expect(store.showRequiredTaskRequirementLabels).toBe(false);
    });

    it('can toggle experience rewards display', () => {
      const store = useUiSettingsStore();

      store.setShowExperienceRewards(false);

      expect(store.showExperienceRewards).toBe(false);
      expect(store.saving?.showExperienceRewards).toBe(true);
    });

    it('can toggle next tasks display', () => {
      const store = useUiSettingsStore();

      store.setShowNextTasks(true);

      expect(store.showNextTasks).toBe(true);
      expect(store.saving?.showNextTasks).toBe(true);
    });

    it('can toggle previous tasks display', () => {
      const store = useUiSettingsStore();

      store.setShowPreviousTasks(true);

      expect(store.showPreviousTasks).toBe(true);
      expect(store.saving?.showPreviousTasks).toBe(true);
    });

    it('can toggle task IDs display', () => {
      const store = useUiSettingsStore();

      store.setShowTaskIds(true);

      expect(store.showTaskIds).toBe(true);
      expect(store.saving?.showTaskIds).toBe(true);
    });
  });

  describe('Getters', () => {
    it('returns default values when state is null', () => {
      const store = useUiSettingsStore();

      expect(store.getTaskPrimaryView).toBe('all');
      expect(store.getTaskMapView).toBe('all');
      expect(store.getTaskTraderView).toBe('all');
      expect(store.getTaskSecondaryView).toBe('available');
      expect(store.getTaskUserView).toBe('all');
      expect(store.getNeededTypeView).toBe('all');
      expect(store.getNeededItemsStyle).toBe('mediumCard');
      expect(store.getHideoutPrimaryView).toBe('available');
    });

    it('returns actual values when state is set', () => {
      const store = useUiSettingsStore();

      store.setTaskPrimaryView('completed');
      store.setNeededItemsStyle('smallCard');

      expect(store.getTaskPrimaryView).toBe('completed');
      expect(store.getNeededItemsStyle).toBe('smallCard');
    });

    it('returns boolean getter values correctly', () => {
      const store = useUiSettingsStore();

      expect(store.itemsNeededHideNonFIR).toBe(false);
      expect(store.getShowOptionalTaskRequirementLabels).toBe(true);
      expect(store.getShowRequiredTaskRequirementLabels).toBe(true);
    });
  });

  describe('Persistence', () => {
    it('persists state to localStorage', () => {
      const store = useUiSettingsStore();

      store.setTaskPrimaryView('completed');
      store.setItemsNeededHideNonFIR(true);

      const saved = localStorage.getItem('user-ui-settings');
      expect(saved).toBeTruthy();

      const parsed = JSON.parse(saved!);
      expect(parsed.taskPrimaryView).toBe('completed');
      expect(parsed.itemsHideNonFIR).toBe(true);
      expect(parsed.saving).toBeUndefined();
    });

    it('can reset to default state', () => {
      const store = useUiSettingsStore();

      store.setTaskPrimaryView('completed');
      store.setItemsNeededHideNonFIR(true);
      store.resetUiSettings();

      expect(store.taskPrimaryView).toBe(null);
      expect(store.itemsHideNonFIR).toBe(false);
      expect(store.showExperienceRewards).toBe(true);
    });
  });
});
