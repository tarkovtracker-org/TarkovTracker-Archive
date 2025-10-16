<template>
  <v-footer
    class="px-0 d-flex"
    color="transparent"
    style="
      min-height: auto !important;
      height: auto !important;
      flex: 0 0 auto !important;
      margin-bottom: 0 !important;
      padding: 0 !important;
    "
  >
    <v-container class="text-center footer-background mx-0">
      <v-row justify="center" align="center" class="mb-2" style="font-size: 12px">
        <!-- Community Links -->
        <v-col cols="12" sm="4" class="footer-section">
          <div class="footer-links d-flex flex-column align-center">
            <div class="mb-1">
              <i18n-t keypath="footer.call_to_action.discord_phrase" scope="global">
                <template #discord>
                  <a href="https://discord.gg/zeAP4Ng" target="_blank" class="footer-link">
                    <div class="d-inline-flex align-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        class="footer-icon mr-1"
                      >
                        <path
                          d="M19.27 5.33C17.94 4.71 16.5 4.26 15 4a.09.09 0 0 0-.07.03
                          c-.18.33-.39.76-.53 1.09a16.09 16.09 0 0 0-4.8 0c-.14-.34-.35-.76-.54-1.09
                          c-.01-.02-.04-.03-.07-.03c-1.5.26-2.93.71-4.27 1.33c-.01 0-.02.01-.03.02
                          c-2.72 4.07-3.47 8.03-3.1 11.95
                          c0 .02.01.04.03.05c1.8 1.32 3.53 2.12 5.24 2.65c.03.01.06 0 .07-.02
                          c.4-.55.76-1.13 1.07-1.74c.02-.04 0-.08-.04-.09c-.57-.22-1.11-.48-1.64-.78
                          c-.04-.02-.04-.08-.01-.11c.11-.08.22-.17.33-.25c.02-.02.05-.02.07-.01
                          c3.44 1.57 7.15 1.57 10.55 0c.02-.01.05-.01.07.01c.11.09.22.17.33.26
                          c.04.03.04.09-.01.11c-.52.31-1.07.56-1.64.78c-.04.01-.05.06-.04.09
                          c.32.61.68 1.19 1.07 1.74c.03.01.06.02.09.01c1.72-.53 3.45-1.33 5.25-2.65
                          c.02-.01.03-.03.03-.05c.44-4.53-.73-8.46-3.1-11.95
                          c-.01-.01-.02-.02-.04-.02
                          zM8.52 14.91c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12
                          c1.06 0 1.9.96 1.89 2.12c0 1.17-.84 2.12-1.89 2.12zm6.97 0
                          c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12
                          c0 1.17-.83 2.12-1.89 2.12z"
                        />
                      </svg>
                      {{ t('footer.call_to_action.discord') }}
                    </div>
                  </a>
                </template>
              </i18n-t>
            </div>
            <div class="mb-1">
              <i18n-t keypath="footer.call_to_action.github_phrase" scope="global">
                <template #github>
                  <a
                    href="https://github.com/tarkovtracker-org/TarkovTracker"
                    target="_blank"
                    class="footer-link"
                  >
                    <v-icon class="footer-icon mr-1" size="14">mdi-github</v-icon>
                    {{ t('footer.call_to_action.github') }}
                  </a>
                </template>
              </i18n-t>
            </div>
          </div>
        </v-col>
        <!-- Support Development Section -->
        <v-col cols="12" sm="4" class="footer-section text-center">
          <div class="support-section">
            <a
              href="https://ko-fi.com/dysektai"
              target="_blank"
              class="kofi-link d-inline-flex align-center"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="currentColor"
                class="mr-1"
              >
                <path
                  d="
                    M23.881 8.948c-.773-4.085-4.859-4.593-4.859-4.593H.723c-.604
                    0-.679.798-.679.798s-.082 7.324-.033 11.414c.049
                    4.271 3.468 7.433 8.33 7.433s8.245-3.129
                    8.245-3.129c.508-.637.411-1.492.411-1.492s-.193-2.951-.193-2.951H23.881zm
                    -4.859 4.593H.723V8.948s4.859 0 4.859 0v4.593h4.859V8.948s4.859 0 4.859 0v4.593z
                  "
                />
              </svg>
              Support on Ko-fi
            </a>
            <div class="support-text">Help keep TarkovTracker free and updated</div>
          </div>
        </v-col>

        <!-- Legal Links Section -->
        <v-col cols="12" sm="4" class="footer-section">
          <div class="footer-links d-flex flex-column align-center">
            <div class="mb-1">
              <router-link to="/terms" class="footer-link">Terms</router-link>
            </div>
            <div class="mb-1">
              <router-link to="/privacy" class="footer-link">Privacy</router-link>
            </div>
            <div v-if="choiceRecorded" class="mb-1">
              <button type="button" class="footer-link footer-link__button" @click="openPrivacyPreferences">
                Privacy Preferences
              </button>
            </div>
          </div>
        </v-col>
      </v-row>
      <!-- Footer Bottom Section -->
      <v-container
        class="text-center"
        style="font-size: 11px; margin-bottom: 0 !important; padding-bottom: 0 !important"
      >
        <div class="copyright-notice mb-1">
          Game content and materials are trademarks and copyrights of Battlestate Games and its
          licensors. All rights reserved.
        </div>
        <div class="brand-copyright" style="margin-bottom: 0 !important">
          TarkovTracker &copy; 2020 - {{ new Date().getFullYear() }}
        </div>
      </v-container>
    </v-container>
  </v-footer>
