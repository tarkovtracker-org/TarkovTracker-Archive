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
<script setup lang="ts">
  interface SnackbarValue {
    show: boolean;
    message: string;
    color: string;
  }

  interface Props {
    modelValue?: SnackbarValue;
  }

  const props = withDefaults(defineProps<Props>(), {
    modelValue: () => ({ show: false, message: '', color: 'accent' }),
  });

  const emit = defineEmits<{
    'update:modelValue': [value: SnackbarValue];
  }>();

  const updateShow = (show: boolean) => {
    emit('update:modelValue', { ...props.modelValue, show });
  };
</script>
