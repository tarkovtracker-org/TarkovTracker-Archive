<template>
  <div :class="containerClasses">
    <v-img v-if="isVisible" :src="imageItem?.iconLink ?? ''" :class="imageClasses" lazy>
      <template #placeholder>
        <v-row class="fill-height ma-0" align="center" justify="center">
          <v-progress-circular indeterminate color="grey-lighten-5" />
        </v-row>
      </template>
    </v-img>
    <div v-else :class="[imageClasses, 'image-placeholder']">
      <v-row class="fill-height ma-0" align="center" justify="center">
        <v-progress-circular indeterminate color="grey-lighten-5" />
      </v-row>
    </div>
  </div>
</template>
<script setup lang="ts">
  import { computed, type PropType } from 'vue';
  interface ImageItem {
    iconLink?: string;
    backgroundColor: string;
  }
  const props = defineProps({
    imageItem: {
      type: Object as PropType<ImageItem>,
      required: true,
    },
    isVisible: {
      type: Boolean,
      default: false,
    },
    size: {
      type: String as PropType<'small' | 'medium' | 'large'>,
      default: 'medium',
    },
  });
  const containerClasses = computed(() => 'd-block');
  const imageClasses = computed(() => ({
    [`item-bg-${props.imageItem.backgroundColor}`]: true,
    rounded: true,
    'pa-1': true,
    'item-row-image': props.size === 'small',
    'item-dialog-image': props.size === 'large',
  }));
</script>
