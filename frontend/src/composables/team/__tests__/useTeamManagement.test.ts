import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireuser, auth, functions, httpsCallable } from '@/plugins/firebase';
import { useLiveData } from '@/composables/livedata';
import { useTarkovStore } from '@/stores/tarkov';
import { useTeamManagement } from '../useTeamManagement';

// Mock Vue - override watch to bypass waitForStoreUpdate
const mockWatch = vi.fn();
const mockNextTick = vi.fn();

// Mock all dependencies
vi.mock('vue-i18n', () => ({
  useI18n: vi.fn(() => ({
    t: vi.fn((key: string) => key),
  })),
}));

vi.mock('@/plugins/firebase', () => ({
  fireuser: {
    loggedIn: true,
    uid: 'test-user-123',
  },
  auth: {
    currentUser: {
      uid: 'test-user-123',
    },
  },
  functions: {},
  httpsCallable: vi.fn(),
}));

vi.mock('@/composables/livedata', () => ({
  useLiveData: vi.fn(() => ({
    useTeamStore: vi.fn(() => ({
      teamStore: {
        $state: {
          owner: 'test-user-123',
          password: 'team-password',
          displayName: 'Test Team Name',
          getOwnerDisplayName: 'Test Display Name',
          setOwnerDisplayName: vi.fn(),
        },
      },
    })),
    useSystemStore: vi.fn(() => ({
      systemStore: {
        $state: {
          team: 'team-123',
        },
      },
    })),
  })),
}));

