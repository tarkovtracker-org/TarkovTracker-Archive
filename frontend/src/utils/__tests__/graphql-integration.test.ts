import { describe, it, expect } from 'vitest';
import { tarkovDataQuery, itemDataFragment, taskFragment } from '../graphql/index.js';

describe('GraphQL Integration Tests', () => {
  it('should be able to import main query and fragments', () => {
    expect(tarkovDataQuery).toBeDefined();
    expect(itemDataFragment).toBeDefined();
    expect(taskFragment).toBeDefined();
  });

  it('should preserve query structure after refactoring', () => {
    // Check that main query has the expected structure
    expect(tarkovDataQuery).toContain('query TarkovData($lang: LanguageCode, $gameMode: GameMode)');
    // Tasks are now handled by Firestore, not GraphQL
    // expect(tarkovDataQuery).toContain('tasks(lang: $lang, gameMode: $gameMode)');
    expect(tarkovDataQuery).toContain('items(lang: $lang, gameMode: $gameMode)');
    expect(tarkovDataQuery).toContain('hideoutModules(lang: $lang, gameMode: $gameMode)');
    expect(tarkovDataQuery).toContain('traders(lang: $lang, gameMode: $gameMode)');
  });

  it('should include all fragment definitions', () => {
    expect(tarkovDataQuery).toContain('fragment ItemData on Item');
    // Task fragments are now handled by Firestore
    // expect(tarkovDataQuery).toContain('fragment TaskData on Task');
    expect(tarkovDataQuery).toContain('fragment HideoutModuleData on HideoutModule');
    expect(tarkovDataQuery).toContain('fragment TraderData on Trader');
    expect(tarkovDataQuery).toContain('fragment MapData on Map');
  });

  it('should use fragment spreading correctly', () => {
    // Task fragments are now handled by Firestore
    // expect(tarkovDataQuery).toContain('...TaskData');
    expect(tarkovDataQuery).toContain('...ItemData');
    expect(tarkovDataQuery).toContain('...HideoutModuleData');
  });

  it('should have properly structured fragments', () => {
    // Test that fragments are well-formed
    expect(itemDataFragment).toMatch(/fragment\s+ItemData\s+on\s+Item/);
    expect(taskFragment).toMatch(/fragment\s+TaskData\s+on\s+Task/);

    // Test that fragments contain expected fields
    expect(itemDataFragment).toContain('id');
    expect(itemDataFragment).toContain('name');
    expect(taskFragment).toContain('objectives');
    expect(taskFragment).toContain('...TaskObjectiveData');
  });
});
