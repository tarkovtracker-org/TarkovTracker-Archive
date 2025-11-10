<template>
  <v-row>
    <v-col>
      <v-text-field
        :model-value="modelValue"
        :label="label"
        :maxlength="maxlength"
        :counter="counter"
        :readonly="readonly"
        variant="outlined"
        hide-details="auto"
        @update:model-value="$emit('update:modelValue', $event)"
      />
    </v-col>
    <v-col cols="auto">
      <v-btn variant="outlined" class="mx-1" style="height: 100%" @click="$emit('action')">
        <v-icon>{{ icon }}</v-icon>
      </v-btn>
    </v-col>
  </v-row>
</template>

<script setup>
  defineProps({
    modelValue: { type: String, default: '' },
    label: { type: String, required: true },
    icon: { type: String, required: true },
    maxlength: { type: Number, default: undefined },
    counter: { type: Boolean, default: false },
    readonly: { type: Boolean, default: false },
  });

  defineEmits(['update:modelValue', 'action']);
</script>
