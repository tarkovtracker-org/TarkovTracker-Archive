<template>
  <v-container>
    <template v-if="userTokenCount == 0">
      <v-card variant="outlined" class="pa-6 text-center ma-2">
        <v-icon size="64" color="primary" class="mb-4">mdi-key-outline</v-icon>
        <h3 class="text-h6 mb-2">{{ $t('page.api.tokens.no_tokens_title') }}</h3>
        <p class="text-body-2 text-medium-emphasis mb-4">
          {{ $t('page.api.tokens.no_tokens_description') }}
        </p>
        <v-btn
          color="primary"
          size="large"
          prepend-icon="mdi-key-plus"
          @click="showNewTokenForm = true"
        >
          {{ $t('page.api.tokens.create_first_token') }}
        </v-btn>
      </v-card>
    </template>
    <v-row no-gutters>
      <v-col
        v-for="token in userTokens"
        :key="token"
        cols="12"
        sm="12"
        md="6"
        lg="6"
        xl="6"
      >
        <TokenCard :token="token" class="ma-2" />
      </v-col>
    </v-row>
  </v-container>
  <v-container v-if="showNewTokenForm">
    <!-- Form to create a user API token -->
    <v-sheet color="secondary_dark" rounded class="pa-4">
      <div class="d-flex align-center mb-4">
        <v-icon color="white" class="mr-2">mdi-key-plus</v-icon>
        <h3 class="text-h6">{{ $t('page.api.tokens.create_new_token') }}</h3>
      </div>

      <v-form ref="newTokenForm" v-model="validNewToken">
        <v-text-field
          v-model="tokenName"
          :rules="tokenNameRules"
          :label="$t('page.api.tokens.form.description_label')"
          :placeholder="$t('page.api.tokens.form.description_placeholder')"
          required
          density="compact"
          variant="outlined"
          prepend-inner-icon="mdi-tag"
          counter="20"
          :error="!!tokenNameError"
          :error-messages="tokenNameError"
          :hint="$t('page.api.tokens.form.description_hint')"
          persistent-hint
          class="mb-4"
        >
        </v-text-field>

        <div class="mb-4">
          <div class="text-subtitle-2 mb-2 d-flex align-center">
            <v-icon class="mr-2" size="20">mdi-gamepad-variant</v-icon>
            {{ $t('page.api.tokens.form.gamemode_title') }}
          </div>
          <div class="text-caption text-medium-emphasis mb-3">
            {{ $t('page.api.tokens.form.gamemode_description') }}
          </div>
          
          <v-radio-group v-model="selectedGameMode" density="compact" class="mb-4" column>
            <v-radio
              value="pvp"
              color="white"
            >
              <template #label>
                <div>
                  <div class="font-weight-medium d-flex align-center">
                    <v-chip color="blue" size="x-small" class="mr-2">PvP</v-chip>
                    {{ $t('page.api.tokens.form.gamemode_pvp_title') }}
                  </div>
                  <div class="text-caption text-medium-emphasis">
                    {{ $t('page.api.tokens.form.gamemode_pvp_description') }}
                  </div>
                </div>
              </template>
            </v-radio>
            <v-radio
              value="pve"
              color="white"
            >
              <template #label>
                <div>
                  <div class="font-weight-medium d-flex align-center">
                    <v-chip color="green" size="x-small" class="mr-2">PvE</v-chip>
                    {{ $t('page.api.tokens.form.gamemode_pve_title') }}
                  </div>
                  <div class="text-caption text-medium-emphasis">
                    {{ $t('page.api.tokens.form.gamemode_pve_description') }}
                  </div>
                </div>
              </template>
            </v-radio>
            <v-radio
              value="dual"
              color="white"
            >
              <template #label>
                <div>
                  <div class="font-weight-medium d-flex align-center">
                    <v-chip color="orange" size="x-small" class="mr-2">DUAL</v-chip>
                    {{ $t('page.api.tokens.form.gamemode_dual_title') }}
                    <v-icon color="warning" size="small" class="ml-1">mdi-alert</v-icon>
                  </div>
                  <div class="text-caption text-medium-emphasis">
                    {{ $t('page.api.tokens.form.gamemode_dual_description') }}
                  </div>
                </div>
              </template>
            </v-radio>
          </v-radio-group>
        </div>

        <div class="mb-4">
          <div class="text-subtitle-2 mb-2 d-flex align-center">
            <v-icon class="mr-2" size="20">mdi-shield-key</v-icon>
            {{ $t('page.api.tokens.form.permissions_title') }}
          </div>
          <div class="text-caption text-medium-emphasis mb-3">
            {{ $t('page.api.tokens.form.permissions_description') }}
          </div>

          <v-alert
            v-if="selectOneError"
            type="error"
            variant="tonal"
            density="compact"
            class="mb-3"
          >
            <template #prepend>
              <v-icon>mdi-alert-circle</v-icon>
            </template>
            {{ $t('page.api.tokens.form.permissions_error') }}
          </v-alert>

          <v-card variant="outlined" class="pa-3">
            <v-row>
              <v-col
                v-for="(permission, permissionKey) in availablePermissions"
                :key="permission"
                cols="12"
                md="6"
              >
                <v-checkbox
                  v-model="selectedPermissions"
                  :label="permission.title"
                  :value="permissionKey"
                  :error="selectOneError"
                  density="compact"
                  hide-details
                  color="white"
                  class="permission-checkbox"
                >
                  <template #label>
                    <div>
                      <div class="font-weight-medium text-white">{{ permission.title }}</div>
                      <div class="text-caption text-white">
                        {{
                          permission.description || 'Access to ' + permission.title.toLowerCase()
                        }}
                      </div>
                    </div>
                  </template>
                </v-checkbox>
              </v-col>
            </v-row>
          </v-card>

          <div v-if="selectedPermissions.length > 0" class="mt-3">
            <div class="text-caption text-white mb-2">
              {{ $t('page.api.tokens.form.selected_permissions') }}:
            </div>
            <div class="d-flex flex-wrap gap-2">
              <v-chip
                v-for="perm in selectedPermissions"
                :key="perm"
                color="white"
                size="small"
                variant="outlined"
                class="selected-permission-chip"
              >
                {{ availablePermissions[perm]?.title || perm }}
              </v-chip>
            </div>
          </div>
        </div>

        <v-divider class="my-4"></v-divider>

        <div class="d-flex justify-space-between align-center">
          <div class="text-caption text-medium-emphasis">
            {{ $t('page.api.tokens.form.active_info') }}
          </div>
          <div class="d-flex gap-2">
            <v-btn variant="outlined" @click="cancelTokenCreation">
              {{ $t('page.api.tokens.form.cancel') }}
            </v-btn>
            <v-btn
              :disabled="!canCreateToken"
              color="green"
              :loading="creatingToken"
              append-icon="mdi-key-plus"
              @click="createToken"
            >
              {{ $t('page.settings.card.apitokens.submit_new_token') }}
            </v-btn>
          </div>
        </div>
      </v-form>
    </v-sheet>
  </v-container>
  <v-container class="align-left" fluid>
    <v-row align="start">
      <!-- Button to show the new token form -->
      <v-btn
        v-if="!showNewTokenForm"
        variant="outlined"
        class="mx-1"
        prepend-icon="mdi-unfold-more-horizontal"
        @click="showNewTokenForm = true"
      >
        {{ $t('page.api.tokens.create_token_button') }}
      </v-btn>
    </v-row>
  </v-container>
  <v-snackbar v-model="newTokenSnackbar" :timeout="6000" :color="snackbarColor" location="top">
    <div class="d-flex align-center">
      <v-icon :icon="snackbarIcon" class="mr-3"></v-icon>
      <div>
        <div class="font-weight-medium">{{ tokenResult }}</div>
        <div v-if="tokenResultSubtext" class="text-caption opacity-90">
          {{ tokenResultSubtext }}
        </div>
      </div>
    </div>
    <template #actions>
      <v-btn color="white" variant="text" @click="newTokenSnackbar = false">
        {{ $t('page.api.tokens.close') }}
      </v-btn>
    </template>
  </v-snackbar>
