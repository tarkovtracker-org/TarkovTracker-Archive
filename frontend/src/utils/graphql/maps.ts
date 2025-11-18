import { itemDataFragment } from './items.js';

export const mapFragment = /* GraphQL */ `
  fragment MapData on Map {
    id
    name
    description
    normalizedName
    version
    wiki
    players
    raidDuration
    exitChanges
    insurance
    bosses
    scavRaids
    enemies
    keys {
      ...ItemData
    }
    stationaryWeapons
  }
`;
