<template>
  <v-list nav bg-color="transparent" class="mx-auto">
    <drawer-item
      :avatar-sources="logoSources('tarkovdevlogo')"
      locale-key="tarkovdev"
      href="https://tarkov.dev/"
      ext-link
      :is-collapsed="props.isCollapsed"
    />
    <drawer-item
      avatar="/img/logos/tarkovmonitorlogo.avif"
      locale-key="tarkovmonitor"
      href="https://github.com/the-hideout/TarkovMonitor"
      ext-link
      :is-collapsed="props.isCollapsed"
    />
    <drawer-item
      :avatar-sources="logoSources('ratscannerlogo')"
      locale-key="ratscanner"
      href="https://ratscanner.com/"
      ext-link
      :is-collapsed="props.isCollapsed"
    />
    <drawer-item
      avatar="/img/logos/tarkovchangeslogo.svg"
      locale-key="tarkovchanges"
      href="https://tarkov-changes.com/"
      ext-link
      :is-collapsed="props.isCollapsed"
    />
  </v-list>
</template>
<script setup lang="ts">
  import DrawerItem from '@/features/drawer/DrawerItem.vue';
  const logoSources = (name: string, fallbackExt = 'png') => ({
    fallback: `/img/logos/${name}.${fallbackExt}`,
    webp: `/img/logos/${name}.webp`,
    avif: `/img/logos/${name}.avif`,
  });
  const props = defineProps({
    isCollapsed: {
      type: Boolean,
      required: true,
    },
  });
</script>
<style lang="scss" scoped></style>
