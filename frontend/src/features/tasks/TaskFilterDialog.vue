<template>
  <v-dialog
    v-model="dialogModel"
    class="task-settings-dialog"
    max-width="500"
    transition="task-settings-slide"
    :scrim="'rgba(0, 0, 0, 0.6)'"
  >
    <v-card class="task-settings-card">
      <div class="task-settings-card__header">
        <div class="task-settings-card__heading">
          <h3 class="task-settings-card__title">{{ $t('page.tasks.filters.title') }}</h3>
          <p class="task-settings-card__subtitle">
            {{ $t('page.tasks.filters.filter_section') }} ·
            {{ $t('page.tasks.filters.appearance_section') }}
          </p>
        </div>
        <v-btn
          icon="mdi-close"
          variant="tonal"
          color="secondary"
          density="comfortable"
          class="task-settings-card__close"
          @click="dialogModel = false"
        />
      </div>
      <v-divider class="task-settings-card__divider" />
      <div class="task-settings-card__content">
        <section class="task-settings-card__section">
          <header class="task-settings-card__section-header">
            <span>{{ $t('page.tasks.filters.filter_section') }}</span>
          </header>
          <div class="task-settings-card__controls">
            <div
              v-for="control in filterControls"
              :key="control.key"
              class="task-settings-card__control"
            >
              <v-switch
                :model-value="control.model.value"
                inset
                true-icon="mdi-eye"
                false-icon="mdi-eye-off"
                hide-details
                density="comfortable"
                :color="switchColor(control.model)"
                :base-color="switchBaseColor(control.model)"
                @update:model-value="(value) => (control.model.value = Boolean(value))"
              >
                <template #label>
                  <span class="task-filter-switch__label">
                    {{ $t(control.labelKey) }}
                    <v-tooltip v-if="control.tooltipKey" location="top">
                      <template #activator="{ props: activatorProps }">
                        <v-icon v-bind="activatorProps" size="small" class="ml-1">
                          mdi-help-circle-outline
                        </v-icon>
                      </template>
                      {{ $t(control.tooltipKey) }}
                    </v-tooltip>
                  </span>
                </template>
              </v-switch>
            </div>
          </div>
        </section>
        <v-divider class="task-settings-card__divider task-settings-card__divider--subtle" />
        <section class="task-settings-card__section">
          <header class="task-settings-card__section-header">
            <span>{{ $t('page.tasks.filters.appearance_section') }}</span>
          </header>
          <div class="task-settings-card__controls">
            <div
              v-for="control in appearanceControls"
              :key="control.key"
              class="task-settings-card__control"
            >
              <v-switch
                :model-value="control.model.value"
                inset
                true-icon="mdi-eye"
                false-icon="mdi-eye-off"
                hide-details
                density="comfortable"
                :color="switchColor(control.model)"
                :base-color="switchBaseColor(control.model)"
                @update:model-value="(value) => (control.model.value = Boolean(value))"
              >
                <template #label>
                  <span class="task-filter-switch__label">
                    {{ $t(control.labelKey) }}
                    <v-tooltip v-if="control.tooltipKey" location="top">
                      <template #activator="{ props: activatorProps }">
                        <v-icon v-bind="activatorProps" size="small" class="ml-1">
                          mdi-help-circle-outline
                        </v-icon>
                      </template>
                      {{ $t(control.tooltipKey) }}
                    </v-tooltip>
                  </span>
                </template>
              </v-switch>
            </div>
          </div>
        </section>
      </div>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
  import { computed, unref } from 'vue';
  import type { WritableComputedRef } from 'vue';

  interface ToggleControl {
    key: string;
    model: WritableComputedRef<boolean>;
    labelKey: string;
    tooltipKey?: string;
  }

  interface Props {
    modelValue: boolean;
    filterControls?: ToggleControl[];
    appearanceControls?: ToggleControl[];
  }

  const props = withDefaults(defineProps<Props>(), {
    filterControls: () => [],
    appearanceControls: () => [],
  });

  const emit = defineEmits<{
    (event: 'update:modelValue', value: boolean): void;
  }>();

  const dialogModel = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value),
  });

  const resolveToggleValue = (value: unknown) => Boolean(unref(value));
  const switchColor = (toggle: WritableComputedRef<boolean>) =>
    resolveToggleValue(toggle) ? 'success' : 'secondary';
  const switchBaseColor = (toggle: WritableComputedRef<boolean>) =>
    resolveToggleValue(toggle) ? 'success' : 'grey-darken-2';

  const filterControls = computed(() => props.filterControls);
  const appearanceControls = computed(() => props.appearanceControls);
