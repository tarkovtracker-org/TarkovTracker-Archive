<template>
  <div class="migration-steps mb-4">
    <div class="step-item">
      <span class="step-number">1</span>
      <span class="step-text">
        Get API token from
        <a href="https://tarkovtracker.io/settings" target="_blank" class="info-link">
          tarkovtracker.io/settings
        </a>
        (API Tokens section)
      </span>
    </div>
    <div class="step-item">
      <span class="step-number">2</span>
      <span class="step-text">Paste token below to migrate your data</span>
    </div>
  </div>
</template>
<style scoped>
  .migration-steps {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .step-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
  }
  .step-number {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 24px;
    height: 24px;
    background-color: rgba(var(--v-theme-primary), 1);
    color: white;
    border-radius: 50%;
    font-size: 14px;
    font-weight: bold;
  }
  .step-text {
    padding-top: 2px;
    text-align: left;
  }
  .info-link {
    color: rgba(var(--v-theme-link), 1);
    text-decoration: none;
  }
  .info-link:hover {
    text-decoration: underline;
  }
</style>
