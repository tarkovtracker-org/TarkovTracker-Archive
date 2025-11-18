import { itemDataFragment, categoryDataFragment } from './items.js';

export const mapPositionDataFragment = /* GraphQL */ `
  fragment MapPositionData on MapPosition {
    x
    y
    z
  }
`;

export const mapWithPositionsDataFragment = /* GraphQL */ `
  fragment MapWithPositionsData on MapWithPosition {
    map {
      id
    }
    positions {
      ...MapPositionData
    }
  }
`;

export const taskZoneDataFragment = /* GraphQL */ `
  fragment TaskZoneData on TaskZone {
    id
    map {
      id
    }
    position {
      ...MapPositionData
    }
    outline {
      ...MapPositionData
    }
    top
    bottom
  }
`;

export const taskObjectiveFragment = /* GraphQL */ `
  fragment TaskObjectiveData on TaskObjective {
    id
    description
    type {
      id
      name
      normalizedName
    }
    targetItem {
      ...ItemData
      category {
        ...CategoryData
      }
    }
    targetTrader {
      id
      name
    }
    targetLevel
    targetCount
    zones {
      ...TaskZoneData
    }
    maps {
      ...MapWithPositionsData
    }
    alternatives {
      ...TaskObjectiveData
    }
  }
`;

export const taskFragment = /* GraphQL */ `
  fragment TaskData on Task {
    id
    tarkovDataId
    name
    description
    trader {
      id
      name
    }
    location
    type {
      id
      name
      normalizedName
    }
    experience
    wikiLink
    minPlayerLevel
    objectives {
      ...TaskObjectiveData
    }
    taskRequirements {
      task {
        id
        name
      }
      status
    }
    factionName
    restartable
    objectivesImageLink
    neededKeys {
      ...ItemData
    }
    failConditions
    alternatives {
      id
    }
  }
`;
