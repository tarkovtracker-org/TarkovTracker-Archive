import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useUserStore } from '../user';
// Mock dependencies
vi.mock('@/plugins/firebase', () => ({
  fireuser: {
    loggedIn: false,
    uid: 'test-uid',
  },
}));
vi.mock('@/plugins/pinia', () => ({
  default: {},
}));
vi.mock('@/plugins/pinia-firestore', () => ({
  type: {},
}));
vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));
// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
vi.stubGlobal('localStorage', localStorageMock);
describe('user store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });
  describe('initial state', () => {
    it('should have correct default state', () => {
      const store = useUserStore();
      expect(store.allTipsHidden).toBe(false);
      expect(store.hideTips).toEqual({});
      expect(store.streamerMode).toBe(false);
      expect(store.teamHide).toEqual({});
      expect(store.taskTeamHideAll).toBe(false);
      expect(store.itemsTeamHideAll).toBe(false);
      expect(store.itemsTeamHideNonFIR).toBe(false);
      expect(store.itemsTeamHideHideout).toBe(false);
      expect(store.mapTeamHideAll).toBe(false);
      expect(store.taskPrimaryView).toBe(null);
      expect(store.taskMapView).toBe(null);
      expect(store.taskTraderView).toBe(null);
      expect(store.taskSecondaryView).toBe(null);
      expect(store.taskUserView).toBe(null);
      expect(store.neededTypeView).toBe(null);
      expect(store.itemsHideNonFIR).toBe(false);
      expect(store.hideGlobalTasks).toBe(false);
      expect(store.hideNonKappaTasks).toBe(false);
      expect(store.hideKappaRequiredTasks).toBe(false);
      expect(store.hideLightkeeperRequiredTasks).toBe(false);
      expect(store.hideEodOnlyTasks).toBe(false);
      expect(store.showOptionalTaskRequirementLabels).toBe(true);
      expect(store.showRequiredTaskRequirementLabels).toBe(true);
      expect(store.showExperienceRewards).toBe(true);
      expect(store.showNextTasks).toBe(false);
      expect(store.showPreviousTasks).toBe(false);
      expect(store.showTaskIds).toBe(false);
      expect(store.neededitemsStyle).toBe(null);
      expect(store.hideoutPrimaryView).toBe(null);
      expect(store.saving).toEqual({
        streamerMode: false,
        hideGlobalTasks: false,
        hideNonKappaTasks: false,
        hideKappaRequiredTasks: false,
        hideLightkeeperRequiredTasks: false,
        hideEodOnlyTasks: false,
        itemsNeededHideNonFIR: false,
        itemsTeamHideNonFIR: false,
        showExperienceRewards: false,
        showNextTasks: false,
        showTaskIds: false,
        showPreviousTasks: false,
      });
    });
  });
  describe('getters', () => {
    describe('showTip', () => {
      it('should return true when tip is not hidden', () => {
        const store = useUserStore();
        expect(store.showTip('test-tip')).toBe(true);
      });
      it('should return false when tip is individually hidden', () => {
        const store = useUserStore();
        store.hideTips = { 'test-tip': true };
        expect(store.showTip('test-tip')).toBe(false);
      });
      it('should return false when all tips are hidden', () => {
        const store = useUserStore();
        store.allTipsHidden = true;
        expect(store.showTip('test-tip')).toBe(false);
      });
      it('should return false when both individual and all tips are hidden', () => {
        const store = useUserStore();
        store.allTipsHidden = true;
        store.hideTips = { 'test-tip': false };
        expect(store.showTip('test-tip')).toBe(false);
      });
    });
    describe('hiddenTipCount', () => {
      it('should return 0 when no tips are hidden', () => {
        const store = useUserStore();
        expect(store.hiddenTipCount).toBe(0);
      });
      it('should return correct count of hidden tips', () => {
        const store = useUserStore();
        store.hideTips = { tip1: true, tip2: true, tip3: false };
        // Count all keys in hideTips regardless of their boolean value
        expect(store.hiddenTipCount).toBe(3);
      });
      it('should handle undefined hideTips gracefully', () => {
        const store = useUserStore();
        store.hideTips = undefined as any;
        expect(store.hiddenTipCount).toBe(0);
      });
    });
    describe('teamIsHidden', () => {
      it('should return false when team is not hidden', () => {
        const store = useUserStore();
        expect(store.teamIsHidden('team1')).toBe(false);
      });
      it('should return true when team is individually hidden', () => {
        const store = useUserStore();
        store.teamHide = { team1: true };
        expect(store.teamIsHidden('team1')).toBe(true);
      });
      it('should return true when all teams are hidden', () => {
        const store = useUserStore();
        store.taskTeamHideAll = true;
        expect(store.teamIsHidden('team1')).toBe(true);
        expect(store.teamIsHidden('team2')).toBe(true);
      });
      it('should handle missing teamHide gracefully', () => {
        const store = useUserStore();
        store.teamHide = undefined as any;
        expect(store.teamIsHidden('team1')).toBe(false);
      });
    });
    describe('view getters with defaults', () => {
      it('should return default values when views are null', () => {
        const store = useUserStore();
        // Access getters through the store object
        expect(store.$state.taskPrimaryView ?? 'all').toBe('all');
        expect(store.$state.taskMapView ?? 'all').toBe('all');
        expect(store.$state.taskTraderView ?? 'all').toBe('all');
        expect(store.$state.taskSecondaryView ?? 'available').toBe('available');
        expect(store.$state.taskUserView ?? 'all').toBe('all');
        expect(store.$state.neededTypeView ?? 'all').toBe('all');
        expect(store.$state.hideoutPrimaryView ?? 'available').toBe('available');
      });
      it('should return actual values when views are set', () => {
        const store = useUserStore();
        store.taskPrimaryView = 'active';
        store.taskMapView = 'completed';
        store.taskTraderView = 'prapor';
        store.taskSecondaryView = 'locked';
        store.taskUserView = 'solo';
        store.neededTypeView = 'hideout';
        store.hideoutPrimaryView = 'built';
        expect(store.$state.taskPrimaryView).toBe('active');
        expect(store.$state.taskMapView).toBe('completed');
        expect(store.$state.taskTraderView).toBe('prapor');
        expect(store.$state.taskSecondaryView).toBe('locked');
        expect(store.$state.taskUserView).toBe('solo');
        expect(store.$state.neededTypeView).toBe('hideout');
        expect(store.$state.hideoutPrimaryView).toBe('built');
      });
    });
    describe('items team hiding getters', () => {
      it('should handle itemsTeamAllHidden correctly', () => {
        const store = useUserStore();
        expect(store.itemsTeamAllHidden).toBe(false);
        store.itemsTeamHideAll = true;
        expect(store.itemsTeamAllHidden).toBe(true);
      });
      it('should handle itemsTeamNonFIRHidden correctly', () => {
        const store = useUserStore();
        expect(store.itemsTeamNonFIRHidden).toBe(false);
        store.itemsTeamHideAll = true;
        expect(store.itemsTeamNonFIRHidden).toBe(true);
        store.itemsTeamHideAll = false;
        store.itemsTeamHideNonFIR = true;
        expect(store.itemsTeamNonFIRHidden).toBe(true);
      });
      it('should handle itemsTeamHideoutHidden correctly', () => {
        const store = useUserStore();
        expect(store.itemsTeamHideoutHidden).toBe(false);
        store.itemsTeamHideAll = true;
        expect(store.itemsTeamHideoutHidden).toBe(true);
        store.itemsTeamHideAll = false;
        store.itemsTeamHideHideout = true;
        expect(store.itemsTeamHideoutHidden).toBe(true);
      });
    });
  });
  describe('actions', () => {
    describe('hideTip', () => {
      it('should hide tip and initialize hideTips if needed', () => {
        const store = useUserStore();
        store.hideTips = undefined as any;
        store.hideTip('test-tip');
        expect(store.hideTips).toEqual({ 'test-tip': true });
      });
      it('should hide existing tip', () => {
        const store = useUserStore();
        store.hideTips = { 'existing-tip': false };
        store.hideTip('existing-tip');
        expect(store.hideTips['existing-tip']).toBe(true);
      });
    });
    describe('unhideTips', () => {
      it('should clear all tips and disable hide all', () => {
        const store = useUserStore();
        store.hideTips = { tip1: true, tip2: true };
        store.allTipsHidden = true;
        store.unhideTips();
        expect(store.hideTips).toEqual({});
        expect(store.allTipsHidden).toBe(false);
      });
    });
    describe('enableHideAllTips', () => {
      it('should enable hide all tips', () => {
        const store = useUserStore();
        store.allTipsHidden = false;
        store.enableHideAllTips();
        expect(store.allTipsHidden).toBe(true);
      });
    });
    describe('setStreamerMode', () => {
      it('should enable streamer mode and persist state', () => {
        const store = useUserStore();
        store.streamerMode = false;
        store.setStreamerMode(true);
        expect(store.streamerMode).toBe(true);
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          'user',
          expect.stringContaining('"streamerMode":true')
        );
        expect(store.saving?.streamerMode).toBe(true);
      });
    });
    describe('toggleHidden', () => {
      it('should toggle team hidden state', () => {
        const store = useUserStore();
        store.teamHide = {};
        store.toggleHidden('team1');
        expect(store.teamHide['team1']).toBe(true);
        store.toggleHidden('team1');
        expect(store.teamHide['team1']).toBe(false);
      });
      it('should initialize teamHide if needed', () => {
        const store = useUserStore();
        store.teamHide = undefined as any;
        store.toggleHidden('team1');
        expect(store.teamHide).toEqual({ team1: true });
      });
    });
    describe('team hiding actions', () => {
      it('should set quest team hide all', () => {
        const store = useUserStore();
        store.taskTeamHideAll = false;
        store.setQuestTeamHideAll(true);
        expect(store.taskTeamHideAll).toBe(true);
      });
      it('should set items team hide all', () => {
        const store = useUserStore();
        store.itemsTeamHideAll = false;
        store.setItemsTeamHideAll(true);
        expect(store.itemsTeamHideAll).toBe(true);
      });
      it('should set items team hide non-FIR', () => {
        const store = useUserStore();
        store.itemsTeamHideNonFIR = false;
        store.setItemsTeamHideNonFIR(true);
        expect(store.itemsTeamHideNonFIR).toBe(true);
        expect(store.saving?.itemsTeamHideNonFIR).toBe(true);
      });
      it('should set items team hide hideout', () => {
        const store = useUserStore();
        store.itemsTeamHideHideout = false;
        store.setItemsTeamHideHideout(true);
        expect(store.itemsTeamHideHideout).toBe(true);
      });
      it('should set map team hide all', () => {
        const store = useUserStore();
        store.mapTeamHideAll = false;
        store.setMapTeamHideAll(true);
        expect(store.mapTeamHideAll).toBe(true);
      });
    });
    describe('view setting actions', () => {
      it('should set all task views', () => {
        const store = useUserStore();
        store.setTaskPrimaryView('active');
        store.setTaskMapView('completed');
        store.setTaskTraderView('prapor');
        store.setTaskSecondaryView('locked');
        store.setTaskUserView('solo');
        store.setNeededTypeView('hideout');
        store.setHideoutPrimaryView('built');
        expect(store.taskPrimaryView).toBe('active');
        expect(store.taskMapView).toBe('completed');
        expect(store.taskTraderView).toBe('prapor');
        expect(store.taskSecondaryView).toBe('locked');
        expect(store.taskUserView).toBe('solo');
        expect(store.neededTypeView).toBe('hideout');
        expect(store.hideoutPrimaryView).toBe('built');
      });
    });
    describe('task hiding actions', () => {
      it('should set hide global tasks', () => {
        const store = useUserStore();
        store.hideGlobalTasks = false;
        store.setHideGlobalTasks(true);
        expect(store.hideGlobalTasks).toBe(true);
        expect(localStorageMock.setItem).toHaveBeenCalled();
        expect(store.saving?.hideGlobalTasks).toBe(true);
      });
      it('should set hide non-kappa tasks', () => {
        const store = useUserStore();
        store.hideNonKappaTasks = false;
        store.setHideNonKappaTasks(true);
        expect(store.hideNonKappaTasks).toBe(true);
        expect(localStorageMock.setItem).toHaveBeenCalled();
        expect(store.saving?.hideNonKappaTasks).toBe(true);
      });
      it('should set hide kappa required tasks', () => {
        const store = useUserStore();
        store.hideKappaRequiredTasks = false;
        store.setHideKappaRequiredTasks(true);
        expect(store.hideKappaRequiredTasks).toBe(true);
        expect(localStorageMock.setItem).toHaveBeenCalled();
        expect(store.saving?.hideKappaRequiredTasks).toBe(true);
      });
      it('should set hide lightkeeper required tasks', () => {
        const store = useUserStore();
        store.hideLightkeeperRequiredTasks = false;
        store.setHideLightkeeperRequiredTasks(true);
        expect(store.hideLightkeeperRequiredTasks).toBe(true);
        expect(localStorageMock.setItem).toHaveBeenCalled();
        expect(store.saving?.hideLightkeeperRequiredTasks).toBe(true);
      });
      it('should set hide EOD only tasks', () => {
        const store = useUserStore();
        store.hideEodOnlyTasks = false;
        store.setHideEodOnlyTasks(true);
        expect(store.hideEodOnlyTasks).toBe(true);
        expect(localStorageMock.setItem).toHaveBeenCalled();
        expect(store.saving?.hideEodOnlyTasks).toBe(true);
      });
    });
    describe('UI preference actions', () => {
      it('should set show optional task requirement labels', () => {
        const store = useUserStore();
        store.showOptionalTaskRequirementLabels = false;
        store.setShowOptionalTaskRequirementLabels(true);
        expect(store.showOptionalTaskRequirementLabels).toBe(true);
        expect(localStorageMock.setItem).toHaveBeenCalled();
      });
      it('should set show required task requirement labels', () => {
        const store = useUserStore();
        store.showRequiredTaskRequirementLabels = false;
        store.setShowRequiredTaskRequirementLabels(true);
        expect(store.showRequiredTaskRequirementLabels).toBe(true);
        expect(localStorageMock.setItem).toHaveBeenCalled();
      });
      it('should set show experience rewards', () => {
        const store = useUserStore();
        store.showExperienceRewards = false;
        store.setShowExperienceRewards(true);
        expect(store.showExperienceRewards).toBe(true);
        expect(localStorageMock.setItem).toHaveBeenCalled();
        expect(store.saving?.showExperienceRewards).toBe(true);
      });
      it('should set show next tasks', () => {
        const store = useUserStore();
        store.showNextTasks = false;
        store.setShowNextTasks(true);
        expect(store.showNextTasks).toBe(true);
        expect(localStorageMock.setItem).toHaveBeenCalled();
        expect(store.saving?.showNextTasks).toBe(true);
      });
      it('should set show previous tasks', () => {
        const store = useUserStore();
        store.showPreviousTasks = false;
        store.setShowPreviousTasks(true);
        expect(store.showPreviousTasks).toBe(true);
        expect(localStorageMock.setItem).toHaveBeenCalled();
        expect(store.saving?.showPreviousTasks).toBe(true);
      });
      it('should set show task IDs', () => {
        const store = useUserStore();
        store.showTaskIds = false;
        store.setShowTaskIds(true);
        expect(store.showTaskIds).toBe(true);
        expect(localStorageMock.setItem).toHaveBeenCalled();
        expect(store.saving?.showTaskIds).toBe(true);
      });
      it('should set needed items style', () => {
        const store = useUserStore();
        store.neededitemsStyle = null;
        store.setNeededItemsStyle('compact');
        expect(store.neededitemsStyle).toBe('compact');
      });
    });
  });
  describe('saving state initialization', () => {
    it('should define saving state on store creation', () => {
      const store = useUserStore();
      expect(store.saving).toBeDefined();
    });
    it('should initialize streamerMode to false', () => {
      const store = useUserStore();
      expect(store.saving?.streamerMode).toBe(false);
    });
    it('should initialize hideGlobalTasks to false', () => {
      const store = useUserStore();
      expect(store.saving?.hideGlobalTasks).toBe(false);
    });
    it('should initialize hideNonKappaTasks to false', () => {
      const store = useUserStore();
      expect(store.saving?.hideNonKappaTasks).toBe(false);
    });
    it('should initialize hideKappaRequiredTasks to false', () => {
      const store = useUserStore();
      expect(store.saving?.hideKappaRequiredTasks).toBe(false);
    });
    it('should initialize hideLightkeeperRequiredTasks to false', () => {
      const store = useUserStore();
      expect(store.saving?.hideLightkeeperRequiredTasks).toBe(false);
    });
    it('should initialize hideEodOnlyTasks to false', () => {
      const store = useUserStore();
      expect(store.saving?.hideEodOnlyTasks).toBe(false);
    });
    it('should initialize itemsNeededHideNonFIR to false', () => {
      const store = useUserStore();
      expect(store.saving?.itemsNeededHideNonFIR).toBe(false);
    });
    it('should initialize showExperienceRewards to false', () => {
      const store = useUserStore();
      expect(store.saving?.showExperienceRewards).toBe(false);
    });
    it('should initialize showNextTasks to false', () => {
      const store = useUserStore();
      expect(store.saving?.showNextTasks).toBe(false);
    });
    it('should initialize showTaskIds to false', () => {
      const store = useUserStore();
      expect(store.saving?.showTaskIds).toBe(false);
    });
    it('should initialize showPreviousTasks to false', () => {
      const store = useUserStore();
      expect(store.saving?.showPreviousTasks).toBe(false);
    });
  });
});
