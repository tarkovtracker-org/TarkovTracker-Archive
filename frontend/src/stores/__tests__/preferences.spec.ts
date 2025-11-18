import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { usePreferencesStore } from '../preferences';

describe('Preferences Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('initializes with default state', () => {
    const store = usePreferencesStore();

    expect(store.allTipsHidden).toBe(false);
    expect(store.hideTips).toEqual({});
    expect(store.streamerMode).toBe(false);
    expect(store.hideGlobalTasks).toBe(false);
  });

  describe('Tip Management', () => {
    it('can hide individual tips', () => {
      const store = usePreferencesStore();

      store.hideTip('test-tip');

      expect(store.hideTips['test-tip']).toBe(true);
      expect(store.showTip('test-tip')).toBe(false);
      expect(store.hiddenTipCount).toBe(1);
    });

    it('can unhide all tips', () => {
      const store = usePreferencesStore();

      store.hideTip('tip1');
      store.hideTip('tip2');
      store.unhideTips();

      expect(store.hideTips).toEqual({});
      expect(store.hiddenTipCount).toBe(0);
      expect(store.allTipsHidden).toBe(false);
    });

    it('can hide all tips globally', () => {
      const store = usePreferencesStore();

      store.enableHideAllTips();

      expect(store.allTipsHidden).toBe(true);
      expect(store.showTip('any-tip')).toBe(false);
    });
  });

  describe('Content Filtering', () => {
    it('can toggle global tasks hiding', () => {
      const store = usePreferencesStore();

      store.setHideGlobalTasks(true);

      expect(store.hideGlobalTasks).toBe(true);
      expect(store.saving?.hideGlobalTasks).toBe(true);
    });

    it('can toggle non-kappa tasks hiding', () => {
      const store = usePreferencesStore();

      store.setHideNonKappaTasks(true);

      expect(store.hideNonKappaTasks).toBe(true);
      expect(store.saving?.hideNonKappaTasks).toBe(true);
    });

    it('can toggle kappa required tasks hiding', () => {
      const store = usePreferencesStore();

      store.setHideKappaRequiredTasks(true);

      expect(store.hideKappaRequiredTasks).toBe(true);
      expect(store.saving?.hideKappaRequiredTasks).toBe(true);
    });

    it('can toggle lightkeeper required tasks hiding', () => {
      const store = usePreferencesStore();

      store.setHideLightkeeperRequiredTasks(true);

      expect(store.hideLightkeeperRequiredTasks).toBe(true);
      expect(store.saving?.hideLightkeeperRequiredTasks).toBe(true);
    });

    it('can toggle EOD only tasks hiding', () => {
      const store = usePreferencesStore();

      store.setHideEodOnlyTasks(true);

      expect(store.hideEodOnlyTasks).toBe(true);
      expect(store.saving?.hideEodOnlyTasks).toBe(true);
    });
  });

  describe('Streamer Mode', () => {
    it('can toggle streamer mode', () => {
      const store = usePreferencesStore();

      store.setStreamerMode(true);

      expect(store.streamerMode).toBe(true);
      expect(store.saving?.streamerMode).toBe(true);
    });
  });

  describe('Getters', () => {
    it('showTip returns false for hidden tips', () => {
      const store = usePreferencesStore();

      store.hideTip('hidden-tip');

      expect(store.showTip('hidden-tip')).toBe(false);
    });

    it('showTip returns true for visible tips', () => {
      const store = usePreferencesStore();

      expect(store.showTip('visible-tip')).toBe(true);
    });

    it('hiddenTipCount counts hidden tips correctly', () => {
      const store = usePreferencesStore();

      store.hideTip('tip1');
      store.hideTip('tip2');

      expect(store.hiddenTipCount).toBe(2);
    });

    it('getter methods return correct default values', () => {
      const store = usePreferencesStore();

      expect(store.getStreamerMode).toBe(false);
      expect(store.getHideGlobalTasks).toBe(false);
      expect(store.getHideNonKappaTasks).toBe(false);
    });
  });

  describe('Persistence', () => {
    it('persists state to localStorage', () => {
      const store = usePreferencesStore();

      store.setStreamerMode(true);
      store.hideTip('test-tip');

      const saved = localStorage.getItem('user-preferences');
      expect(saved).toBeTruthy();

      const parsed = JSON.parse(saved!);
      expect(parsed.streamerMode).toBe(true);
      expect(parsed.hideTips['test-tip']).toBe(true);
      expect(parsed.saving).toBeUndefined();
    });

    it('can reset to default state', () => {
      const store = usePreferencesStore();

      store.setStreamerMode(true);
      store.hideTip('test-tip');
      store.resetPreferences();

      expect(store.streamerMode).toBe(false);
      expect(store.hideTips).toEqual({});
      expect(store.allTipsHidden).toBe(false);
    });
  });
});