</template>
<script setup>
  import { ref, computed } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { functions } from '@/plugins/firebase';
  import { httpsCallable } from '@/plugins/firebase';
  import { useLiveData } from '@/composables/livedata';
  import availablePermissions from '@/utils/api_permissions';
  import TokenCard from '@/features/settings/TokenCard.vue';
  import { auth } from '@/plugins/firebase';
  const { t } = useI18n({ useScope: 'global' });
  const { useSystemStore } = useLiveData();
  const { systemStore } = useSystemStore();
  // Use computed properties with direct state access (temporary workaround for getter issue)
  const userTokens = computed(() => {
    return systemStore.$state.tokens || [];
  });
  const userTokenCount = computed(() => {
    return systemStore.$state.tokens?.length || 0;
  });
  // New token form
  const selectOneError = ref(false);
  const newTokenForm = ref(null);
  const validNewToken = ref(false);
  const tokenName = ref('');
  const tokenNameError = ref('');
  const selectedPermissions = ref([]);
  const selectedGameMode = ref('pvp'); // Default to PvP for backward compatibility
  const selectedPermissionsCount = computed(() => selectedPermissions.value.length);
  const canCreateToken = computed(() => {
    return (
      tokenName.value &&
      tokenName.value.trim().length > 0 &&
      selectedPermissionsCount.value > 0 &&
      validNewToken.value
    );
  });
  const tokenNameRules = ref([
    (v) => !!v || t('page.api.tokens.form.validation.required'),
    (v) => v.length <= 20 || t('page.api.tokens.form.validation.max_length'),
  ]);
  const creatingToken = ref(false);
  const tokenResult = ref(null);
  const tokenResultSubtext = ref(null);
  const newTokenSnackbar = ref(false);
  const showNewTokenForm = ref(false);
  const snackbarColor = ref('success');
  const snackbarIcon = ref('mdi-check-circle');
  const cancelTokenCreation = () => {
    showNewTokenForm.value = false;
    newTokenForm.value?.reset();
    tokenName.value = '';
    selectedPermissions.value = [];
    selectedGameMode.value = 'pvp'; // Reset to default
    selectOneError.value = false;
    tokenNameError.value = '';
  };
  const createTokenWithHttp = async (tokenData) => {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }
    const token = await user.getIdToken();

    const response = await fetch(
      'https://us-central1-tarkovtracker-org.cloudfunctions.net/createTokenHttp',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(tokenData),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'HTTP request failed');
    }

    return await response.json();
  };

  const createToken = async () => {
    let { valid } = await newTokenForm.value.validate();
    if (!valid) {
      if (selectedPermissionsCount.value == 0) {
        selectOneError.value = true;
        return;
      } else {
        selectOneError.value = false;
      }
      return;
    }
    if (selectedPermissionsCount.value == 0) {
      selectOneError.value = true;
      return;
    } else {
      selectOneError.value = false;
    }
    creatingToken.value = true;

    const tokenData = {
      note: tokenName.value,
      permissions: selectedPermissions.value,
      gameMode: selectedGameMode.value,
    };

    try {
      let result;
      try {
        // Try the callable function first
        const createTokenFn = httpsCallable(functions, 'createToken');
        const callableResult = await createTokenFn(tokenData);
        result = callableResult.data;
      } catch (callableError) {
        console.warn('Callable function failed, trying HTTP endpoint:', callableError);
        // If callable fails (likely due to CORS), use HTTP endpoint
        result = await createTokenWithHttp(tokenData);
      }

      if (!result || !result.token) {
        console.error('Token not found in response. Expected: result.token');
        console.error('Available response data:', Object.keys(result || {}));
        throw new Error('Token creation failed: No token returned from server');
      }
      
      cancelTokenCreation();
      snackbarColor.value = 'success';
      snackbarIcon.value = 'mdi-check-circle';
      tokenResult.value = t('page.api.tokens.success.title');
      tokenResultSubtext.value = t('page.api.tokens.success.message');
      newTokenSnackbar.value = true;
    } catch (error) {
      console.error('Error creating token:', error);
      snackbarColor.value = 'error';
      snackbarIcon.value = 'mdi-alert-circle';
      tokenResult.value = t('page.api.tokens.error.title');
      tokenResultSubtext.value = t('page.api.tokens.error.message');
      newTokenSnackbar.value = true;
    }
    creatingToken.value = false;
  };
</script>
<style lang="scss" scoped>
  .permission-checkbox {
    :deep(.v-label) {
      opacity: 1;
    }
  }

  .selected-permission-chip {
    color: white;
    border-color: white;
  }

  .gap-2 {
    gap: 0.5rem;
  }

  .gap-3 {
    gap: 0.75rem;
  }

  @media (max-width: 600px) {
    .d-flex.justify-space-between {
      flex-direction: column;
      gap: 1rem;
    }

    .d-flex.gap-2 {
      justify-content: stretch;

      .v-btn {
        flex: 1;
      }
    }
  }
</style>
