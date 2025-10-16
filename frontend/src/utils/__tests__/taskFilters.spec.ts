import { describe, it, expect } from 'vitest';
import { taskMatchesRequirementFilters, type RequirementFilterOptions } from '../taskFilters';
import type { Task } from '@/types/tarkov';

describe('taskFilters', () => {
  describe('taskMatchesRequirementFilters', () => {
    const defaultOptions: RequirementFilterOptions = {
      showKappa: true,
      showLightkeeper: true,
      showEod: true,
      hideNonEndgame: false,
      treatEodAsEndgame: false,
    };

    describe('tasks without special requirements', () => {
      it('shows regular tasks when no filters applied', () => {
        const task: Task = {
          id: 'task1',
          name: 'Regular Task',
          kappaRequired: false,
          lightkeeperRequired: false,
          eodOnly: false,
        } as Task;

        expect(taskMatchesRequirementFilters(task, defaultOptions)).toBe(true);
      });

      it('hides regular tasks when hideNonEndgame is true', () => {
        const task: Task = {
          id: 'task1',
          name: 'Regular Task',
          kappaRequired: false,
          lightkeeperRequired: false,
          eodOnly: false,
        } as Task;

        const options = { ...defaultOptions, hideNonEndgame: true };
        expect(taskMatchesRequirementFilters(task, options)).toBe(false);
      });
    });

    describe('Kappa required tasks', () => {
      it('shows Kappa tasks when showKappa is true', () => {
        const task: Task = {
          id: 'task1',
          name: 'Kappa Task',
          kappaRequired: true,
          lightkeeperRequired: false,
          eodOnly: false,
        } as Task;

        expect(taskMatchesRequirementFilters(task, defaultOptions)).toBe(true);
      });

      it('hides Kappa tasks when showKappa is false', () => {
        const task: Task = {
          id: 'task1',
          name: 'Kappa Task',
          kappaRequired: true,
          lightkeeperRequired: false,
          eodOnly: false,
        } as Task;

        const options = { ...defaultOptions, showKappa: false };
        expect(taskMatchesRequirementFilters(task, options)).toBe(false);
      });

      it('shows Kappa tasks even when hideNonEndgame is true', () => {
        const task: Task = {
          id: 'task1',
          name: 'Kappa Task',
          kappaRequired: true,
          lightkeeperRequired: false,
          eodOnly: false,
        } as Task;

        const options = { ...defaultOptions, hideNonEndgame: true };
        expect(taskMatchesRequirementFilters(task, options)).toBe(true);
      });
    });

    describe('Lightkeeper required tasks', () => {
      it('shows Lightkeeper tasks when showLightkeeper is true', () => {
        const task: Task = {
          id: 'task1',
          name: 'Lightkeeper Task',
          kappaRequired: false,
          lightkeeperRequired: true,
          eodOnly: false,
        } as Task;

        expect(taskMatchesRequirementFilters(task, defaultOptions)).toBe(true);
      });

      it('hides Lightkeeper tasks when showLightkeeper is false', () => {
        const task: Task = {
          id: 'task1',
          name: 'Lightkeeper Task',
          kappaRequired: false,
          lightkeeperRequired: true,
          eodOnly: false,
        } as Task;

        const options = { ...defaultOptions, showLightkeeper: false };
        expect(taskMatchesRequirementFilters(task, options)).toBe(false);
      });

      it('shows Lightkeeper tasks even when hideNonEndgame is true', () => {
        const task: Task = {
          id: 'task1',
          name: 'Lightkeeper Task',
          kappaRequired: false,
          lightkeeperRequired: true,
          eodOnly: false,
        } as Task;

        const options = { ...defaultOptions, hideNonEndgame: true };
        expect(taskMatchesRequirementFilters(task, options)).toBe(true);
      });
    });

    describe('Lightkeeper trader tasks', () => {
      it('treats Lightkeeper trader tasks as lightkeeper tasks', () => {
        const task: Task = {
          id: 'task1',
          name: 'Task from Lightkeeper',
          kappaRequired: false,
          lightkeeperRequired: false,
          eodOnly: false,
          trader: {
            id: 'lightkeeper',
            name: 'Lightkeeper',
            normalizedName: 'lightkeeper',
          },
        } as Task;

        expect(taskMatchesRequirementFilters(task, defaultOptions)).toBe(true);
      });

      it('hides Lightkeeper trader tasks when showLightkeeper is false', () => {
        const task: Task = {
          id: 'task1',
          name: 'Task from Lightkeeper',
          kappaRequired: false,
          lightkeeperRequired: false,
          eodOnly: false,
          trader: {
            id: 'lightkeeper',
            name: 'Lightkeeper',
            normalizedName: 'lightkeeper',
          },
        } as Task;

        const options = { ...defaultOptions, showLightkeeper: false };
        expect(taskMatchesRequirementFilters(task, options)).toBe(false);
      });

      it('handles case insensitive trader name matching', () => {
        const task: Task = {
          id: 'task1',
          name: 'Task from Lightkeeper',
          kappaRequired: false,
          lightkeeperRequired: false,
          eodOnly: false,
          trader: {
            id: 'LightKeeper',
            name: 'LIGHTKEEPER',
            normalizedName: 'LightKeeper',
          },
        } as Task;

        expect(taskMatchesRequirementFilters(task, defaultOptions)).toBe(true);
      });

      it('handles whitespace in trader names', () => {
        const task: Task = {
          id: 'task1',
          name: 'Task from Lightkeeper',
          kappaRequired: false,
          lightkeeperRequired: false,
          eodOnly: false,
          trader: {
            id: '  lightkeeper  ',
            name: 'Lightkeeper',
            normalizedName: 'lightkeeper',
          },
        } as Task;

        expect(taskMatchesRequirementFilters(task, defaultOptions)).toBe(true);
      });

      it('does not match partial trader names', () => {
        const task: Task = {
          id: 'task1',
          name: 'Task from someone else',
          kappaRequired: false,
          lightkeeperRequired: false,
          eodOnly: false,
          trader: {
            id: 'lightkeeper-quest',
            name: 'Lightkeeper Quest',
            normalizedName: 'lightkeeperquest',
          },
        } as Task;

        const options = { ...defaultOptions, showLightkeeper: false };
        // Should still be visible as a regular task
        expect(taskMatchesRequirementFilters(task, options)).toBe(true);
      });
    });

    describe('EOD only tasks', () => {
      it('shows EOD tasks when showEod is true', () => {
        const task: Task = {
          id: 'task1',
          name: 'EOD Task',
          kappaRequired: false,
          lightkeeperRequired: false,
          eodOnly: true,
        } as Task;

        expect(taskMatchesRequirementFilters(task, defaultOptions)).toBe(true);
      });

      it('hides EOD tasks when showEod is false', () => {
        const task: Task = {
          id: 'task1',
          name: 'EOD Task',
          kappaRequired: false,
          lightkeeperRequired: false,
          eodOnly: true,
        } as Task;

        const options = { ...defaultOptions, showEod: false };
        expect(taskMatchesRequirementFilters(task, options)).toBe(false);
      });

      it('hides EOD tasks when hideNonEndgame is true and treatEodAsEndgame is false', () => {
        const task: Task = {
          id: 'task1',
          name: 'EOD Task',
          kappaRequired: false,
          lightkeeperRequired: false,
          eodOnly: true,
        } as Task;

        const options = { ...defaultOptions, hideNonEndgame: true, treatEodAsEndgame: false };
        expect(taskMatchesRequirementFilters(task, options)).toBe(false);
      });

      it('shows EOD tasks when hideNonEndgame is true and treatEodAsEndgame is true', () => {
        const task: Task = {
          id: 'task1',
          name: 'EOD Task',
          kappaRequired: false,
          lightkeeperRequired: false,
          eodOnly: true,
        } as Task;

        const options = { ...defaultOptions, hideNonEndgame: true, treatEodAsEndgame: true };
        expect(taskMatchesRequirementFilters(task, options)).toBe(true);
      });
    });

    describe('multiple requirements', () => {
      it('shows task with multiple requirements when all are enabled', () => {
        const task: Task = {
          id: 'task1',
          name: 'Complex Task',
          kappaRequired: true,
          lightkeeperRequired: true,
          eodOnly: true,
        } as Task;

        expect(taskMatchesRequirementFilters(task, defaultOptions)).toBe(true);
      });

      it('shows task with multiple requirements when at least one is enabled', () => {
        const task: Task = {
          id: 'task1',
          name: 'Complex Task',
          kappaRequired: true,
          lightkeeperRequired: true,
          eodOnly: false,
        } as Task;

        const options = { ...defaultOptions, showKappa: false };
        // Still visible because showLightkeeper is true
        expect(taskMatchesRequirementFilters(task, options)).toBe(true);
      });

      it('hides task with multiple requirements when all are disabled', () => {
        const task: Task = {
          id: 'task1',
          name: 'Complex Task',
          kappaRequired: true,
          lightkeeperRequired: true,
          eodOnly: true,
        } as Task;

        const options = {
          ...defaultOptions,
          showKappa: false,
          showLightkeeper: false,
          showEod: false,
        };
        expect(taskMatchesRequirementFilters(task, options)).toBe(false);
      });

      it('shows task that has both lightkeeperRequired and is from Lightkeeper trader', () => {
        const task: Task = {
          id: 'task1',
          name: 'Lightkeeper Task',
          kappaRequired: false,
          lightkeeperRequired: true,
          eodOnly: false,
          trader: {
            id: 'lightkeeper',
            name: 'Lightkeeper',
            normalizedName: 'lightkeeper',
          },
        } as Task;

        expect(taskMatchesRequirementFilters(task, defaultOptions)).toBe(true);
      });
    });

    describe('edge cases', () => {
      it('handles missing trader gracefully', () => {
        const task: Task = {
          id: 'task1',
          name: 'Task without trader',
          kappaRequired: false,
          lightkeeperRequired: false,
          eodOnly: false,
          trader: undefined,
        } as unknown as Task;

        expect(taskMatchesRequirementFilters(task, defaultOptions)).toBe(true);
      });

      it('handles null trader gracefully', () => {
        const task: Task = {
          id: 'task1',
          name: 'Task with null trader',
          kappaRequired: false,
          lightkeeperRequired: false,
          eodOnly: false,
          trader: null,
        } as unknown as Task;

        expect(taskMatchesRequirementFilters(task, defaultOptions)).toBe(true);
      });

      it('handles trader with partial data', () => {
        const task: Task = {
          id: 'task1',
          name: 'Task with partial trader',
          kappaRequired: false,
          lightkeeperRequired: false,
          eodOnly: false,
          trader: {
            id: undefined,
            name: 'Lightkeeper',
          } as unknown as Task['trader'],
        } as Task;

        expect(taskMatchesRequirementFilters(task, defaultOptions)).toBe(true);
      });

      it('handles undefined requirement flags', () => {
        const task: Task = {
          id: 'task1',
          name: 'Task with undefined flags',
          kappaRequired: undefined,
          lightkeeperRequired: undefined,
          eodOnly: undefined,
        } as unknown as Task;

        // Should be treated as a regular task
        expect(taskMatchesRequirementFilters(task, defaultOptions)).toBe(true);
      });

      it('requires exact true value for requirements', () => {
        const task: Task = {
          id: 'task1',
          name: 'Task with truthy values',
          kappaRequired: 1 as unknown as boolean,
          lightkeeperRequired: 'yes' as unknown as boolean,
          eodOnly: {} as unknown as boolean,
        } as Task;

        // Should not match because values are not exactly true
        expect(taskMatchesRequirementFilters(task, defaultOptions)).toBe(true);
      });
    });

    describe('filter combinations', () => {
      it('correctly applies hideNonEndgame with all requirement filters', () => {
        const regularTask: Task = {
          id: 'regular',
          name: 'Regular',
          kappaRequired: false,
          lightkeeperRequired: false,
          eodOnly: false,
        } as Task;

        const kappaTask: Task = {
          id: 'kappa',
          name: 'Kappa',
          kappaRequired: true,
          lightkeeperRequired: false,
          eodOnly: false,
        } as Task;

        const lightkeeperTask: Task = {
          id: 'lightkeeper',
          name: 'Lightkeeper',
          kappaRequired: false,
          lightkeeperRequired: true,
          eodOnly: false,
        } as Task;

        const eodTask: Task = {
          id: 'eod',
          name: 'EOD',
          kappaRequired: false,
          lightkeeperRequired: false,
          eodOnly: true,
        } as Task;

        const options = { ...defaultOptions, hideNonEndgame: true };

        expect(taskMatchesRequirementFilters(regularTask, options)).toBe(false);
        expect(taskMatchesRequirementFilters(kappaTask, options)).toBe(true);
        expect(taskMatchesRequirementFilters(lightkeeperTask, options)).toBe(true);
        expect(taskMatchesRequirementFilters(eodTask, options)).toBe(false);
      });

      it('respects all filter toggles together', () => {
        const task: Task = {
          id: 'task1',
          name: 'Kappa and Lightkeeper Task',
          kappaRequired: true,
          lightkeeperRequired: true,
          eodOnly: false,
        } as Task;

        const options: RequirementFilterOptions = {
          showKappa: true,
          showLightkeeper: false,
          showEod: false,
          hideNonEndgame: true,
          treatEodAsEndgame: false,
        };

        // Should be visible because Kappa is enabled
        expect(taskMatchesRequirementFilters(task, options)).toBe(true);
      });
    });
  });
});