vi.mock('@/stores/tarkov', () => ({
  useTarkovStore: vi.fn(() => ({
    getDisplayName: vi.fn(() => 'User ABC123'),
    setDisplayName: vi.fn(),
  })),
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

// Mock Vue - override watch to bypass waitForStoreUpdate
vi.mock('vue', async () => {
  const actual = await vi.importActual('vue');
  return {
    ...actual,
    watch: mockWatch,
    nextTick: mockNextTick,
  };
});

describe('useTeamManagement', () => {
  let mockHttpsCallable: any;
  let mockTeamStore: any;
  let mockSystemStore: any;
  let mockTarkovStore: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup fresh mocks
    mockHttpsCallable = vi.fn();
    (httpsCallable as any).mockReturnValue(mockHttpsCallable);

    mockTeamStore = {
      $state: {
        owner: 'test-user-123',
        password: 'team-password',
        displayName: 'Test Team Name',
        getOwnerDisplayName: 'Test Display Name',
      },
      setOwnerDisplayName: vi.fn(),
    };

    mockSystemStore = {
      $state: {
        team: 'team-123',
      },
    };

    mockTarkovStore = {
      getDisplayName: vi.fn(() => 'User ABC123'),
      setDisplayName: vi.fn(),
    };

    (useLiveData as any).mockReturnValue({
      useTeamStore: vi.fn(() => ({ teamStore: mockTeamStore })),
      useSystemStore: vi.fn(() => ({ systemStore: mockSystemStore })),
    });

    (useTarkovStore as any).mockReturnValue(mockTarkovStore);

    // Reset fireuser mock
    (fireuser as any).loggedIn = true;
    (fireuser as any).uid = 'test-user-123';
    (auth as any).currentUser = {
      uid: 'test-user-123',
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default values', () => {
      const { loading, notification, isTeamOwner } = useTeamManagement();

      expect(loading.value).toEqual({ createTeam: false, leaveTeam: false });
      expect(notification.value).toEqual({ show: false, message: '', color: 'accent' });
      expect(isTeamOwner.value).toBe(true); // owner matches fireuser.uid and team exists
    });
  });

  describe('isTeamOwner computed', () => {
    it('should return true when user is team owner and team exists', () => {
      mockTeamStore.$state.owner = 'test-user-123';
      mockSystemStore.$state.team = 'team-123';

      const { isTeamOwner } = useTeamManagement();
      expect(isTeamOwner.value).toBe(true);
    });

    it('should return false when user is not team owner', () => {
      mockTeamStore.$state.owner = 'different-user-456';
      mockSystemStore.$state.team = 'team-123';

      const { isTeamOwner } = useTeamManagement();
      expect(isTeamOwner.value).toBe(false);
    });

    it('should return false when no team exists', () => {
      mockTeamStore.$state.owner = 'test-user-123';
      mockSystemStore.$state.team = null;

      const { isTeamOwner } = useTeamManagement();
      expect(isTeamOwner.value).toBe(false);
    });
  });

  describe('notification state mutation', () => {
    it('should show notification with default accent color', () => {
      const { showNotification, notification } = useTeamManagement();

      showNotification('Test message');

      expect(notification.value).toEqual({
        show: true,
        message: 'Test message',
        color: 'accent',
      });
    });

    it('should show notification with custom color', () => {
      const { showNotification, notification } = useTeamManagement();

      showNotification('Error message', 'error');

      expect(notification.value).toEqual({
        show: true,
        message: 'Error message',
        color: 'error',
      });
    });
  });

  describe('handleCreateTeam', () => {
    it('should set loading flag during operation', async () => {
      const { loading, handleCreateTeam } = useTeamManagement();

      // Initially not loading
      expect(loading.value.createTeam).toBe(false);

      // Mock successful response
      mockHttpsCallable.mockResolvedValue({ data: { team: { id: 'new-team' } } });

      const createPromise = handleCreateTeam();

      // Loading should be set
      expect(loading.value.createTeam).toBe(true);

      await createPromise;

      // Loading should be reset
      expect(loading.value.createTeam).toBe(false);
    });

    it('should call httpsCallable with correct parameters', async () => {
      mockHttpsCallable.mockResolvedValue({ data: { team: { id: 'new-team' } } });

      const { handleCreateTeam } = useTeamManagement();

      await handleCreateTeam();

      expect(httpsCallable).toHaveBeenCalledWith(functions, 'createTeam');
      expect(mockHttpsCallable).toHaveBeenCalledWith({});
    });

    it('should set random display name for owner', async () => {
      mockHttpsCallable.mockResolvedValue({ data: { team: { id: 'new-team' } } });

      const { handleCreateTeam } = useTeamManagement();

      await handleCreateTeam();

      // Should set a random 6-character name
      expect(mockTarkovStore.setDisplayName).toHaveBeenCalledWith(
        expect.stringMatching(/^[A-Za-z0-9]{6}$/)
      );
    });

    it('should handle authentication errors', async () => {
      (fireuser as any).loggedIn = false;

      const { loading, notification, handleCreateTeam } = useTeamManagement();

      await handleCreateTeam();

      expect(loading.value.createTeam).toBe(false);
      expect(notification.value).toEqual({
        show: true,
        message: 'page.team.card.myteam.user_not_authenticated',
        color: 'error',
      });
    });

    it('should handle function call errors', async () => {
      const error = new Error('Function error');
      mockHttpsCallable.mockRejectedValue(error);

      const { loading, notification, handleCreateTeam } = useTeamManagement();

      await handleCreateTeam();

      expect(loading.value.createTeam).toBe(false);
      expect(notification.value).toEqual({
        show: true,
        message: 'Function error',
        color: 'error',
      });
    });

    it('should handle missing team in response', async () => {
      mockHttpsCallable.mockResolvedValue({ data: {} }); // No team property

      const { loading, notification, handleCreateTeam } = useTeamManagement();

      await handleCreateTeam();

      expect(loading.value.createTeam).toBe(false);
      expect(notification.value).toEqual({
        show: true,
        message: 'page.team.card.myteam.create_team_error_ui_update',
        color: 'error',
      });
    });
  });

  describe('handleLeaveTeam', () => {
    it('should set loading flag during operation', async () => {
      const { loading, handleLeaveTeam } = useTeamManagement();

      // Initially not loading
      expect(loading.value.leaveTeam).toBe(false);

      // Mock successful response
      mockHttpsCallable.mockResolvedValue({ data: { left: true } });

      const leavePromise = handleLeaveTeam();

      // Loading should be set
      expect(loading.value.leaveTeam).toBe(true);

      await leavePromise;

      // Loading should be reset
      expect(loading.value.leaveTeam).toBe(false);
    });

    it('should call httpsCallable with correct parameters', async () => {
      mockHttpsCallable.mockResolvedValue({ data: { left: true } });

      const { handleLeaveTeam } = useTeamManagement();

      await handleLeaveTeam();

      expect(httpsCallable).toHaveBeenCalledWith(functions, 'leaveTeam');
      expect(mockHttpsCallable).toHaveBeenCalledWith({});
    });

    it('should reset display name when it starts with "User "', async () => {
      mockHttpsCallable.mockResolvedValue({ data: { left: true } });
      mockTarkovStore.getDisplayName.mockReturnValue('User ABC123');

      const { handleLeaveTeam } = useTeamManagement();

      await handleLeaveTeam();

      expect(mockTarkovStore.setDisplayName).toHaveBeenCalledWith(null);
    });

    it('should not reset display name for custom names', async () => {
      mockHttpsCallable.mockResolvedValue({ data: { left: true } });
      mockTarkovStore.getDisplayName.mockReturnValue('Custom Name');

      const { handleLeaveTeam } = useTeamManagement();

      await handleLeaveTeam();

      expect(mockTarkovStore.setDisplayName).not.toHaveBeenCalled();
    });

    it('should handle authentication errors', async () => {
      (fireuser as any).loggedIn = false;

      const { loading, notification, handleLeaveTeam } = useTeamManagement();

      await handleLeaveTeam();

      expect(loading.value.leaveTeam).toBe(false);
      expect(notification.value).toEqual({
        show: true,
        message: 'page.team.card.myteam.user_not_authenticated',
        color: 'error',
      });
    });

    it('should handle function call errors', async () => {
      const error = new Error('Leave team error');
      mockHttpsCallable.mockRejectedValue(error);

      const { loading, notification, handleLeaveTeam } = useTeamManagement();

      await handleLeaveTeam();

      expect(loading.value.leaveTeam).toBe(false);
      expect(notification.value).toEqual({
        show: true,
        message: 'Leave team error',
        color: 'error',
      });
    });

    it('should handle leave operation failure', async () => {
      mockHttpsCallable.mockResolvedValue({ data: { left: false } });

      // Team still exists in system store
      mockSystemStore.$state.team = 'team-123';

      const { loading, notification, handleLeaveTeam } = useTeamManagement();

      await handleLeaveTeam();

      expect(loading.value.leaveTeam).toBe(false);
      expect(notification.value).toEqual({
        show: true,
        message: 'page.team.card.myteam.leave_team_error',
        color: 'error',
      });
    });
  });
});
