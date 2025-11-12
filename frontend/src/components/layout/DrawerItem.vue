<template>
  <v-list-item
    :class="itemClass"
    :to="props.to"
    :active="props.to === $route.path"
    @click="visitHref()"
  >
    <template v-if="avatarSources">
      <v-avatar size="24">
        <OptimizedImage
          :src="avatarSources.fallback"
          :webp="avatarSources.webp"
          :avif="avatarSources.avif"
          width="24"
          height="24"
          :alt="props.localeKey || props.text || 'Drawer item avatar'"
        />
      </v-avatar>
    </template>
    <template v-else-if="props.avatar">
      <v-avatar size="24">
        <v-img :src="props.avatar" />
      </v-avatar>
    </template>
    <template v-else>
      <v-icon :icon="props.icon" />
    </template>
    <v-list-item-title
      v-if="!props.isCollapsed"
      :class="[titleClass, props.extLink ? 'drawer-external-link' : '']"
      style="display: inline-flex"
    >
      <template v-if="props.localeKey">
        {{ t(`navigation_drawer.${props.localeKey}`) }}
      </template>
      <template v-else-if="props.text">
        {{ props.text }}
      </template>
    </v-list-item-title>
  </v-list-item>
</template>
<script setup lang="ts">
  import { computed } from 'vue';
  import { useI18n } from 'vue-i18n';
  import OptimizedImage from '@/components/ui/OptimizedImage.vue';
  import type { CollapsibleComponentProps, ImageSources } from './types';
  const { t } = useI18n({ useScope: 'global' });
  interface DrawerItemProps extends CollapsibleComponentProps {
    icon?: string;
    avatar?: string | null;
    avatarSources?: ImageSources | null;
    localeKey?: string | null;
    text?: string | null;
    to?: string;
    href?: string | null;
    extLink?: boolean;
  }
  const props = withDefaults(defineProps<DrawerItemProps>(), {
    icon: 'mdi-menu-right',
    avatar: null,
    avatarSources: null,
    localeKey: null,
    text: null,
    to: undefined,
    href: null,
    extLink: false,
  });
  const visitHref = () => {
    if (props.href !== null) {
      window.open(props.href, '_blank');
    }
  };
  const itemClass = computed(() => ({
    'align-center': props.isCollapsed,
    'justify-center': props.isCollapsed,
    'drawer-item-collapsed': props.isCollapsed,
  }));
  const titleClass = computed(() => ({
    'v-drawer-item-full': !props.isCollapsed,
    'v-drawer-item-rail': props.isCollapsed,
  }));
  const avatarSources = computed(() => props.avatarSources);
</script>
<style lang="scss" scoped>
  // Set up styles for rail and standard item
  .v-drawer-item-full {
    margin-inline-start: 32px;
  }
  .drawer-external-link {
    font-size: 0.97rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-inline-start: 8px !important;
  }
  .v-drawer-item-rail {
    width: 26px;
  }
  .drawer-item-collapsed {
    display: flex;
    justify-content: center;
    align-items: center;
  }
</style>
