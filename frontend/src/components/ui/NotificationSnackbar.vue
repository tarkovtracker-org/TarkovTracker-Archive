<template>
  <v-snackbar
    :model-value="modelValue.show"
    :timeout="4000"
    :color="modelValue.color"
    @update:model-value="updateShow"
  >
    {{ modelValue.message }}
    <template #actions>
      <v-btn color="white" variant="text" @click="updateShow(false)"> Close </v-btn>
    </template>
  </v-snackbar>
</template>

<script setup>
  const props = defineProps({
    modelValue: {
      type: Object,
      default: () => ({ show: false, message: '', color: 'accent' }),
    },
  });

  const emit = defineEmits(['update:modelValue']);

  const updateShow = (show) => {
    emit('update:modelValue', { ...props.modelValue, show });
  };
</script>
