/**
 * Deterministic Tarkov.dev task fixture for integration tests.
 * Keeps the dataset intentionally small but structurally accurate.
 */

const CORE_TASKS = [
  {
    id: 'task-alpha',
    name: 'Alpha Signal',
    factionName: 'Any',
    objectives: [{ id: 'objective-alpha-1' }],
    taskRequirements: [],
    alternatives: [],
  },
  {
    id: 'task-beta',
    name: 'Beta Sweep',
    factionName: 'USEC',
    objectives: [{ id: 'objective-beta-1' }],
    taskRequirements: [
      {
        task: { id: 'task-alpha' },
        status: ['complete'],
      },
    ],
    alternatives: [],
  },
  {
    id: 'task-gamma',
    name: 'Gamma Interception',
    factionName: 'BEAR',
    objectives: [{ id: 'objective-gamma-1' }],
    taskRequirements: [],
    alternatives: ['task-beta'],
  },
] as const;

const ADDITIONAL_TASK_IDS = [
  'task-1',
  'task-2',
  'task-3',
  'task-4',
  'task-5',
  'task-6',
  'task-7',
  'task-8',
  'user-task-1',
  'user-task-2',
  'user-task-3',
  'initial-task',
  'rollback-task',
  'owner-task',
  'owner-only-task',
  'member-task',
  'permission-test-task',
  'removal-test-task',
  'token-test-task',
  'multi-token-task-1',
  'multi-token-task-2',
  'concurrent-task-0',
  'concurrent-task-1',
  'concurrent-task-2',
  'concurrent-task-3',
  'concurrent-task-4',
  'concurrent-token-task-0',
  'concurrent-token-task-1',
  'concurrent-token-task-2',
  'concurrent-token-task-3',
  'concurrent-token-task-4',
] as const;

const ADDITIONAL_TASKS = ADDITIONAL_TASK_IDS.map((id) => ({
  id,
  name: id.replace(/-/g, ' '),
  factionName: 'Any',
  objectives: [{ id: `${id}-objective` }],
  taskRequirements: [],
  alternatives: [],
}));

const ALL_TASKS = [...CORE_TASKS, ...ADDITIONAL_TASKS];

export const TARKOV_TASKS_FIXTURE = {
  tasks: ALL_TASKS,
  data: ALL_TASKS,
  lastUpdated: 'fixture',
  source: 'tarkov.dev-fixture',
} as const;
