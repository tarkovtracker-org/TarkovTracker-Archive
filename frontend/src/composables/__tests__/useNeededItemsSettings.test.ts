import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useNeededItemsSettings } from '../useNeededItemsSettings';

// Mock dependencies
vi.mock('@/stores/user', () => ({
  useUserStore: () => ({
    getNeededItemsStyle: 'mediumCard',
    setNeededItemsStyle: vi.fn(),
    itemsNeededHideNonFIR: false,
    setItemsNeededHideNonFIR: vi.fn(),
    itemsTeamAllHidden: false,
    setItemsTeamHideAll: vi.fn(),
    itemsTeamNonFIRHidden: false,
    setItemsTeamHideNonFIR: vi.fn(),
    itemsTeamHideoutHidden: false,
    setItemsTeamHideHideout: vi.fn(),
  }),
}));

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

describe('useNeededItemsSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should provide display style settings', () => {
    const { neededItemsStyle } = useNeededItemsSettings();

    expect(neededItemsStyle.value).toBe('mediumCard');
  });

  it('should provide FIR filter settings', () => {
    const { hideFIR, hideFIRLabel, hideFIRColor } = useNeededItemsSettings();

    expect(hideFIR.value).toBe(false);
    expect(hideFIRLabel.value).toBe('page.neededitems.options.items_show_non_fir');
    expect(hideFIRColor.value).toBe('success');
  });

  it('should provide team visibility settings', () => {
    const {
      itemsHideAll,
      itemsHideAllLabel,
      itemsHideAllColor,
      itemsHideNonFIR,
      itemsHideNonFIRLabel,
      itemsHideNonFIRColor,
      itemsHideHideout,
      itemsHideHideoutLabel,
      itemsHideHideoutColor,
    } = useNeededItemsSettings();

    expect(itemsHideAll.value).toBe(false);
    expect(itemsHideAllLabel.value).toBe('page.team.card.teamoptions.items_show_all');
    expect(itemsHideAllColor.value).toBe('success');

    expect(itemsHideNonFIR.value).toBe(false);
    expect(itemsHideNonFIRLabel.value).toBe('page.team.card.teamoptions.items_show_non_fir');
    expect(itemsHideNonFIRColor.value).toBe('success');

    expect(itemsHideHideout.value).toBe(false);
    expect(itemsHideHideoutLabel.value).toBe('page.team.card.teamoptions.items_show_hideout');
    expect(itemsHideHideoutColor.value).toBe('success');
  });
});
