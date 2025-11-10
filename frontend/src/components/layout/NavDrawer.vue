<template>
  <v-navigation-drawer
    v-model="appStore.drawerShow"
    theme="dark"
    :rail="isRailActive"
    :width="300"
    :permanent="!mobile"
    mobile-breakpoint="xs"
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
  import { computed, watch } from 'vue';
  import { useAppStore } from '@/stores/app';
  import { useDisplay } from 'vuetify';
  import TrackerLogo from '@/features/drawer/TrackerLogo.vue';
  import DrawerLinks from '@/features/drawer/DrawerLinks.vue';
  import DrawerAccount from '@/features/drawer/DrawerAccount.vue';
  import DrawerLevel from '@/features/drawer/DrawerLevel.vue';
  import DrawerTraderStandings from '@/features/drawer/DrawerTraderStandings.vue';
  import DrawerExternalLinks from '@/features/drawer/DrawerExternalLinks.vue';
  const { mobile, lgAndUp } = useDisplay();
  const appStore = useAppStore();

  // Calculate the effective rail state based on viewport size
  // Mobile (<600px): hidden drawer
  // Tablet (600px-1280px): rail mode (collapsed)
  // Desktop (>1280px): expanded mode
  const isRailActive = computed(() => {
    if (mobile.value) {
      return false; // Mobile: hidden drawer
    } else if (lgAndUp.value) {
      return false; // Desktop: expanded drawer
    } else {
      return true; // Tablet: collapsed rail
    }
  });

  // Ensure drawerShow is always true on tablet and desktop
  // On mobile, drawerShow controls visibility; on tablet+, rail/expanded controls width
  watch(
    [mobile, lgAndUp],
    ([isMobile, _isLg]) => {
      if (!isMobile) {
        // On tablet and desktop, drawer should always be visible (rail/expanded controls width)
        appStore.setDrawerShow(true);
      }
    },
    { immediate: true }
  );
</script>
<style lang="scss" scoped>
  .compact-nav-drawer {
    background-image: url('/img/background/sidebar-background.webp');
    background-size: cover;
    background-position: center;
  }

  /* Add left padding to nested list items */
  :deep(.v-list-group__items .v-list-item) {
    padding-left: 8px;
  }

  /* Center content in rail mode */
  :deep(.v-navigation-drawer--rail) {
    .v-list-item {
      justify-content: center;
    }

    .v-list-item__content {
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .v-list-item__prepend {
      margin-inline-end: 0;
    }
  }
</style>
