<template>
  <v-sheet v-if="tokenDataRef && !tokenDataRef.error" class="pa-2" color="primary" :rounded="true">
    <div class="d-flex align-center mb-2">
      <div class="mr-2">
        <b>{{ $t('page.settings.card.apitokens.note_column') }}:</b>
        {{ tokenDataRef?.note }}
      </div>
      <v-spacer></v-spacer>
      <v-chip :color="gameModeChipColor" size="small" variant="tonal" class="ml-2">
        <v-icon :icon="gameModeIcon" size="small" class="mr-1"></v-icon>
        {{ gameModeDisplay }}
      </v-chip>
    </div>
    <div>
      <b>{{ $t('page.settings.card.apitokens.token_column') }}:</b>
      <span
        :class="{ 'token-visible': tokenVisible, 'token-hidden': !tokenVisible }"
        :title="tokenVisible ? 'Click to hide token' : 'Click to reveal token'"
        class="token-display"
        @click="toggleTokenVisibility"
      >
        {{ tokenVisible ? props.token : tokenHidden }}
      </span>
    </div>
    <div>
      <b>{{ $t('page.settings.card.apitokens.permissions_column') }}: </b>
      <span v-for="(permission, index) in tokenPermissions" :key="index">
        {{ $t('page.settings.card.apitokens.permission.' + permission)
        }}<span v-if="index < tokenPermissions.length - 1">, </span>
      </span>
    </div>
    <div>{{ $t('page.settings.card.apitokens.created_column') }} {{ relativeDays }}</div>
    <div v-show="showQR">
      <template v-if="userStore.getStreamerMode">
        {{ $t('page.settings.card.apitokens.streamer_mode_qr') }}
      </template>
      <template v-else>
        <canvas :id="props.token + '-tc'"></canvas>
      </template>
    </div>
    <div class="mt-1">
      <v-btn
        variant="outlined"
        :icon="copied ? 'mdi-check' : 'mdi-content-copy'"
        class="mx-1"
        :color="copied ? 'success' : 'secondary'"
        size="x-small"
        @click="copyToken"
      ></v-btn>
      <v-btn
        variant="outlined"
        icon="mdi-qrcode"
        class="mx-1"
        color="secondary"
        size="x-small"
        @click="toggleQR"
      ></v-btn>
      <v-btn
        variant="outlined"
        icon="mdi-delete"
        class="mx-1"
        color="secondary"
        :disabled="deleting"
        :loading="deleting"
        size="x-small"
        @click="deleteToken"
      ></v-btn>
    </div>
  </v-sheet>
  <v-sheet
    v-else-if="tokenDataRef && tokenDataRef.error"
    class="pa-2"
    color="error"
    :rounded="true"
  >
    <div>Error loading token: {{ tokenDataRef.error }}</div>
    <div>Token ID: {{ props.token }}</div>
  </v-sheet>
  <v-sheet v-else class="pa-2" color="primary" :rounded="true">
    <v-skeleton-loader type="paragraph"></v-skeleton-loader>
  </v-sheet>
