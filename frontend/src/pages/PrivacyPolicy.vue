<template>
  <v-container class="py-8">
    <v-row justify="center">
      <v-col cols="12" md="10" lg="8">
        <v-card class="pa-6 pa-md-10" elevation="2">
          <h1 class="text-h4 font-weight-bold mb-4">{{ t('legal.privacy.title') }}</h1>
          <p class="text-body-2 text-medium-emphasis mb-6">{{ lastUpdated }}</p>
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">
              {{ t('legal.privacy.sections.introduction.heading') }}
            </h2>
            <p class="text-body-1 mb-2">{{ t('legal.privacy.sections.introduction.body1') }}</p>
            <p class="text-body-1 mb-0">{{ t('legal.privacy.sections.introduction.body2') }}</p>
          </section>
          <v-divider class="mb-8" />
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">
              {{ t('legal.privacy.sections.information.heading') }}
            </h2>
            <p class="text-body-1 mb-3">{{ t('legal.privacy.sections.information.intro') }}</p>
            <ul class="text-body-1 mb-4 pl-4">
              <li class="mb-2">
                <strong>{{ t('legal.privacy.sections.information.items.account.title') }}</strong
                >:
                {{ t('legal.privacy.sections.information.items.account.description') }}
              </li>
              <li class="mb-2">
                <strong>{{ t('legal.privacy.sections.information.items.gameplay.title') }}</strong
                >:
                {{ t('legal.privacy.sections.information.items.gameplay.description') }}
              </li>
              <li class="mb-2">
                <strong>{{ t('legal.privacy.sections.information.items.analytics.title') }}</strong
                >:
                {{ t('legal.privacy.sections.information.items.analytics.description') }}
              </li>
              <li class="mb-0">
                <strong>{{ t('legal.privacy.sections.information.items.support.title') }}</strong
                >:
                <i18n-t
                  tag="span"
                  keypath="legal.privacy.sections.information.items.support.description"
                >
                  <template #email>
                    <a href="mailto:support@tarkovtracker.org">support@tarkovtracker.org</a>
                  </template>
                </i18n-t>
              </li>
            </ul>
            <p class="text-body-1 mb-0">{{ t('legal.privacy.sections.information.footer') }}</p>
          </section>
          <v-divider class="mb-8" />
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">
              {{ t('legal.privacy.sections.use.heading') }}
            </h2>
            <p class="text-body-1 mb-2">{{ t('legal.privacy.sections.use.intro') }}</p>
            <ul class="text-body-1 mb-0 pl-4">
              <li class="mb-2">{{ t('legal.privacy.sections.use.items.0') }}</li>
              <li class="mb-2">{{ t('legal.privacy.sections.use.items.1') }}</li>
              <li class="mb-2">{{ t('legal.privacy.sections.use.items.2') }}</li>
              <li class="mb-2">{{ t('legal.privacy.sections.use.items.3') }}</li>
              <li class="mb-0">{{ t('legal.privacy.sections.use.items.4') }}</li>
            </ul>
          </section>
          <v-divider class="mb-8" />
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">
              {{ t('legal.privacy.sections.legal_bases.heading') }}
            </h2>
            <p class="text-body-1 mb-2">{{ t('legal.privacy.sections.legal_bases.intro') }}</p>
            <ul class="text-body-1 mb-0 pl-4">
              <li class="mb-2">{{ t('legal.privacy.sections.legal_bases.items.0') }}</li>
              <li class="mb-2">{{ t('legal.privacy.sections.legal_bases.items.1') }}</li>
              <li class="mb-0">{{ t('legal.privacy.sections.legal_bases.items.2') }}</li>
            </ul>
          </section>
          <v-divider class="mb-8" />
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">
              {{ t('legal.privacy.sections.sharing.heading') }}
            </h2>
            <p class="text-body-1 mb-2">{{ t('legal.privacy.sections.sharing.intro') }}</p>
            <ul class="text-body-1 mb-4 pl-4">
              <li class="mb-2">
                <i18n-t tag="span" keypath="legal.privacy.sections.sharing.items.service_providers">
                  <template #firebase>
                    <a
                      href="https://firebase.google.com/support/privacy"
                      target="_blank"
                      rel="noopener"
                      >firebase.google.com/support/privacy</a
                    >
                  </template>
                  <template #microsoft>
                    <a
                      href="https://privacy.microsoft.com/en-us/privacystatement"
                      target="_blank"
                      rel="noopener"
                      >privacy.microsoft.com</a
                    >
                  </template>
                </i18n-t>
              </li>
              <li class="mb-2">
                {{ t('legal.privacy.sections.sharing.items.team_collaboration') }}
              </li>
              <li class="mb-0">
                {{ t('legal.privacy.sections.sharing.items.legal_requirements') }}
              </li>
            </ul>
            <p class="text-body-1 mb-0">{{ t('legal.privacy.sections.sharing.footer') }}</p>
          </section>
          <v-divider class="mb-8" />
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">
              {{ t('legal.privacy.sections.retention.heading') }}
            </h2>
            <p class="text-body-1 mb-2">{{ t('legal.privacy.sections.retention.body1') }}</p>
            <p class="text-body-1 mb-0">{{ t('legal.privacy.sections.retention.body2') }}</p>
          </section>
          <v-divider class="mb-8" />
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">
              {{ t('legal.privacy.sections.cookies.heading') }}
            </h2>
            <p class="text-body-1 mb-2">{{ t('legal.privacy.sections.cookies.body1') }}</p>
            <p class="text-body-1 mb-0">{{ t('legal.privacy.sections.cookies.body2') }}</p>
          </section>
          <v-divider class="mb-8" />
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">
              {{ t('legal.privacy.sections.rights.heading') }}
            </h2>
            <p class="text-body-1 mb-2">{{ t('legal.privacy.sections.rights.intro') }}</p>
            <ul class="text-body-1 mb-4 pl-4">
              <li class="mb-2">{{ t('legal.privacy.sections.rights.items.0') }}</li>
              <li class="mb-2">{{ t('legal.privacy.sections.rights.items.1') }}</li>
              <li class="mb-2">{{ t('legal.privacy.sections.rights.items.2') }}</li>
              <li class="mb-2">{{ t('legal.privacy.sections.rights.items.3') }}</li>
              <li class="mb-0">{{ t('legal.privacy.sections.rights.items.4') }}</li>
            </ul>
            <i18n-t tag="p" keypath="legal.privacy.sections.rights.footer" class="text-body-1 mb-0">
              <template #email>
                <a href="mailto:support@tarkovtracker.org">support@tarkovtracker.org</a>
              </template>
            </i18n-t>
          </section>
          <v-divider class="mb-8" />
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">
              {{ t('legal.privacy.sections.transfers.heading') }}
            </h2>
            <p class="text-body-1 mb-0">{{ t('legal.privacy.sections.transfers.body1') }}</p>
          </section>
          <v-divider class="mb-8" />
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">
              {{ t('legal.privacy.sections.security.heading') }}
            </h2>
            <p class="text-body-1 mb-0">{{ t('legal.privacy.sections.security.body1') }}</p>
          </section>
          <v-divider class="mb-8" />
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">
              {{ t('legal.privacy.sections.children.heading') }}
            </h2>
            <p class="text-body-1 mb-0">{{ t('legal.privacy.sections.children.body1') }}</p>
          </section>
          <v-divider class="mb-8" />
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">
              {{ t('legal.privacy.sections.changes.heading') }}
            </h2>
            <p class="text-body-1 mb-2">{{ t('legal.privacy.sections.changes.body1') }}</p>
            <p class="text-body-1 mb-0">{{ t('legal.privacy.sections.changes.body2') }}</p>
          </section>
          <v-divider class="mb-8" />
          <section>
            <h2 class="text-h5 font-weight-bold mb-3">
              {{ t('legal.privacy.sections.contact.heading') }}
            </h2>
            <i18n-t tag="p" keypath="legal.privacy.sections.contact.body1" class="text-body-1 mb-2">
              <template #email>
                <a href="mailto:support@tarkovtracker.org">support@tarkovtracker.org</a>
              </template>
            </i18n-t>
            <p class="text-body-1 mb-0 text-medium-emphasis">
              {{ t('legal.privacy.sections.contact.body2') }}
            </p>
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
    t('legal.privacy.last_updated', { date: t('legal.privacy.last_updated_date') })
  );
</script>
<style scoped>
  ul {
    list-style: disc;
  }
</style>
