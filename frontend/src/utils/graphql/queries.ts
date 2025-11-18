// Import all fragments from domain-specific modules
import {
  itemDataFragment,
  categoryDataFragment,
  itemPropertiesFragment,
  itemWithPropertiesFragment,
  ammunitionFragment,
  ammoPackFragment,
  armorFragment,
  medicalFragment,
  provisionsFragment,
  gearFragment,
  primaryWeaponsFragment,
  weaponModsFragment,
} from './items.js';

// Task-related fragments removed - now using Firestore for task data
// See: /frontend/src/composables/data/useTaskData.ts

import { hideoutModuleFragment, craftFragment } from './hideout.js';

import { traderFragment, barterFragment } from './traders.js';

import { mapFragment } from './maps.js';

import { presetFragment } from './presets.js';

// Main Tarkov data query composed of all fragments
export const tarkovDataQuery = /* GraphQL */ `
  # Item fragments
  ${itemDataFragment}
  ${categoryDataFragment}
  ${itemPropertiesFragment}
  ${itemWithPropertiesFragment}
  ${ammunitionFragment}
  ${ammoPackFragment}
  ${armorFragment}
  ${medicalFragment}
  ${provisionsFragment}
  ${gearFragment}
  ${primaryWeaponsFragment}
  ${weaponModsFragment}

  # Task fragments removed - now using Firestore for task data
  # See: /frontend/src/composables/data/useTaskData.ts

  # Hideout fragments
  ${hideoutModuleFragment}
  ${craftFragment}

  # Trader fragments
  ${traderFragment}
  ${barterFragment}

  # Map fragments
  ${mapFragment}

  # Preset fragments
  ${presetFragment}

  query TarkovData($lang: LanguageCode, $gameMode: GameMode) {
    # Tasks removed - now using Firestore for task data
    # See: /frontend/src/composables/data/useTaskData.ts
    hideoutModules(lang: $lang, gameMode: $gameMode) {
      ...HideoutModuleData
    }
    traders(lang: $lang, gameMode: $gameMode) {
      ...TraderData
    }
    maps(lang: $lang, gameMode: $gameMode) {
      ...MapData
    }
    items(lang: $lang, gameMode: $gameMode) {
      ...ItemWithProperties
    }
    hideoutItems: items(lang: $lang, gameMode: $gameMode, types: [hideoutItem]) {
      ...ItemData
    }
    crafts(lang: $lang, gameMode: $gameMode) {
      ...CraftData
    }
    barters(lang: $lang, gameMode: $gameMode) {
      ...BarterData
    }
    presets(lang: $lang, gameMode: $gameMode) {
      ...PresetData
    }
    ammunition(lang: $lang, gameMode: $gameMode) {
      ...AmmunitionData
    }
    ammoPacks(lang: $lang, gameMode: $gameMode) {
      ...AmmoPackData
    }
    armor(lang: $lang, gameMode: $gameMode) {
      ...ArmorData
    }
    medical(lang: $lang, gameMode: $gameMode) {
      ...MedicalData
    }
    primaryWeapons(lang: $lang, gameMode: $gameMode) {
      ...PrimaryWeaponsData
    }
    mapsItems: items(lang: $lang, gameMode: $gameMode, types: [map]) {
      ...ItemData
    }
    provisions(lang: $lang, gameMode: $gameMode) {
      ...ProvisionsData
    }
    gear(lang: $lang, gameMode: $gameMode) {
      ...GearData
    }
    throwables: items(lang: $lang, gameMode: $gameMode, types: [grenade, throwWeapon]) {
      ...ItemData
    }
    weaponMods(lang: $lang, gameMode: $gameMode) {
      ...WeaponModsData
    }
  }
`;
