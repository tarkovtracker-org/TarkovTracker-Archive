<template>
  <v-container
    class="h-100 pb-0 mb-0"
    style="
      min-height: calc(100vh - 210px);
      margin-bottom: 0 !important;
      padding-bottom: 0 !important;
    "
  >
    <!-- Hero Section -->
    <v-row justify="center" class="mb-8">
      <v-col cols="12" md="10" lg="8">
        <v-card
          class="pa-6 text-center"
          variant="flat"
          color="primary"
          style="
            background: linear-gradient(
              135deg,
              rgba(var(--v-theme-primary), 0.8) 0%,
              rgba(var(--v-theme-secondary), 0.6) 100%
            );
          "
          role="banner"
          aria-labelledby="api-hero-title"
        >
          <v-icon size="64" class="mb-4" color="white">mdi-api</v-icon>
          <h1 id="api-hero-title" class="text-h3 font-weight-bold mb-3 text-white">
            {{ $t('page.api.title') }}
          </h1>
          <p class="text-h6 mb-4 text-white opacity-90">
            {{ $t('page.api.hero.description') }}
          </p>
          <div class="d-flex justify-center gap-3 flex-wrap">
            <v-btn
              v-if="fireuser.loggedIn"
              color="white"
              variant="flat"
              size="large"
              prepend-icon="mdi-key-plus"
              @click="scrollToTokens"
            >
              {{ $t('page.api.hero.create_token') }}
            </v-btn>
            <v-btn
              color="white"
              variant="outlined"
              size="large"
              prepend-icon="mdi-file-document"
              href="https://tarkovtracker-org.github.io/TarkovTracker/"
              target="_blank"
            >
              {{ $t('page.api.hero.documentation') }}
            </v-btn>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Quick Stats Section -->
    <v-row
      v-if="fireuser.loggedIn"
      justify="center"
      class="mb-6"
      role="region"
      aria-label="API Statistics"
    >
      <v-col cols="12" sm="6" md="3">
        <v-card
          class="pa-4 text-center"
          variant="elevated"
          color="success"
          aria-label="Active API tokens count"
        >
          <v-icon size="32" class="mb-2" color="white">mdi-check-circle</v-icon>
          <div class="text-h5 font-weight-bold text-white">{{ userTokenCount }}</div>
          <div class="text-body-2 text-white opacity-80">
            {{ $t('page.api.stats.active_tokens') }}
          </div>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card
          class="pa-4 text-center"
          variant="elevated"
          color="info"
          aria-label="API architecture type"
        >
          <v-icon size="32" class="mb-2" color="white">mdi-web</v-icon>
          <div class="text-h5 font-weight-bold text-white">{{ $t('page.api.stats.rest') }}</div>
          <div class="text-body-2 text-white opacity-80">{{ $t('page.api.stats.api_type') }}</div>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card
          class="pa-4 text-center"
          variant="elevated"
          color="warning"
          aria-label="Security authentication method"
        >
          <v-icon size="32" class="mb-2" color="white">mdi-shield-check</v-icon>
          <div class="text-h5 font-weight-bold text-white">{{ $t('page.api.stats.secure') }}</div>
          <div class="text-body-2 text-white opacity-80">
            {{ $t('page.api.stats.bearer_auth') }}
          </div>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card
          class="pa-4 text-center"
          variant="elevated"
          color="primary"
          aria-label="Data synchronization type"
        >
          <v-icon size="32" class="mb-2" color="white">mdi-clock-fast</v-icon>
          <div class="text-h5 font-weight-bold text-white">{{ $t('page.api.stats.realtime') }}</div>
          <div class="text-body-2 text-white opacity-80">
            {{ $t('page.api.stats.data_access') }}
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- API Tokens Section -->
    <v-row ref="tokensSection" justify="center" class="mb-6">
      <v-col v-if="fireuser.loggedIn" cols="12" sm="12" md="10" lg="8" xl="8">
        <fitted-card icon="mdi-key-chain" icon-color="white">
          <template #title>
            {{ $t('page.settings.card.apitokens.title') }}
          </template>
          <template #content>
            <!-- Quick Help Chips -->
            <div class="px-4 mb-4">
              <div class="d-flex flex-wrap gap-2">
                <v-chip color="info" variant="flat" size="small" prepend-icon="mdi-shield-check">
                  <v-tooltip activator="parent" location="top">
                    {{ $t('page.api.chips.secure_tooltip') }}
                  </v-tooltip>
                  {{ $t('page.api.chips.secure_auth') }}
                </v-chip>
                <v-chip color="success" variant="flat" size="small" prepend-icon="mdi-sync">
                  <v-tooltip activator="parent" location="top">
                    {{ $t('page.api.chips.realtime_tooltip') }}
                  </v-tooltip>
                  {{ $t('page.api.chips.realtime_data') }}
                </v-chip>
                <v-chip color="warning" variant="flat" size="small" prepend-icon="mdi-code-json">
                  <v-tooltip activator="parent" location="top">
                    {{ $t('page.api.chips.json_tooltip') }}
                  </v-tooltip>
                  {{ $t('page.api.chips.json_api') }}
                </v-chip>
              </div>
            </div>

            <api-tokens />
          </template>
        </fitted-card>
      </v-col>
      <v-col v-else cols="12" sm="10" md="8" lg="6" xl="6">
        <fitted-card icon="mdi-key-chain" icon-color="white">
          <template #title>
            {{ $t('page.settings.card.apitokens.title') }}
          </template>
          <template #content>
            <div style="text-align: left" class="pt-2 px-4">
              <i18n-t keypath="page.settings.card.apitokens.description" scope="global">
                <template #openAPI_documentation>
                  <a
                    href="https://tarkovtracker-org.github.io/TarkovTracker/"
                    target="_blank"
                    class="info-link"
                  >
                    <v-icon class="mr-1" size="16">mdi-file-document</v-icon
                    >{{ $t('page.settings.card.apitokens.openAPI_documentation') }}
                  </a>
                </template>
              </i18n-t>
            </div>
            <v-row justify="center">
              <v-col cols="12">
                <v-alert v-model="notLoggedInAlert" type="error" variant="tonal" class="ma-2">
                  {{ $t('page.settings.card.apitokens.not_logged_in') }}
                </v-alert>
              </v-col>
            </v-row>
          </template>
        </fitted-card>
      </v-col>
    </v-row>

    <!-- Settings Cards Grid -->
    <v-row justify="center" class="mb-6">
      <!-- Data Migration -->
      <v-col v-if="fireuser.loggedIn" cols="12" sm="12" md="8" lg="6" xl="6" class="d-flex">
        <data-migration-card class="flex-grow-1" />
      </v-col>

      <!-- Account Deletion -->
    </v-row>
  </v-container>
