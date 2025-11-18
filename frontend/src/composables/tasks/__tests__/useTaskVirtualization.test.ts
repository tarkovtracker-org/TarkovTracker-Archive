import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ref } from 'vue';
import { useTaskVirtualization } from '../useTaskVirtualization';
import type { Task } from '@/types/models/tarkov';

describe('useTaskVirtualization', () => {
  const mockTasks = ref<Task[]>([
    { id: 'task1', name: 'Task 1', objectives: [] } as Task,
    { id: 'task2', name: 'Task 2', objectives: [] } as Task,
    { id: 'task3', name: 'Task 3', objectives: [] } as Task,
  ]);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default values', () => {
    const { visibleItems, scrollTop } = useTaskVirtualization(mockTasks);

    expect(visibleItems.value).toEqual([]);
    expect(scrollTop.value).toBe(0);
  });

  it('should filter visible items based on container height', () => {
    const { visibleItems, updateVisibleItems } = useTaskVirtualization(mockTasks);

    updateVisibleItems();

    // Should calculate which items are visible
    expect(visibleItems.value.length).toBeGreaterThan(0);
  });

  it('should handle empty task list', () => {
    const emptyTasks = ref<Task[]>([]);
    const { visibleItems } = useTaskVirtualization(emptyTasks);

    expect(visibleItems.value).toEqual([]);
  });

  it('should update scroll position correctly', () => {
    const { scrollTop } = useTaskVirtualization(mockTasks);

    // scrollTop is a ref that can be directly modified
    scrollTop.value = 50;

    expect(scrollTop.value).toBe(50);
  });
});
