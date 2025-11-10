import { describe, it, expect } from 'vitest';
import { collectTaskLocationIds } from '../taskCore';
import type { Task } from '@/types/models/tarkov';

describe('taskCore - collectTaskLocationIds', () => {
  it('returns Set<string> and contains map ids from objective.maps', () => {
    const task = {
      id: 'task1',
      name: 'Test',
      objectives: [
        {
          id: 'obj1',
          type: 'mark',
          maps: [{ id: 'customs', name: 'Customs' }],
        },
      ],
    } as unknown as Task;

    const result = collectTaskLocationIds(task);
    expect(result instanceof Set).toBe(true);
    expect(result.has('customs')).toBe(true);
    expect(result.size).toBe(1);
  });

  it('deduplicates duplicate map ids across multiple objectives', () => {
    const task = {
      id: 'task2',
      name: 'Test',
      objectives: [
        {
          id: 'obj1',
          type: 'visit',
          maps: [{ id: 'customs', name: 'Customs' }],
        },
        {
          id: 'obj2',
          type: 'mark',
          maps: [{ id: 'customs', name: 'Customs' }],
        },
      ],
    } as unknown as Task;

    const result = collectTaskLocationIds(task);
    expect(result.size).toBe(1);
    expect(result.has('customs')).toBe(true);
  });

  it('handles mixed map sources (objective.maps and objective.location)', () => {
    const task = {
      id: 'task3',
      name: 'Test',
      objectives: [
        {
          id: 'obj1',
          type: 'mark',
          maps: [{ id: 'customs', name: 'Customs' }],
          location: { id: 'factory', name: 'Factory' },
        },
      ],
    } as unknown as Task;

    const result = collectTaskLocationIds(task);
    expect(result.has('customs')).toBe(true);
    expect(result.has('factory')).toBe(true);
    expect(result.size).toBe(2);
  });

  it('returns empty Set for tasks with no objectives', () => {
    const task = {
      id: 'task4',
      name: 'Test',
      objectives: [],
    } as unknown as Task;

    const result = collectTaskLocationIds(task);
    expect(result.size).toBe(0);
  });

  it('returns empty Set when objectives is undefined', () => {
    const task = {
      id: 'task5',
      name: 'Test',
    } as unknown as Task;

    const result = collectTaskLocationIds(task);
    expect(result.size).toBe(0);
  });
});