</script>

<style scoped lang="scss">
  .task-settings-dialog :deep(.v-overlay__scrim) {
    backdrop-filter: blur(6px);
  }

  .task-settings-dialog :deep(.v-overlay__content) {
    border-radius: 20px;
  }

  .task-settings-card {
    border-radius: 18px;
    background-color: rgba(var(--v-theme-surface), 1);
    box-shadow: 0 20px 60px rgba(15, 23, 42, 0.35);
    overflow: hidden;
  }

  .task-settings-card__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 24px 28px;
  }

  .task-settings-card__heading {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .task-settings-card__title {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 700;
    letter-spacing: -0.01em;
    color: rgba(var(--v-theme-on-surface), 0.94);
  }

  .task-settings-card__subtitle {
    margin: 0;
    font-size: 0.875rem;
    color: rgba(var(--v-theme-on-surface), 0.6);
  }

  .task-settings-card__close {
    box-shadow: inset 0 0 0 1px rgba(var(--v-theme-secondary), 0.24);
  }

  .task-settings-card__close:hover {
    box-shadow: inset 0 0 0 1px rgba(var(--v-theme-secondary), 0.4);
  }

  .task-settings-card__content {
    padding: 8px 28px 28px;
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .task-settings-card__section {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .task-settings-card__section-header {
    font-weight: 600;
    letter-spacing: 0.01em;
    text-transform: uppercase;
    font-size: 0.75rem;
    color: rgba(var(--v-theme-on-surface), 0.6);
  }

  .task-settings-card__controls {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 12px;
  }

  .task-settings-card__control {
    padding: 12px 14px;
    border-radius: 12px;
    background-color: rgba(var(--v-theme-surface-variant), 0.6);
    transition: background-color 120ms ease, transform 120ms ease, box-shadow 120ms ease;
  }

  .task-settings-card__control:hover {
    background-color: rgba(var(--v-theme-surface-variant), 0.8);
    transform: translateY(-1px);
    box-shadow: 0 12px 24px rgba(15, 23, 42, 0.16);
  }

  .task-settings-card__control:focus-within {
    outline: 2px solid rgba(var(--v-theme-secondary), 0.35);
    outline-offset: 2px;
  }

  .task-settings-card__divider {
    margin: 0 28px;
  }

  .task-settings-card__divider--subtle {
    opacity: 0.4;
  }

  .task-filter-switch__label {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-weight: 600;
  }

  @media (max-width: 960px) {
    .task-settings-card {
      border-radius: 16px;
    }

    .task-settings-card__content {
      padding: 12px 20px 24px;
    }

    .task-settings-card__controls {
      grid-template-columns: 1fr;
    }
  }
</style>

<style lang="scss">
  .task-settings-slide-enter-active,
  .task-settings-slide-leave-active {
    transition: opacity 160ms ease, transform 160ms ease;
  }

  .task-settings-slide-enter-active :deep(.v-overlay__content),
  .task-settings-slide-leave-active :deep(.v-overlay__content) {
    transition: opacity 160ms ease, transform 160ms ease;
  }

  .task-settings-slide-enter-from,
  .task-settings-slide-leave-to {
    opacity: 0;
  }

  .task-settings-slide-enter-from :deep(.v-overlay__content),
  .task-settings-slide-leave-to :deep(.v-overlay__content) {
    opacity: 0;
    transform: translateY(12px);
  }
</style>
