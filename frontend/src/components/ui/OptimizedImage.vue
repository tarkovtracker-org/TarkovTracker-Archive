<template>
  <picture class="optimized-image" :class="pictureClass">
    <source v-if="avifSrc" :srcset="avifSrc" type="image/avif" />
    <source v-if="webpSrc" :srcset="webpSrc" type="image/webp" />
    <img
      v-bind="imgAttrs"
      :src="fallbackSrc"
      :alt="alt"
      :loading="loading"
      :decoding="decoding"
      :fetchpriority="fetchpriority"
      :width="width"
      :height="height"
    />
  </picture>
</template>
<script setup lang="ts">
  import { computed, useAttrs } from 'vue';
  const EXTENSION_REGEX = /\.[a-z0-9]+$/i;
  const props = withDefaults(
    defineProps<{
      src: string;
      alt?: string;
      avif?: string | null;
      webp?: string | null;
      width?: number | string;
      height?: number | string;
      loading?: 'lazy' | 'eager';
      decoding?: 'sync' | 'async' | 'auto';
      fetchpriority?: 'high' | 'low' | 'auto';
      pictureClass?: string | Record<string, boolean> | Array<unknown>;
    }>(),
    {
      alt: '',
      avif: null,
      webp: null,
      width: undefined,
      height: undefined,
      loading: 'lazy',
      decoding: 'auto',
      fetchpriority: 'auto',
      pictureClass: undefined,
    }
  );
  const buildVariant = (override: string | null, targetExt: string) => {
    if (override) return override;
    if (!EXTENSION_REGEX.test(props.src)) return null;
    return props.src.replace(EXTENSION_REGEX, `.${targetExt}`);
  };
  const avifSrc = computed(() => buildVariant(props.avif, 'avif'));
  const webpSrc = computed(() => buildVariant(props.webp, 'webp'));
  const fallbackSrc = computed(() => props.src);
  const attrs = useAttrs();
  const imgAttrs = computed<Record<string, unknown>>(() => {
    const forward: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(attrs)) {
      if (key === 'class' || key === 'style' || key === 'id') {
        continue;
      }
      forward[key] = value;
    }
    return forward;
  });
</script>
<style scoped>
  .optimized-image {
    display: contents;
  }
  .optimized-image img {
    display: block;
  }
</style>
