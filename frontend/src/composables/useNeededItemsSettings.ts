import { computed } from 'vue';
import { useUserStore } from '@/stores/user';

export function useNeededItemsSettings() {
  const userStore = useUserStore();

  // Display style
  const neededItemsStyle = computed({
    get: () => userStore.getNeededItemsStyle,
    set: (value) => userStore.setNeededItemsStyle(value),
  });

  // FIR filter settings
  const hideFIR = computed({
    get: () => userStore.itemsNeededHideNonFIR,
    set: (value) => userStore.setItemsNeededHideNonFIR(value),
  });

  const hideFIRLabel = computed(() =>
    userStore.itemsNeededHideNonFIR
      ? 'page.neededitems.options.items_hide_non_fir'
      : 'page.neededitems.options.items_show_non_fir'
  );

  const hideFIRColor = computed(() => (userStore.itemsNeededHideNonFIR ? 'error' : 'success'));

  // Team visibility settings
  const itemsHideAll = computed({
    get: () => userStore.itemsTeamAllHidden,
    set: (value) => userStore.setItemsTeamHideAll(value),
  });

  const itemsHideAllLabel = computed(() =>
    userStore.itemsTeamAllHidden
      ? 'page.team.card.teamoptions.items_hide_all'
      : 'page.team.card.teamoptions.items_show_all'
  );

  const itemsHideAllColor = computed(() => (userStore.itemsTeamAllHidden ? 'error' : 'success'));

  const itemsHideNonFIR = computed({
    get: () => userStore.itemsTeamNonFIRHidden,
    set: (value) => userStore.setItemsTeamHideNonFIR(value),
  });

  const itemsHideNonFIRLabel = computed(() =>
    userStore.itemsTeamNonFIRHidden
      ? 'page.team.card.teamoptions.items_hide_non_fir'
      : 'page.team.card.teamoptions.items_show_non_fir'
  );

  const itemsHideNonFIRColor = computed(() =>
    userStore.itemsTeamNonFIRHidden ? 'error' : 'success'
  );

  const itemsHideHideout = computed({
    get: () => userStore.itemsTeamHideoutHidden,
    set: (value) => userStore.setItemsTeamHideHideout(value),
  });

  const itemsHideHideoutLabel = computed(() =>
    userStore.itemsTeamHideoutHidden
      ? 'page.team.card.teamoptions.items_hide_hideout'
      : 'page.team.card.teamoptions.items_show_hideout'
  );

  const itemsHideHideoutColor = computed(() =>
    userStore.itemsTeamHideoutHidden ? 'error' : 'success'
  );

  return {
    // Display style
    neededItemsStyle,

    // FIR settings
    hideFIR,
    hideFIRLabel,
    hideFIRColor,

    // Team settings
    itemsHideAll,
    itemsHideAllLabel,
    itemsHideAllColor,
    itemsHideNonFIR,
    itemsHideNonFIRLabel,
    itemsHideNonFIRColor,
    itemsHideHideout,
    itemsHideHideoutLabel,
    itemsHideHideoutColor,
  };
}
