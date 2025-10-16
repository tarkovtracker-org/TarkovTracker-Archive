<template>
  <transition name="consent-fade">
    <div v-if="bannerVisible" class="consent-banner" role="dialog" aria-modal="true">
      <v-card class="consent-banner__card" elevation="12" variant="flat">
        <v-card-text class="consent-banner__content">
          <div class="consent-banner__text">
            <h2 class="consent-banner__title">We value your privacy</h2>
            <p class="consent-banner__body">
              TarkovTracker uses analytics tools like Firebase Analytics and Microsoft Clarity to understand
              feature usage and improve the service. You can learn more in our
              <router-link to="/privacy" class="consent-banner__link">Privacy Policy</router-link>.
              Choose whether to enable analytics tracking below. You can change your choice at any time from
              the footer.
            </p>
          </div>
          <div class="consent-banner__actions">
            <v-btn color="secondary" variant="flat" class="consent-banner__primary" @click="handleAccept">
              Accept
            </v-btn>
            <v-btn variant="outlined" color="secondary" class="consent-banner__secondary" @click="handleReject">
              Decline
            </v-btn>
          </div>
        </v-card-text>
      </v-card>
    </div>
  </transition>
</template>
<script setup>
  import { onMounted } from 'vue';
  import { usePrivacyConsent } from '@/composables/usePrivacyConsent';

  const {
    bannerVisible,
    accept,
    reject,
    initializeConsent,
  } = usePrivacyConsent();

  const handleAccept = () => {
    accept();
  };

  const handleReject = () => {
    reject();
  };

  onMounted(() => {
    initializeConsent();
  });
</script>
<style scoped>
  .consent-banner {
    position: fixed;
    inset: auto 0 0 0;
    display: flex;
    justify-content: center;
    padding: 16px;
    z-index: 1000;
    pointer-events: none;
  }

  .consent-banner__card {
    max-width: 820px;
    width: 100%;
    pointer-events: auto;
    background: rgba(11, 15, 19, 0.96);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 8px;
    color: rgba(255, 255, 255, 0.92);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45);
    backdrop-filter: blur(14px);
  }

  .consent-banner__content {
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: 24px 28px;
  }

  .consent-banner__title {
    font-size: 1.05rem;
    letter-spacing: 0.02em;
    margin-bottom: 8px;
    color: rgba(255, 255, 255, 0.95);
  }

  .consent-banner__body {
    margin: 0;
    color: rgba(255, 255, 255, 0.88);
    line-height: 1.5;
  }

  .consent-banner__link {
    color: rgba(var(--v-theme-secondary));
    font-weight: 500;
    text-decoration: underline;
  }

  .consent-banner__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    justify-content: flex-end;
  }

  .consent-banner__primary {
    min-width: 120px;
    color: rgba(0, 0, 0, 0.85);
    font-weight: 600;
    box-shadow: 0 0 12px rgba(var(--v-theme-secondary), 0.35);
  }

  .consent-banner__secondary {
    min-width: 120px;
    border-color: rgba(var(--v-theme-secondary), 0.6);
    color: rgba(255, 255, 255, 0.85);
  }

  @media (max-width: 959px) {
    .consent-banner__text {
      text-align: center;
    }

    .consent-banner__actions {
      justify-content: center;
    }
  }

  @media (min-width: 960px) {
    .consent-banner__content {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
    }

    .consent-banner__actions {
      flex-shrink: 0;
      margin-left: 24px;
    }
  }

  .consent-fade-enter-active,
  .consent-fade-leave-active {
    transition: opacity 0.2s ease, transform 0.2s ease;
  }

  .consent-fade-enter-from,
  .consent-fade-leave-to {
    opacity: 0;
    transform: translateY(16px);
  }
</style>
