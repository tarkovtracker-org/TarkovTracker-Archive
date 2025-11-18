import { itemDataFragment } from './items.js';

export const traderFragment = /* GraphQL */ `
  fragment TraderData on Trader {
    id
    name
    currency
    resetTime
    imageLink
    avatarLink
    reputationLevels {
      level
      requiredReputation
      requiredPlayerLevel
      unlocked
    }
  }
`;

export const barterFragment = /* GraphQL */ `
  fragment BarterData on Barter {
    id
    trader {
      id
      name
    }
    level
    taskUnlock {
      id
      name
    }
    requireItems {
      item {
        ...ItemData
      }
      count
    }
    rewardItems {
      item {
        ...ItemData
      }
      count
    }
    source
    usedInItems {
      ...ItemData
    }
  }
`;
