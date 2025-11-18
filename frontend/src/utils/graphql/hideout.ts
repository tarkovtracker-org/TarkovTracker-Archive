import { itemDataFragment } from './items.js';

export const hideoutModuleFragment = /* GraphQL */ `
  fragment HideoutModuleData on HideoutModule {
    id
    name
    levels {
      id
      level
      itemRequirements {
        id
        item {
          ...ItemData
        }
        count
      }
      stationLevelRequirements {
        level
        station {
          id
          name
        }
      }
      skillRequirements {
        level
        name
      }
      traderRequirements {
        level
        trader {
          id
          name
        }
      }
    }
  }
`;

export const craftFragment = /* GraphQL */ `
  fragment CraftData on Craft {
    id
    stationId
    level
    duration
    requirements {
      item {
        ...ItemData
      }
      count
      type
    }
    rewardItems {
      item {
        ...ItemData
      }
      count
    }
  }
`;
