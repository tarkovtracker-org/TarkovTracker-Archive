import { describe, it, expect } from 'vitest';
import {
  // Items
  itemDataFragment,
  categoryDataFragment,
  itemPropertiesFragment,
  itemWithPropertiesFragment,
  ammunitionFragment,
  armorFragment,
  medicalFragment,

  // Tasks - Now using Firestore for task data instead of GraphQL
  // mapPositionDataFragment,
  // mapWithPositionsDataFragment,
  // taskZoneDataFragment,
  // taskObjectiveFragment,
  // taskFragment,

  // Hideout
  hideoutModuleFragment,
  craftFragment,

  // Traders
  traderFragment,
  barterFragment,

  // Maps
  mapFragment,

  // Presets
  presetFragment,

  // Main query
  tarkovDataQuery,
} from '../graphql/index.js';

describe('GraphQL Fragments', () => {
  describe('Item Fragments', () => {
    it('should export item data fragment with correct structure', () => {
      expect(itemDataFragment).toContain('fragment ItemData on Item');
      expect(itemDataFragment).toContain('id');
      expect(itemDataFragment).toContain('shortName');
      expect(itemDataFragment).toContain('name');
      expect(itemDataFragment).toContain('link');
      expect(itemDataFragment).toContain('wikiLink');
    });

    it('should export category data fragment with correct structure', () => {
      expect(categoryDataFragment).toContain('fragment CategoryData on ItemCategory');
      expect(categoryDataFragment).toContain('id');
      expect(categoryDataFragment).toContain('name');
      expect(categoryDataFragment).toContain('normalizedName');
    });

    it('should export item properties fragment with correct structure', () => {
      expect(itemPropertiesFragment).toContain('fragment ItemProperties on ItemProperties');
      expect(itemPropertiesFragment).toContain('width');
      expect(itemPropertiesFragment).toContain('height');
      expect(itemPropertiesFragment).toContain('weight');
      expect(itemPropertiesFragment).toContain('basePrice');
    });

    it('should export item with properties fragment', () => {
      expect(itemWithPropertiesFragment).toContain('fragment ItemWithProperties on Item');
      expect(itemWithPropertiesFragment).toContain('...ItemData');
      expect(itemWithPropertiesFragment).toContain('...CategoryData');
      expect(itemWithPropertiesFragment).toContain('...ItemProperties');
    });

    it('should export specialized item fragments', () => {
      expect(ammunitionFragment).toContain('fragment AmmunitionData on Ammunition');
      expect(ammunitionFragment).toContain('caliber');
      expect(ammunitionFragment).toContain('damage');

      expect(armorFragment).toContain('fragment ArmorData on Armor');
      expect(armorFragment).toContain('armorClass');

      expect(medicalFragment).toContain('fragment MedicalData on Medical');
      expect(medicalFragment).toContain('uses');
    });
  });

  describe('Task Fragments', () => {
    it('should note that task fragments are now handled by Firestore', () => {
      // Task fragments have been migrated to Firestore
      // See: /frontend/src/composables/data/useTaskData.ts
      expect(true).toBe(true); // Placeholder test to indicate intentional change
    });

    it('should note that task-related fragments are available but not imported', () => {
      // These fragments exist in tasks.ts but are not imported here
      // since task data is now handled by Firestore
      expect(true).toBe(true); // Placeholder indicating intentional exclusion
    });
  });

  describe('Hideout Fragments', () => {
    it('should export hideout module fragment', () => {
      expect(hideoutModuleFragment).toContain('fragment HideoutModuleData on HideoutModule');
      expect(hideoutModuleFragment).toContain('levels');
      expect(hideoutModuleFragment).toContain('itemRequirements');
      expect(hideoutModuleFragment).toContain('...ItemData');
    });

    it('should export craft fragment', () => {
      expect(craftFragment).toContain('fragment CraftData on Craft');
      expect(craftFragment).toContain('requirements');
      expect(craftFragment).toContain('rewardItems');
    });
  });

  describe('Trader Fragments', () => {
    it('should export trader fragment', () => {
      expect(traderFragment).toContain('fragment TraderData on Trader');
      expect(traderFragment).toContain('currency');
      expect(traderFragment).toContain('reputationLevels');
    });

    it('should export barter fragment', () => {
      expect(barterFragment).toContain('fragment BarterData on Barter');
      expect(barterFragment).toContain('requireItems');
      expect(barterFragment).toContain('rewardItems');
    });
  });

  describe('Map and Preset Fragments', () => {
    it('should export map fragment', () => {
      expect(mapFragment).toContain('fragment MapData on Map');
      expect(mapFragment).toContain('players');
      expect(mapFragment).toContain('raidDuration');
    });

    it('should export preset fragment', () => {
      expect(presetFragment).toContain('fragment PresetData on Preset');
      expect(presetFragment).toContain('parts');
      expect(presetFragment).toContain('slots');
    });
  });
});