</template>
<script setup>
  import { firestore, functions } from '@/plugins/firebase';
  import { doc, getDoc } from '@/plugins/firebase';
  import { httpsCallable } from '@/plugins/firebase';
  import { computed, nextTick, ref } from 'vue';
  import QRCode from 'qrcode';
  import { useUserStore } from '@/stores/user';
  import { useI18n } from 'vue-i18n';
  import { logger } from '@/utils/logger';
  // Get locale for use in calculating relative time
  const { locale } = useI18n({ useScope: 'global' });
  // Define the props for the component
  const props = defineProps({
    token: {
      type: String,
      required: true,
    },
  });
  const userStore = useUserStore();
  // Ref to store tokenData when retrieved from Firestore
  const tokenDataRef = ref(null);
  const tokenDoc = doc(firestore, 'token', props.token);
  // Retrieve the data from the document then store it in tokenDataRef
  getDoc(tokenDoc)
    .then((docSnap) => {
      if (docSnap.exists()) {
        tokenDataRef.value = docSnap.data();
      } else {
        // Set a fallback value to prevent infinite loading
        tokenDataRef.value = { error: 'Document not found' };
      }
    })
    .catch((_error) => {
      // Set a fallback value to prevent infinite loading
      tokenDataRef.value = { error: 'Failed to load token data' };
    });
  // Computed property to retrieve the timestamp of the token creation
  const tokenCreated = computed(() => {
    if (!tokenDataRef.value?.createdAt) return Date.now();
    return tokenDataRef.value.createdAt.toDate() || Date.now();
  });
  // Computed property to display the permissions of the token
  const tokenPermissions = computed(() => {
    if (!tokenDataRef.value?.permissions) {
      return [];
    }
    return tokenDataRef.value.permissions;
  });

  // Get game mode from database or default to PvP for legacy tokens
  const tokenGameMode = computed(() => {
    // Use stored gameMode field or default to 'pvp' for backward compatibility
    return tokenDataRef.value?.gameMode || 'pvp';
  });

  // Game mode display properties
  const gameModeDisplay = computed(() => {
    switch (tokenGameMode.value) {
      case 'pvp':
        return 'PvP Only';
      case 'pve':
        return 'PvE Only';
      case 'dual':
        return 'Dual Mode';
      default:
        return 'PvP Only';
    }
  });

  const gameModeChipColor = computed(() => {
    switch (tokenGameMode.value) {
      case 'pvp':
        return 'blue';
      case 'pve':
        return 'green';
      case 'dual':
        return 'orange';
      default:
        return 'blue';
    }
  });

  const gameModeIcon = computed(() => {
    switch (tokenGameMode.value) {
      case 'pvp':
        return 'mdi-sword-cross';
      case 'pve':
        return 'mdi-shield-account';
      case 'dual':
        return 'mdi-swap-horizontal-variant';
      default:
        return 'mdi-sword-cross';
    }
  });
  // Calculate the relative days since the token was created using Intl.RelativeTimeFormat
  const relativeDays = computed(() => {
    if (!tokenDataRef.value?.createdAt) {
      return 'N/A';
    }
    const relativeTimeFormat = new Intl.RelativeTimeFormat(locale.value, {
      numeric: 'auto',
    });
    const days = Math.floor((Date.now() - tokenCreated.value) / 86400000);
    const formattedDays = relativeTimeFormat.format(-days, 'day');
    return formattedDays;
  });
  const tokenHidden = computed(() => {
    if (userStore.getStreamerMode) {
      return props.token.replace(/.(?=.{0})/g, '*');
    } else {
      return props.token.replace(/.(?=.{5})/g, '*');
    }
  });
  const copied = ref(false);
  const copyToken = async () => {
    try {
      await navigator.clipboard.writeText(props.token);
      copied.value = true;
      setTimeout(() => {
        copied.value = false;
      }, 2000);
    } catch {
      // Ignore clipboard errors
    }
  };
  const deleting = ref(false);
  const deleteToken = async () => {
    const revokeTokenFn = httpsCallable(functions, 'revokeToken');
    deleting.value = true;
    try {
      const result = await revokeTokenFn({ token: props.token });
      if (result.data.error) {
        logger.error('Token revocation failed:', result.data.error);
      }
    } catch (error) {
      logger.error('Failed to revoke token', error);
    } finally {
      deleting.value = false;
    }
  };
  const showQR = ref(false);
  const qrGenerated = ref(false);
  const tokenVisible = ref(false);
  const generateQR = () => {
    const canvasId = props.token + '-tc';
    const canvasElement = document.getElementById(canvasId);
    if (canvasElement && !qrGenerated.value) {
      QRCode.toCanvas(canvasElement, props.token, {}, function (error) {
        if (error) {
          logger.error('QR code generation failed', error);
        } else {
          qrGenerated.value = true;
        }
      });
    }
  };
  const toggleQR = () => {
    showQR.value = !showQR.value;
    if (showQR.value) {
      // Use nextTick to ensure the canvas is rendered before generating QR
      nextTick(() => {
        generateQR();
      });
    }
  };
  const toggleTokenVisibility = () => {
    tokenVisible.value = !tokenVisible.value;
  };
</script>
<style lang="scss" scoped>
  .token-display {
    cursor: pointer;
    user-select: none;
    padding: 2px 4px;
    border-radius: 4px;
    transition: all 0.2s ease;
    font-family: 'Courier New', monospace;
    &:hover {
      background-color: rgba(255, 255, 255, 0.1);
    }
    &.token-hidden {
      opacity: 0.7;
      &:hover {
        opacity: 1;
      }
    }
    &.token-visible {
      background-color: rgba(76, 175, 80, 0.1);
      color: #4caf50;
      &:hover {
        background-color: rgba(76, 175, 80, 0.2);
      }
    }
  }
</style>
