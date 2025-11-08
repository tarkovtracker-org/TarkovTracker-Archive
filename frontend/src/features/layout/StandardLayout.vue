<template>
  <!-- Navigation Drawer -->
  <nav-drawer />

  <!-- Application Bar-->
  <app-bar />

  <!-- Main View -->
  <v-main
    style="
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      padding-bottom: 0 !important;
      margin-bottom: 0 !important;
      transition: none !important;
    "
  >
    <!-- <div id="tracker-page-background"> -->
    <div
      id="tracker-page-background"
      style="flex: 1 1 auto; display: flex; flex-direction: column; position: relative"
    >
      <!-- LCP-optimized background image -->
      <img
        v-if="routeBackgroundKey"
        :src="`/img/background/${routeBackgroundKey}.webp`"
        :alt="`${routeBackgroundKey} background`"
        fetchpriority="high"
        class="tracker-page-background-img"
      />
      <div
        id="tracker-page-background-blur"
        class="d-flex flex-column justify-space-between"
        style="
          flex: 1 1 auto;
          min-height: 100%;
          margin-bottom: 0 !important;
          padding-bottom: 0 !important;
        "
      >
        <div class="flex-grow-1" style="padding: 8px 8px 0">
          <router-view />
        </div>
        <app-footer style="margin-top: auto; flex-shrink: 0; margin-bottom: 0 !important" />
      </div>
    </div>
    <!-- </div> -->
    <v-fab-transition>
      <v-btn
        v-if="showBackToTop"
        class="standard-layout__back-to-top"
        color="secondary"
        variant="elevated"
        size="large"
        elevation="8"
        icon
        aria-label="Back to top"
        @click="scrollToTop"
      >
        <v-icon>mdi-arrow-up</v-icon>
      </v-btn>
    </v-fab-transition>
    <consent-banner />
  </v-main>
</template>
<script setup lang="ts">
  import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, ref } from 'vue';
  import { useRoute } from 'vue-router';
  import NavDrawer from '@/features/layout/NavDrawer.vue';
  import AppBar from '@/features/layout/AppBar.vue';
  import AppFooter from '@/features/layout/AppFooter.vue';
  const route = useRoute();
  const routeBackgroundKey = computed(() =>
    typeof route.meta?.background === 'string' ? route.meta.background : undefined
  );
  const ConsentBanner = defineAsyncComponent(() => import('@/features/layout/ConsentBanner.vue'));
  const showBackToTop = ref(false);
  const backToTopThreshold = 400;
  const handleScroll = () => {
    if (typeof window === 'undefined') {
      return;
    }
    showBackToTop.value = window.scrollY > backToTopThreshold;
  };
  const scrollToTop = () => {
    if (typeof window === 'undefined') {
      return;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  onMounted(() => {
    if (typeof window === 'undefined') {
      return;
    }
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
  });
  onBeforeUnmount(() => {
    if (typeof window === 'undefined') {
      return;
    }
    window.removeEventListener('scroll', handleScroll);
  });
</script>
<style lang="scss" scoped>
  #tracker-page-background {
    height: 100%;
    margin-bottom: 0;
    padding-bottom: 0;
  }

  .tracker-page-background-img {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
    z-index: 0;
    /* Ensure image loads with high priority */
    content-visibility: auto;
  }
  #tracker-page-background-blur {
    background: rgba(255, 255, 255, 0.01); // Make sure this color has an opacity of less than 1
    backdrop-filter: blur(8px) brightness(30%);
    margin-bottom: 0;
    padding-bottom: 0;
    /* CLS optimization: Promote to own compositing layer to prevent layout shift from backdrop-filter */
    will-change: transform;
    transform: translateZ(0);
    /* Additional compositing hints to force GPU layer */
    isolation: isolate;
    /* Ensure the element has a stacking context above the background image */
    position: relative;
    z-index: 1;
  }
  .main-content {
    flex: 1;
  }

  // Global overrides to ensure no bottom spacing and prevent transitions
  :deep(.v-main) {
    padding-bottom: 0 !important;
    margin-bottom: 0 !important;
    /* CLS optimization: Prevent any Vuetify transitions */
    transition: none !important;
  }

  :deep(.v-main__wrap) {
    padding-bottom: 0 !important;
    margin-bottom: 0 !important;
  }

  .standard-layout__back-to-top {
    position: fixed;
    bottom: 32px;
    right: 32px;
    z-index: 300;
  }

  @media (max-width: 768px) {
    .standard-layout__back-to-top {
      bottom: 20px;
      right: 20px;
    }
  }
</style>