describe('GraphQL Queries', () => {
  it('should export the main tarkov data query', () => {
    expect(tarkovDataQuery).toBeDefined();
    expect(tarkovDataQuery).toContain('query TarkovData($lang: LanguageCode, $gameMode: GameMode)');
  });

  it('should include all required fragment definitions in the main query', () => {
    expect(tarkovDataQuery).toContain('fragment ItemData on Item');
    // Task fragments are now handled by Firestore
    expect(tarkovDataQuery).toContain('fragment HideoutModuleData on HideoutModule');
    expect(tarkovDataQuery).toContain('fragment TraderData on Trader');
    expect(tarkovDataQuery).toContain('fragment MapData on Map');
    expect(tarkovDataQuery).toContain('fragment PresetData on Preset');
  });

  it('should include all query fields in the main query', () => {
    // Tasks are now handled by Firestore, not GraphQL
    // expect(tarkovDataQuery).toContain('tasks');
    expect(tarkovDataQuery).toContain('hideoutModules');
    expect(tarkovDataQuery).toContain('traders');
    expect(tarkovDataQuery).toContain('maps');
    expect(tarkovDataQuery).toContain('items');
    expect(tarkovDataQuery).toContain('crafts');
    expect(tarkovDataQuery).toContain('barters');
    expect(tarkovDataQuery).toContain('presets');
    expect(tarkovDataQuery).toContain('ammunition');
  });

  it('should use proper fragment spreading in query fields', () => {
    // Task fragments are now handled by Firestore
    // expect(tarkovDataQuery).toContain('...TaskData');
    expect(tarkovDataQuery).toContain('...HideoutModuleData');
    expect(tarkovDataQuery).toContain('...TraderData');
    expect(tarkovDataQuery).toContain('...MapData');
    expect(tarkovDataQuery).toContain('...ItemWithProperties');
  });

  it('should maintain query structure consistency', () => {
    // Check that the query starts with fragment definitions
    const fragmentStart = tarkovDataQuery.indexOf('fragment');
    const queryStart = tarkovDataQuery.indexOf('query TarkovData');
    expect(fragmentStart).toBeLessThan(queryStart);

    // Check that the query is properly closed
    expect(tarkovDataQuery.trim().endsWith('}')).toBe(true);
  });
});

describe('Fragment Composition', () => {
  it('should ensure fragments are properly nested and referenced', () => {
    // Task fragments are now handled by Firestore
    // expect(taskObjectiveFragment).toContain('...TaskZoneData');
    // expect(taskFragment).toContain('...TaskObjectiveData');

    // ItemWithProperties should reference basic fragments
    expect(itemWithPropertiesFragment).toContain('...ItemData');
    expect(itemWithPropertiesFragment).toContain('...CategoryData');
  });

  it('should ensure consistent fragment naming convention', () => {
    const fragments = [
      itemDataFragment,
      categoryDataFragment,
      // Task-related fragments are not imported anymore
      // mapPositionDataFragment,
      // taskZoneDataFragment,
      hideoutModuleFragment,
      traderFragment,
      mapFragment,
      presetFragment,
    ];

    fragments.forEach((fragment) => {
      expect(fragment).toMatch(/fragment \w+Data on \w+/);
    });
  });
});
