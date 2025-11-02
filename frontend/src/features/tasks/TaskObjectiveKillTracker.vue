<template>
  <div class="kill-tracker" @click.stop>
    <span class="kill-tracker__label">Kills</span>
    <button
      type="button"
      class="kill-tracker__control kill-tracker__control--adjust"
      :disabled="count === 0"
      aria-label="Decrease objective progress"
      @click.stop="$emit('decrement')"
    >
      <span class="kill-tracker__control-symbol">−</span>
    </button>
    <div
      class="kill-tracker__counter"
      :class="{ 'kill-tracker__counter--complete': count >= requiredCount }"
    >
      <span class="kill-tracker__count">{{ count }}</span>
      <span class="kill-tracker__separator">/</span>
      <span class="kill-tracker__required">{{ requiredCount }}</span>
    </div>
    <button
      type="button"
      class="kill-tracker__control kill-tracker__control--adjust"
      :disabled="count >= requiredCount"
      aria-label="Increase objective progress"
      @click.stop="$emit('increment')"
    >
      <span class="kill-tracker__control-symbol">+</span>
    </button>
    <button
      type="button"
      class="kill-tracker__control kill-tracker__control--reset"
      :disabled="count === 0"
      aria-label="Reset objective progress"
      @click.stop="$emit('reset')"
    >
      <v-icon size="x-small">mdi-refresh</v-icon>
    </button>
  </div>
</template>

<script setup lang="ts">
  defineProps<{
    count: number;
    requiredCount: number;
  }>();

  defineEmits<{
    increment: [];
    decrement: [];
    reset: [];
  }>();
</script>

<style scoped lang="scss">
  .kill-tracker {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    border-radius: 999px;
    border: 1px solid rgba(var(--v-theme-warning), 0.6);
    background: linear-gradient(
      145deg,
      rgba(var(--v-theme-surface), 0.92),
      rgba(var(--v-theme-warning), 0.25)
    );
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.45);
  }

  .kill-tracker__label {
    text-transform: uppercase;
    font-weight: 700;
    letter-spacing: 0.12em;
    font-size: 0.65rem;
    padding: 4px 8px;
    border-radius: 999px;
    background: rgba(var(--v-theme-warning), 0.35);
    color: rgb(var(--v-theme-on-warning));
  }

  .kill-tracker__control {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 28px;
    width: 28px;
    border-radius: 50%;
    border: 1px solid rgba(var(--v-theme-warning), 0.55);
    background: radial-gradient(
      circle at 30% 30%,
      rgba(var(--v-theme-warning), 0.35),
      rgba(var(--v-theme-warning), 0.15)
    );
    color: rgb(var(--v-theme-on-surface));
    transition: all 0.15s ease;
    cursor: pointer;
    padding: 0;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
  }

  .kill-tracker__control--reset {
    border-color: rgba(var(--v-theme-error), 0.55);
    background: radial-gradient(
      circle at 30% 30%,
      rgba(var(--v-theme-error), 0.35),
      rgba(var(--v-theme-error), 0.15)
    );
    color: rgb(var(--v-theme-on-surface));
  }

  .kill-tracker__control:focus-visible {
    outline: 2px solid rgba(var(--v-theme-warning), 0.75);
    outline-offset: 2px;
  }

  .kill-tracker__control:hover:not(:disabled) {
    background: rgba(var(--v-theme-warning), 0.55);
    color: rgb(var(--v-theme-on-warning));
    transform: translateY(-1px);
  }

  .kill-tracker__control--reset:hover:not(:disabled) {
    background: rgba(var(--v-theme-error), 0.55);
    color: rgb(var(--v-theme-on-error));
  }

  .kill-tracker__control:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    transform: none;
    color: rgba(var(--v-theme-on-surface), 0.4);
  }

  .kill-tracker__control-symbol {
    font-size: 0.9rem;
    font-weight: 800;
    letter-spacing: 0.06em;
    color: inherit;
    transform: translateY(-1px);
  }

  .kill-tracker__counter {
    min-width: 60px;
    text-align: center;
    padding: 6px 12px;
    border-radius: 999px;
    font-weight: 700;
    letter-spacing: 0.08em;
    background: rgba(var(--v-theme-warning), 0.35);
    color: rgb(var(--v-theme-on-warning));
    transition:
      background 0.15s ease,
      color 0.15s ease;
  }

  .kill-tracker__counter--complete {
    background: rgba(var(--v-theme-success), 0.35);
    color: rgb(var(--v-theme-on-success));
  }

  .kill-tracker__separator {
    margin: 0 4px;
    opacity: 0.6;
  }

  .kill-tracker__count,
  .kill-tracker__required {
    font-variant-numeric: tabular-nums;
  }
</style>
