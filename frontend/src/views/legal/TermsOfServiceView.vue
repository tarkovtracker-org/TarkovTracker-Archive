<template>
  <v-container class="py-8">
    <v-row justify="center">
      <v-col cols="12" md="10" lg="8">
        <v-card class="pa-6 pa-md-10" elevation="2">
          <h1 class="text-h4 font-weight-bold mb-4">{{ t('legal.terms.title') }}</h1>
          <p class="text-body-2 text-medium-emphasis mb-6">{{ lastUpdated }}</p>

          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">
              {{ t('legal.terms.sections.acceptance.heading') }}
            </h2>
            <p class="text-body-1 mb-2">{{ t('legal.terms.sections.acceptance.body1') }}</p>
            <p class="text-body-1 mb-0">{{ t('legal.terms.sections.acceptance.body2') }}</p>
          </section>

          <v-divider class="mb-8" />

          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">
              {{ t('legal.terms.sections.accounts.heading') }}
            </h2>
            <p class="text-body-1 mb-2">{{ t('legal.terms.sections.accounts.body1') }}</p>
            <i18n-t tag="p" keypath="legal.terms.sections.accounts.body2" class="text-body-1 mb-0">
              <template #email>
                <a href="mailto:support@tarkovtracker.org">support@tarkovtracker.org</a>
              </template>
            </i18n-t>
          </section>

          <v-divider class="mb-8" />

          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">
              {{ t('legal.terms.sections.acceptable_use.heading') }}
            </h2>
            <ul class="text-body-1 mb-0 pl-4">
              <li class="mb-2">{{ t('legal.terms.sections.acceptable_use.items.0') }}</li>
              <li class="mb-2">{{ t('legal.terms.sections.acceptable_use.items.1') }}</li>
              <li class="mb-2">{{ t('legal.terms.sections.acceptable_use.items.2') }}</li>
              <li class="mb-0">{{ t('legal.terms.sections.acceptable_use.items.3') }}</li>
            </ul>
          </section>

          <v-divider class="mb-8" />

          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">
              {{ t('legal.terms.sections.availability.heading') }}
            </h2>
            <p class="text-body-1 mb-2">{{ t('legal.terms.sections.availability.body1') }}</p>
            <p class="text-body-1 mb-0">{{ t('legal.terms.sections.availability.body2') }}</p>
          </section>

          <v-divider class="mb-8" />

          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">
              {{ t('legal.terms.sections.user_content.heading') }}
            </h2>
            <p class="text-body-1 mb-2">{{ t('legal.terms.sections.user_content.body1') }}</p>
            <i18n-t
              tag="p"
              keypath="legal.terms.sections.user_content.body2"
              class="text-body-1 mb-0"
            >
              <template #privacyLink>
                <router-link to="/privacy">{{ t('legal.privacy.title') }}</router-link>
              </template>
            </i18n-t>
          </section>

          <v-divider class="mb-8" />

          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">
              {{ t('legal.terms.sections.third_party.heading') }}
            </h2>
            <p class="text-body-1 mb-2">{{ t('legal.terms.sections.third_party.body1') }}</p>
            <p class="text-body-1 mb-0">{{ t('legal.terms.sections.third_party.body2') }}</p>
          </section>

          <v-divider class="mb-8" />

          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">
              {{ t('legal.terms.sections.disclaimers.heading') }}
            </h2>
            <p class="text-body-1 mb-2">{{ t('legal.terms.sections.disclaimers.body1') }}</p>
            <p class="text-body-1 mb-0">{{ t('legal.terms.sections.disclaimers.body2') }}</p>
          </section>

          <v-divider class="mb-8" />

          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">
              {{ t('legal.terms.sections.liability.heading') }}
            </h2>
            <p class="text-body-1 mb-2">{{ t('legal.terms.sections.liability.body1') }}</p>
            <p class="text-body-1 mb-0">{{ t('legal.terms.sections.liability.body2') }}</p>
          </section>

          <v-divider class="mb-8" />

          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">
              {{ t('legal.terms.sections.indemnification.heading') }}
            </h2>
            <p class="text-body-1 mb-0">{{ t('legal.terms.sections.indemnification.body1') }}</p>
          </section>

          <v-divider class="mb-8" />

          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">
              {{ t('legal.terms.sections.governing_law.heading') }}
            </h2>
            <p class="text-body-1 mb-0">{{ t('legal.terms.sections.governing_law.body1') }}</p>
          </section>

          <v-divider class="mb-8" />

          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">
              {{ t('legal.terms.sections.changes.heading') }}
            </h2>
            <p class="text-body-1 mb-2">{{ t('legal.terms.sections.changes.body1') }}</p>
            <p class="text-body-1 mb-0">{{ t('legal.terms.sections.changes.body2') }}</p>
          </section>

          <v-divider class="mb-8" />

          <section>
            <h2 class="text-h5 font-weight-bold mb-3">
              {{ t('legal.terms.sections.contact.heading') }}
            </h2>
            <i18n-t tag="p" keypath="legal.terms.sections.contact.body" class="text-body-1 mb-0">
              <template #email>
                <a href="mailto:support@tarkovtracker.org">support@tarkovtracker.org</a>
              </template>
            </i18n-t>
          </section>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
  import { computed } from 'vue';
  import { useI18n } from 'vue-i18n';

  const { t } = useI18n({ useScope: 'global' });

  const lastUpdated = computed(() =>
    t('legal.terms.last_updated', { date: t('legal.terms.last_updated_date') })
  );
</script>

<style scoped>
  ul {
    list-style: disc;
  }
</style>
