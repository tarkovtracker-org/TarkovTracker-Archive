import type { Task, TaskObjective } from '@/types/tarkov';

export const addLocationId = (locationIds: Set<string>, id?: string | null) => {
  if (id) locationIds.add(id);
};

export const collectObjectiveLocationIds = (objective: TaskObjective, locationIds: Set<string>) => {
  // Collect from objective.maps
  if (Array.isArray(objective.maps)) {
    objective.maps.forEach((objMap) => addLocationId(locationIds, objMap?.id));
  }

  // Collect from objective.location
  addLocationId(locationIds, objective.location?.id);

  // Collect from objective.possibleLocations
  if (Array.isArray(objective.possibleLocations)) {
    objective.possibleLocations.forEach((loc) => addLocationId(locationIds, loc?.map?.id));
  }

  // Collect from objective.zones
  if (Array.isArray(objective.zones)) {
    objective.zones.forEach((zone) => addLocationId(locationIds, zone?.map?.id));
  }
};

export const resolveObjectiveMapIds = (objective: TaskObjective): string[] => {
  const ids = new Set<string>();
  collectObjectiveLocationIds(objective, ids);
  return [...ids];
};

export const collectTaskLocationIds = (task: Task): Set<string> => {
  const locationIds = new Set<string>();
  if (task.objectives) {
    task.objectives.forEach((objective) => {
      collectObjectiveLocationIds(objective, locationIds);
    });
  }
  return locationIds;
};
