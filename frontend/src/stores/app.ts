import { defineStore } from 'pinia';
import { useStorage } from '@vueuse/core';
const state = () => ({
  drawerRail: useStorage<boolean>('app_drawerRail', true),
  drawerShow: useStorage<boolean>('app_drawerShow', true),
  localeOverride: useStorage<string | null>('app_localeOverride', null),
});
export const useAppStore = defineStore('app', {
  state,
  getters: {
    isDrawerRailMode(): boolean {
      return this.drawerRail;
    },
    // Helper function to determine if drawer should be hidden (mobile only)
    isDrawerHidden(): boolean {
      // This should be used in combination with Vuetify's mobile breakpoint
      // In NavDrawer.vue, we use Vuetify's mobile detection to hide drawer on xs screens
      return false;
    },
  },
  actions: {
    setDrawerShow(show: boolean) {
      this.drawerShow = show;
    },
    toggleDrawerShow() {
      this.drawerShow = !this.drawerShow;
    },
    setDrawerRail(val: boolean) {
      this.drawerRail = val;
    },
    toggleDrawerRail() {
      this.drawerRail = !this.drawerRail;
    },
  },
});
