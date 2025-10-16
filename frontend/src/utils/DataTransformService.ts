import type { ProgressData, TransformedObjectives, TransformedHideoutParts, TransformedTraderStandings } from './DataMigrationTypes';

export const transformTaskObjectives = (
  taskObjectives: ProgressData['taskObjectives']
): TransformedObjectives => {
  const transformed: TransformedObjectives = {};

  if (taskObjectives) {
    for (const [id, objective] of Object.entries(taskObjectives)) {
      const transformedObjective: Record<string, unknown> = {
        complete: objective.complete || false,
        count: objective.count || 0,
      };

      if (objective.timestamp !== null && objective.timestamp !== undefined) {
        transformedObjective.timestamp = objective.timestamp;
      }

      transformed[id] = transformedObjective;
    }
  }

  return transformed;
};

export const transformHideoutParts = (
  hideoutParts: ProgressData['hideoutParts']
): TransformedHideoutParts => {
  const transformed: TransformedHideoutParts = {};

  if (hideoutParts) {
    for (const [id, part] of Object.entries(hideoutParts)) {
      const transformedPart: Record<string, unknown> = {
        complete: part.complete || false,
        count: part.count || 0,
      };

      if (part.timestamp !== null && part.timestamp !== undefined) {
        transformedPart.timestamp = part.timestamp;
      }

      transformed[id] = transformedPart;
    }
  }

  return transformed;
};

export const transformTraderStandings = (
  traderStandings: ProgressData['traderStandings']
): TransformedTraderStandings => {
  const transformed: TransformedTraderStandings = {};

  if (!traderStandings) {
    return transformed;
  }

  for (const [traderId, value] of Object.entries(traderStandings)) {
    if (!traderId) continue;

    if (typeof value === 'number') {
      transformed[traderId] = {
        loyaltyLevel: Math.max(0, Math.floor(value)),
        standing: value,
      };
      continue;
    }

    if (typeof value === 'object' && value !== null) {
      const loyaltyLevel = typeof value.loyaltyLevel === 'number' ? value.loyaltyLevel : 0;
      const standing = typeof value.standing === 'number' ? value.standing : 0;

      transformed[traderId] = {
        loyaltyLevel,
        standing,
      };
    }
  }

  return transformed;
};
