<template>
  <v-list-item id="app-logo-item" class="flex flex-column mt-1" :ripple="false" to="/">
    <div
      :class="['logo-wrapper', isCollapsed ? 'v-logo-rail' : 'v-logo-full compact-logo']"
      style="margin: 8px auto"
    >
      <OptimizedImage
        :src="logo"
        :width="logoSize"
        :height="logoSize"
        loading="eager"
        decoding="sync"
        fetchpriority="high"
        alt="Tarkov Tracker logo"
        picture-class="logo-image"
      />
    </div>
    <div v-if="!isCollapsed">
      <div class="text-subtitle1 text-center mt-1 font-weight-medium compact-site-name">
        {{ t('site_name') }}
      </div>
    </div>
  </v-list-item>
</template>
<script setup>
  import { computed } from 'vue';
  import { useI18n } from 'vue-i18n';
  import OptimizedImage from '@/features/ui/OptimizedImage.vue';
  const { t } = useI18n({ useScope: 'global' });
  const props = defineProps({
    isCollapsed: {
      type: Boolean,
      required: true,
    },
  });
  const logo = computed(() => {
    return props.isCollapsed
      ? '/img/logos/tarkovtrackerlogo-mini.png'
      : '/img/logos/tarkovtrackerlogo-light.png';
  });
  const logoSize = computed(() => (props.isCollapsed ? 56 : 140));
</script>
<style lang="scss" scoped>
  // Set up styles for rail and standard logo
  // We set global for this because we need to inject into multiple layers of components
  :global(#app-logo-item > .v-list-item__overlay) {
    opacity: 0 !important;
  }
  // We set deep for this so that it is carried down into child componets (vuetify components)
  .logo-wrapper {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    max-width: 140px;
    aspect-ratio: 1 / 1;
  }
  .logo-image img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
  .v-logo-full {
    width: 100%;
  }
  .compact-site-name {
    font-size: 1.1rem !important;
    line-height: 1.1;
  }

  // We set deep for this so that it is carried down into child componets (vuetify components)
  :deep(.v-logo-rail) {
    width: 56px;
  }
</style>