</template>
<script setup>
  import { onMounted } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { usePrivacyConsent } from '@/composables/usePrivacyConsent';

  const { t } = useI18n({ useScope: 'global' });
  const { openPreferences, choiceRecorded, initializeConsent } = usePrivacyConsent();

  const openPrivacyPreferences = () => {
    openPreferences();
  };

  onMounted(() => {
    initializeConsent();
  });
</script>
<style lang="scss" scoped>
  .footer-background {
    background-color: rgba(0, 0, 0, 0.4);
    max-width: 100% !important;
    padding: 8px 16px;
    margin-bottom: 0 !important;
  }
  // Ensure the footer sits flush at bottom
  :deep(.v-footer) {
    margin-bottom: 0 !important;
    padding-bottom: 0 !important;
  }
  :deep(.v-container) {
    margin-bottom: 0 !important;
    padding-bottom: 0 !important;
  }
  // Force footer to bottom with no gaps
  :deep(.v-footer__extension) {
    margin-bottom: 0 !important;
    padding-bottom: 0 !important;
  }
  :deep(.v-row) {
    margin-bottom: 0 !important;
  }
  :deep(.v-col) {
    padding-bottom: 0 !important;
    margin-bottom: 0 !important;
  }
  .footer-section {
    margin-bottom: 8px;
  }
  .footer-links {
    gap: 4px;
  }
  .footer-link {
    color: rgba(255, 255, 255, 0.7);
    text-decoration: none;
    font-size: 12px;
    transition: all 0.2s ease;
    display: inline-flex;
    align-items: center;
    &:hover {
      color: rgba(var(--v-theme-primary), 1);
      text-decoration: none;
    }
    &:link,
    &:active,
    &:visited {
      color: rgba(255, 255, 255, 0.7);
    }
    &:hover {
      color: rgba(var(--v-theme-primary), 1);
    }
  }
  .footer-link__button {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    font: inherit;
  }
  .footer-icon {
    color: currentColor;
    opacity: 0.8;
  }
  .kofi-link {
    background: linear-gradient(135deg, #ff5f5f 0%, #ff9500 100%);
    color: white !important;
    padding: 4px 12px;
    border-radius: 16px;
    font-size: 11px;
    font-weight: 500;
    text-decoration: none;
    transition: all 0.2s ease;
    box-shadow: 0 1px 4px rgba(255, 95, 95, 0.3);
    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(255, 95, 95, 0.4);
      color: white !important;
    }
  }
  .support-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }
  .support-text {
    font-size: 9px;
    color: rgba(255, 255, 255, 0.5);
    font-style: italic;
    line-height: 1.2;
  }
  .copyright-notice {
    line-height: 1.3;
    margin-bottom: 4px;
    color: rgba(255, 255, 255, 0.6);
  }
  .brand-copyright {
    font-weight: 500;
    color: rgba(255, 255, 255, 0.7);
  }
  // Icon specific styling
  :deep(.mdi-github) {
    color: #ffffff !important;
  }
  // Mobile responsive adjustments
  @media (max-width: 600px) {
    .footer-section {
      margin-bottom: 12px;
    }
    .kofi-link {
      margin-bottom: 4px;
    }
  }
</style>
