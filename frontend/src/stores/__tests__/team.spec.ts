import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useTeamStore } from '../team';

describe('Team Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('initializes with default state', () => {
    const store = useTeamStore();

    expect(store.teamHide).toEqual({});
    expect(store.taskTeamHideAll).toBe(false);
    expect(store.itemsTeamHideAll).toBe(false);
    expect(store.itemsTeamHideNonFIR).toBe(false);
    expect(store.itemsTeamHideHideout).toBe(false);
    expect(store.mapTeamHideAll).toBe(false);
  });

  describe('Team Visibility', () => {
    it('can toggle individual team visibility', () => {
      const store = useTeamStore();

      store.toggleHidden('team-123');

      expect(store.teamHide['team-123']).toBe(true);

      store.toggleHidden('team-123');

      expect(store.teamHide['team-123']).toBe(false);
    });

    it('can toggle all task team hiding', () => {
      const store = useTeamStore();

      store.setQuestTeamHideAll(true);

      expect(store.taskTeamHideAll).toBe(true);
    });

    it('can toggle all items team hiding', () => {
      const store = useTeamStore();

      store.setItemsTeamHideAll(true);

      expect(store.itemsTeamHideAll).toBe(true);
    });

    it('can toggle items team non-FIR hiding', () => {
      const store = useTeamStore();

      store.setItemsTeamHideNonFIR(true);

      expect(store.itemsTeamHideNonFIR).toBe(true);
    });

    it('can toggle items team hideout hiding', () => {
      const store = useTeamStore();

      store.setItemsTeamHideHideout(true);

      expect(store.itemsTeamHideHideout).toBe(true);
    });

    it('can toggle all map team hiding', () => {
      const store = useTeamStore();

      store.setMapTeamHideAll(true);

      expect(store.mapTeamHideAll).toBe(true);
    });
  });

  describe('Getters', () => {
    it('teamIsHidden returns true for hidden teams', () => {
      const store = useTeamStore();

      store.toggleHidden('team-123');

      expect(store.teamIsHidden('team-123')).toBe(true);
      expect(store.teamIsHidden('team-456')).toBe(false);
    });

    it('teamIsHidden returns true when all tasks are hidden', () => {
      const store = useTeamStore();

      store.setQuestTeamHideAll(true);

      expect(store.teamIsHidden('any-team')).toBe(true);
    });

    it('itemsTeamNonFIRHidden returns true when items team all hidden', () => {
      const store = useTeamStore();

      store.setItemsTeamHideAll(true);

      expect(store.itemsTeamNonFIRHidden).toBe(true);
    });

    it('itemsTeamNonFIRHidden returns true when items team non-FIR hidden', () => {
      const store = useTeamStore();

      store.setItemsTeamHideNonFIR(true);

      expect(store.itemsTeamNonFIRHidden).toBe(true);
    });

    it('itemsTeamHideoutHidden returns true when items team all hidden', () => {
      const store = useTeamStore();

      store.setItemsTeamHideAll(true);

      expect(store.itemsTeamHideoutHidden).toBe(true);
    });

    it('itemsTeamHideoutHidden returns true when items team hideout hidden', () => {
      const store = useTeamStore();

      store.setItemsTeamHideHideout(true);

      expect(store.itemsTeamHideoutHidden).toBe(true);
    });

    it('returns correct boolean values for all team getters', () => {
      const store = useTeamStore();

      expect(store.taskTeamAllHidden).toBe(false);
      expect(store.itemsTeamAllHidden).toBe(false);
      expect(store.mapTeamAllHidden).toBe(false);
    });
  });

  describe('Reset Actions', () => {
    it('can reset team settings to defaults', () => {
      const store = useTeamStore();

      store.toggleHidden('team-123');
      store.setQuestTeamHideAll(true);
      store.setItemsTeamHideAll(true);
      store.resetTeamSettings();

      expect(store.teamHide).toEqual({});
      expect(store.taskTeamHideAll).toBe(false);
      expect(store.itemsTeamHideAll).toBe(false);
    });

    it('can unhide all teams', () => {
      const store = useTeamStore();

      store.toggleHidden('team-123');
      store.toggleHidden('team-456');
      store.setQuestTeamHideAll(true);
      store.setItemsTeamHideAll(true);
      store.setMapTeamHideAll(true);
      store.unhideAllTeams();

      expect(store.teamHide).toEqual({});
      expect(store.taskTeamHideAll).toBe(false);
      expect(store.itemsTeamHideAll).toBe(false);
      expect(store.mapTeamHideAll).toBe(false);
    });
  });

  describe('Persistence', () => {
    it('persists state to localStorage', () => {
      const store = useTeamStore();

      store.toggleHidden('team-123');
      store.setQuestTeamHideAll(true);

      const saved = localStorage.getItem('user-team');
      expect(saved).toBeTruthy();

      const parsed = JSON.parse(saved!);
      expect(parsed.teamHide['team-123']).toBe(true);
      expect(parsed.taskTeamHideAll).toBe(true);
    });
  });
});
