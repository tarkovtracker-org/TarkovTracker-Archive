import type { Task } from '@/types/tarkov';

export interface RequirementFilterOptions {
  showKappa: boolean;
  showLightkeeper: boolean;
  showEod: boolean;
  hideNonEndgame: boolean;
  treatEodAsEndgame: boolean;
}

const LIGHTKEEPER_KEY = 'lightkeeper';

const isLightkeeperTrader = (task: Task): boolean => {
  const identifiers = [
    task.trader?.id,
    task.trader?.name,
    task.trader?.normalizedName,
  ];

  return identifiers.some(
    (value) => typeof value === 'string' && value.trim().toLowerCase() === LIGHTKEEPER_KEY
  );
};

/**
 * Determines whether a task should be visible based on requirement toggles.
 * Lightkeeper filtering also includes quests offered by the Lightkeeper trader.
 */
export function taskMatchesRequirementFilters(
  task: Task,
  {
    showKappa,
    showLightkeeper,
    showEod,
    hideNonEndgame,
    treatEodAsEndgame,
  }: RequirementFilterOptions
): boolean {
  const hasKappaRequirement = task.kappaRequired === true;
  const hasLightkeeperRequirement = task.lightkeeperRequired === true;
  const isLightkeeperTraderTask = isLightkeeperTrader(task);
  const lightkeeperTask = hasLightkeeperRequirement || isLightkeeperTraderTask;
  const hasEodRequirement = task.eodOnly === true;

  if (
    hideNonEndgame &&
    !hasKappaRequirement &&
    !lightkeeperTask &&
    !(treatEodAsEndgame && hasEodRequirement)
  ) {
    return false;
  }

  const hasAnyRequirement =
    hasKappaRequirement || lightkeeperTask || hasEodRequirement;

  if (!hasAnyRequirement) {
    return true;
  }

  const matchesVisibleRequirement = (
    (hasKappaRequirement && showKappa) ||
    (lightkeeperTask && showLightkeeper) ||
    (hasEodRequirement && showEod)
  );

  return matchesVisibleRequirement;
}