</template>
<script setup>
  import { ref, computed } from 'vue';
  import { fireuser } from '@/plugins/firebase';
  import { useLiveData } from '@/composables/livedata';
  import ApiTokens from '@/features/settings/ApiTokens';
  import DataMigrationCard from '@/features/settings/DataMigrationCard';
  import FittedCard from '@/features/ui/FittedCard';

  const { useSystemStore } = useLiveData();
  const { systemStore } = useSystemStore();

  const tokensSection = ref(null);
  const notLoggedInAlert = ref(true);

  // Computed properties for token count
  const userTokenCount = computed(() => {
    return systemStore.$state.tokens?.length || 0;
  });

  // Scroll to tokens section
  const scrollToTokens = () => {
    if (tokensSection.value) {
      tokensSection.value.$el.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  };
</script>
<style lang="scss" scoped>
  a:link,
  a:active,
  a:visited {
    color: rgba(var(--v-theme-link), 1);
  }
  .info-link {
    text-decoration: none;
  }

  .gap-2 {
    gap: 0.5rem;
  }

  .gap-3 {
    gap: 0.75rem;
  }

  // Responsive improvements
  @media (max-width: 960px) {
    .text-h3 {
      font-size: 2rem !important;
    }

    .text-h6 {
      font-size: 1.125rem !important;
    }
  }

  @media (max-width: 600px) {
    .text-h3 {
      font-size: 1.75rem !important;
    }

    .d-flex.justify-center.gap-3 {
      flex-direction: column;
      gap: 0.75rem;

      .v-btn {
        width: 100%;
      }
    }

    .d-flex.flex-wrap.gap-2 {
      gap: 0.25rem;

      .v-chip {
        margin: 0.125rem;
      }
    }
  }

  // Accessibility improvements
  .v-card:focus-visible {
    outline: 2px solid rgba(var(--v-theme-primary), 0.5);
    outline-offset: 2px;
  }

  .v-btn:focus-visible {
    outline: 2px solid rgba(var(--v-theme-on-surface), 0.5);
    outline-offset: 2px;
  }
</style>
