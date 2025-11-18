import { itemDataFragment } from './items.js';

export const presetFragment = /* GraphQL */ `
  fragment PresetData on Preset {
    id
    item {
      ...ItemData
    }
    name
    baseItem {
      ...ItemData
    }
    encyclopedia
    parts {
      item {
        ...ItemData
      }
      quantity
    }
    slots {
      item {
        ...ItemData
      }
      name
      position {
        x
        y
        r
        width
        height
      }
      contains {
        item {
          ...ItemData
        }
        quantity
      }
    }
  }
`;
