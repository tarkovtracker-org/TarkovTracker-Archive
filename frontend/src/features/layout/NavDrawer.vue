<template>
  <v-navigation-drawer
    v-model="appStore.drawerShow"
    theme="dark"
    image="/img/background/sidebar-background.webp"
    :rail="isRailActive"
    :width="isRailActive ? 56 : 300"
    class="compact-nav-drawer"
  >
    <tracker-logo :is-collapsed="isRailActive" />
    <v-divider class="mx-3 my-1" />
    <drawer-account :is-collapsed="isRailActive" />
    <v-divider class="mx-3 my-1" />
    <drawer-level :is-collapsed="isRailActive" />
    <v-divider class="mx-3 my-1" />
    <drawer-trader-standings :is-collapsed="isRailActive" />
    <v-divider class="mx-3 my-1" />
    <drawer-links :is-collapsed="isRailActive" />
    <v-divider class="mx-3 my-1" />
    <drawer-external-links :is-collapsed="isRailActive" />
  </v-navigation-drawer>
</template>
<script setup lang="ts">
  import { computed } from 'vue';
  import { useAppStore } from '@/stores/app';
  import { useDisplay } from 'vuetify';
  import TrackerLogo from '@/features/drawer/TrackerLogo.vue';
  import DrawerLinks from '@/features/drawer/DrawerLinks.vue';
  import DrawerAccount from '@/features/drawer/DrawerAccount.vue';
  import DrawerLevel from '@/features/drawer/DrawerLevel.vue';
  import DrawerTraderStandings from '@/features/drawer/DrawerTraderStandings.vue';
  import DrawerExternalLinks from '@/features/drawer/DrawerExternalLinks.vue';
  const { mdAndDown } = useDisplay();
  const appStore = useAppStore();

  // Calculate the effective rail state
  const isRailActive = computed(() => !mdAndDown.value && appStore.drawerRail);
</script>
<style lang="scss" scoped>
  :deep(.v-list-group__items .v-list-item) {
    padding-inline-start: 0 !important;
    padding-left: 8px !important;
  }
  .compact-nav-drawer {
    /* Remove width: auto, use fixed width for proper collapse */
    box-sizing: border-box !important;
  }
</style>
