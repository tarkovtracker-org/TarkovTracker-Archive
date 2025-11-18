import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import { useNeededItemLogic, type Need } from '../useNeededItemLogic';
import { useUserStore } from '@/stores/user';
import { useProgressQueries } from '@/composables/useProgressQueries';
import { useTarkovData } from '@/composables/tarkovdata';
import { useTarkovStore } from '@/stores/tarkov';

// Mock all dependencies
vi.mock('@/stores/user');
vi.mock('@/composables/useProgressQueries');
vi.mock('@/composables/tarkovdata');
vi.mock('@/stores/tarkov');

describe('useNeededItemLogic', () => {
  const mockNeed: Need = {
    id: 'test-need-id',
    needType: 'taskObjective',
    type: 'giveItem',
    foundInRaid: true,
    taskId: 'test-task-id',
    count: 5,
    item: {
      id: 'test-item-id',
      name: 'Test Item',
      shortName: 'Test',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mocks
    vi.mocked(useUserStore).mockReturnValue({
      itemsNeededHideNonFIR: false,
      hideKappaRequiredTasks: false,
      hideLightkeeperRequiredTasks: false,
      hideNonKappaTasks: false,
      itemsTeamAllHidden: false,
      itemsTeamNonFIRHidden: false,
      itemsTeamHideoutHidden: false,
    } as any);

    vi.mocked(useProgressQueries).mockReturnValue({
      progressStore: {},
      tasksCompletions: ref({}),
      objectiveCompletions: ref({}),
      moduleCompletions: ref({}),
      modulePartCompletions: ref({}),
      playerFaction: ref({}),
    } as any);

    vi.mocked(useTarkovData).mockReturnValue({
      tasks: ref([]),
      hideoutStations: ref({}),
      alternativeTasks: ref({}),
    } as any);

    vi.mocked(useTarkovStore).mockReturnValue({
      getPMCFaction: 'PMC',
      getObjectiveCount: vi.fn(() => 0),
      getHideoutPartCount: vi.fn(() => 0),
      setObjectiveCount: vi.fn(),
      setHideoutPartCount: vi.fn(),
      isTaskComplete: vi.fn(() => false),
      isHideoutModuleComplete: vi.fn(() => false),
    } as any);
  });

  it('should provide correct item for task objective giveItem type', () => {
    const { item } = useNeededItemLogic(mockNeed);

    expect(item.value).toEqual(mockNeed.item);
  });

  it('should return null for non-giveItem task objectives', () => {
    const nonGiveItemNeed: Need = {
      ...mockNeed,
      type: 'mark',
    };

    const { item } = useNeededItemLogic(nonGiveItemNeed);

    expect(item.value).toBeNull();
  });

  it('should provide correct hideout item', () => {
    const hideoutNeed: Need = {
      ...mockNeed,
      needType: 'hideoutModule',
      item: {
        id: 'hideout-item-id',
        name: 'Hideout Item',
        shortName: 'Hideout',
      },
    };

    const { item } = useNeededItemLogic(hideoutNeed);

    expect(item.value).toEqual(hideoutNeed.item);
  });

  it('should calculate correct needed count', () => {
    const { neededCount } = useNeededItemLogic(mockNeed);

    expect(neededCount.value).toBe(5);
  });

  it('should default needed count to 1 when not specified', () => {
    const needWithoutCount: Need = {
      ...mockNeed,
      count: undefined,
    };

    const { neededCount } = useNeededItemLogic(needWithoutCount);

    expect(neededCount.value).toBe(1);
  });

  it('should provide correct current count for task objectives', () => {
    const mockTarkovStore = {
      getObjectiveCount: vi.fn(() => 3),
      getHideoutPartCount: vi.fn(() => 0),
      isTaskComplete: vi.fn(() => false),
      isHideoutModuleComplete: vi.fn(() => false),
    };
    vi.mocked(useTarkovStore).mockReturnValue(mockTarkovStore as any);

    const { currentCount } = useNeededItemLogic(mockNeed);

    expect(currentCount.value).toBe(3);
    expect(mockTarkovStore.getObjectiveCount).toHaveBeenCalledWith('test-need-id');
  });

  it('should provide correct current count for hideout modules', () => {
    const hideoutNeed: Need = {
      ...mockNeed,
      needType: 'hideoutModule',
    };
    const mockTarkovStore = {
      getObjectiveCount: vi.fn(() => 0),
      getHideoutPartCount: vi.fn(() => 2),
      isTaskComplete: vi.fn(() => false),
      isHideoutModuleComplete: vi.fn(() => false),
    };
    vi.mocked(useTarkovStore).mockReturnValue(mockTarkovStore as any);

    const { currentCount } = useNeededItemLogic(hideoutNeed);

    expect(currentCount.value).toBe(2);
    expect(mockTarkovStore.getHideoutPartCount).toHaveBeenCalledWith('test-need-id');
  });

  it('should handle increase count correctly', () => {
    const mockTarkovStore = {
      getObjectiveCount: vi.fn(() => 3),
      getHideoutPartCount: vi.fn(() => 0),
      setObjectiveCount: vi.fn(),
      setHideoutPartCount: vi.fn(),
      isTaskComplete: vi.fn(() => false),
      isHideoutModuleComplete: vi.fn(() => false),
    };
    vi.mocked(useTarkovStore).mockReturnValue(mockTarkovStore as any);

    const { increaseCount } = useNeededItemLogic(mockNeed);
    increaseCount();

    expect(mockTarkovStore.setObjectiveCount).toHaveBeenCalledWith('test-need-id', 4);
  });

  it('should handle decrease count correctly', () => {
    const mockTarkovStore = {
      getObjectiveCount: vi.fn(() => 3),
      getHideoutPartCount: vi.fn(() => 0),
      setObjectiveCount: vi.fn(),
      setHideoutPartCount: vi.fn(),
      isTaskComplete: vi.fn(() => false),
      isHideoutModuleComplete: vi.fn(() => false),
    };
    vi.mocked(useTarkovStore).mockReturnValue(mockTarkovStore as any);

    const { decreaseCount } = useNeededItemLogic(mockNeed);
    decreaseCount();

    expect(mockTarkovStore.setObjectiveCount).toHaveBeenCalledWith('test-need-id', 2);
  });

  it('should handle toggle count correctly', () => {
    const mockTarkovStore = {
      getObjectiveCount: vi.fn(() => 0),
      getHideoutPartCount: vi.fn(() => 0),
      setObjectiveCount: vi.fn(),
      setHideoutPartCount: vi.fn(),
      isTaskComplete: vi.fn(() => false),
      isHideoutModuleComplete: vi.fn(() => false),
    };
    vi.mocked(useTarkovStore).mockReturnValue(mockTarkovStore as any);

    const { toggleCount } = useNeededItemLogic(mockNeed);
    toggleCount();

    expect(mockTarkovStore.setObjectiveCount).toHaveBeenCalledWith('test-need-id', 5);
  });

  it('should find related task correctly', () => {
    const mockTask = {
      id: 'test-task-id',
      name: 'Test Task',
      objectives: [],
    };
    vi.mocked(useTarkovData).mockReturnValue({
      tasks: ref([mockTask]),
      hideoutStations: ref({}),
      alternativeTasks: ref({}),
    } as any);

    const { relatedTask } = useNeededItemLogic(mockNeed);

    expect(relatedTask.value).toEqual(mockTask);
  });

  it('should return null for related task on hideout module needs', () => {
    const hideoutNeed: Need = {
      ...mockNeed,
      needType: 'hideoutModule',
    };

    const { relatedTask } = useNeededItemLogic(hideoutNeed);

    expect(relatedTask.value).toBeNull();
  });

  it('should calculate image item correctly with default preset', () => {
    const needWithPreset: Need = {
      ...mockNeed,
      item: {
        ...mockNeed.item!,
        properties: {
          defaultPreset: { id: 'preset-id' },
        },
      },
    };

    const { imageItem } = useNeededItemLogic(needWithPreset);

    expect(imageItem.value).toEqual({ id: 'preset-id' });
  });

  it('should return original item when no default preset', () => {
    const { imageItem } = useNeededItemLogic(mockNeed);

    expect(imageItem.value).toEqual(mockNeed.item);
  });

  it('should return null image item when no item exists', () => {
    const needWithoutItem: Need = {
      ...mockNeed,
      item: undefined,
    };

    const { imageItem } = useNeededItemLogic(needWithoutItem);

    expect(imageItem.value).toBeNull();
  });
});
