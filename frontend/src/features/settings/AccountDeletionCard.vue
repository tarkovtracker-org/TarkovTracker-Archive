<template>
  <div class="account-deletion-card" :class="$attrs.class">
    <fitted-card icon="mdi-account-remove" icon-color="error">
      <template #title>
        <span class="text-error">Delete Account</span>
      </template>
      <template #content>
        <div class="pa-4">
          <!-- Warning Section -->
          <v-alert type="error" variant="tonal" class="mb-4" prominent>
            <template #prepend>
              <v-icon>mdi-alert-circle</v-icon>
            </template>
            <div class="text-h6 mb-2">Permanent Account Deletion</div>
            <div class="text-body-2">
              This action cannot be undone. All your data will be permanently deleted including:
            </div>
            <ul class="mt-2 ml-4">
              <li>Your progress tracking data</li>
              <li>Team memberships and owned teams</li>
              <li>API tokens and settings</li>
              <li>All personal information</li>
            </ul>
          </v-alert>

          <!-- Team Ownership Warning -->
          <v-alert v-if="hasOwnedTeams" type="warning" variant="tonal" class="mb-4">
            <template #prepend>
              <v-icon>mdi-account-group</v-icon>
            </template>
            <div class="text-h6 mb-2">Team Ownership Transfer</div>
            <div class="text-body-2">
              You own {{ ownedTeamsCount }} team(s). Team ownership will be automatically
              transferred to the oldest member in each team. Teams without other members will be
              deleted.
            </div>
          </v-alert>

          <!-- Account Information -->
          <v-card variant="outlined" class="mb-4">
            <v-card-text>
              <div class="text-subtitle-1 mb-2">Account Information</div>
              <div class="d-flex align-center mb-1">
                <v-icon size="16" class="mr-2">mdi-email</v-icon>
                <span class="text-body-2">{{ userEmail }}</span>
              </div>
              <div class="d-flex align-center mb-1">
                <v-icon size="16" class="mr-2">mdi-account</v-icon>
                <span class="text-body-2">{{ fireuser.displayName || 'No display name' }}</span>
              </div>
              <div class="d-flex align-center mb-1">
                <v-icon size="16" class="mr-2">mdi-identifier</v-icon>
                <span class="text-body-2 mr-2">Account ID: {{ fireuser.uid }}</span>
                <v-btn
                  size="x-small"
                  variant="text"
                  icon="mdi-content-copy"
                  :color="accountIdCopied ? 'success' : 'primary'"
                  class="ml-1"
                  @click="copyAccountId"
                >
                  <v-icon size="14">{{
                    accountIdCopied ? 'mdi-check' : 'mdi-content-copy'
                  }}</v-icon>
                  <v-tooltip activator="parent" location="top">
                    {{ accountIdCopied ? 'Copied!' : 'Copy Account ID' }}
                  </v-tooltip>
                </v-btn>
              </div>
              <div class="d-flex align-center">
                <v-icon size="16" class="mr-2">mdi-calendar</v-icon>
                <span class="text-body-2">Member since {{ formatDate(fireuser.createdAt) }}</span>
              </div>
            </v-card-text>
          </v-card>

          <!-- Deletion Button -->
          <div class="text-center">
            <v-btn
              color="error"
              variant="flat"
              size="large"
              prepend-icon="mdi-delete-forever"
              :loading="isDeleting"
              :disabled="isDeleting"
              @click="showConfirmationDialog = true"
            >
              Delete My Account Forever
            </v-btn>
          </div>
        </div>
      </template>
    </fitted-card>
  </div>

  <!-- Confirmation Dialog -->
  <v-dialog v-model="showConfirmationDialog" max-width="600" persistent>
    <v-card>
      <v-card-title class="text-h5 text-error d-flex align-center">
        <v-icon class="mr-2" color="error">mdi-alert-circle</v-icon>
        Confirm Account Deletion
      </v-card-title>

      <v-card-text class="pt-4">
        <!-- Final Warning -->
        <v-alert type="error" variant="flat" class="mb-4">
          <div class="font-weight-bold">This action is irreversible!</div>
          <div class="mt-1">All your data will be permanently deleted and cannot be recovered.</div>
        </v-alert>

        <!-- Security Notice -->
        <div class="mb-4">
          <div class="text-subtitle-1 mb-2">Security Confirmation</div>
          <div class="text-body-2 text-medium-emphasis mb-3">
            Account deletion requires typing the exact confirmation phrase below. This action is
            permanent and cannot be undone.
          </div>
        </div>

        <!-- Confirmation Input -->
        <div class="mb-4">
          <div class="text-subtitle-1 mb-2">Type "DELETE MY ACCOUNT" to confirm:</div>
          <v-text-field
            v-model="confirmationText"
            placeholder="DELETE MY ACCOUNT"
            variant="outlined"
            :error="confirmationError"
            :error-messages="confirmationError ? 'Please type exactly: DELETE MY ACCOUNT' : ''"
            @input="confirmationError = false"
          />
        </div>

        <!-- Error Display -->
        <v-alert v-if="deleteError" type="error" variant="tonal" class="mb-4">
          {{ deleteError }}
        </v-alert>
      </v-card-text>

      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn variant="text" :disabled="isDeleting" @click="closeDialog"> Cancel </v-btn>
        <v-btn
          color="error"
          variant="flat"
          :loading="isDeleting"
          :disabled="!canDelete || isDeleting"
          @click="deleteAccount"
        >
          Delete Account Forever
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Success Dialog - Teleported to body to persist after signout -->
  <teleport to="body">
    <v-dialog v-model="showSuccessDialog" max-width="500" persistent>
      <v-card>
        <v-card-title class="text-h5 text-success d-flex align-center">
          <v-icon class="mr-2" color="success">mdi-check-circle</v-icon>
          Account Deleted Successfully
        </v-card-title>

        <v-card-text class="pt-4">
          <div class="text-body-1 mb-3">
            Your account and all associated data have been permanently deleted.
          </div>
          <div class="text-body-2 text-medium-emphasis">
            Thank you for using TarkovTracker. You will be redirected to the dashboard.
          </div>
        </v-card-text>

        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn color="primary" variant="flat" @click="redirectToHome"> Go to Dashboard </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </teleport>
</template>

<script setup>
  import { ref, computed } from 'vue';

  // Disable automatic attribute inheritance since we handle it manually
  defineOptions({
    inheritAttrs: false,
  });
  import { useRouter } from 'vue-router';
  import { fireuser, auth, functions, httpsCallable } from '@/plugins/firebase';
  import { useLiveData } from '@/composables/livedata';
  import FittedCard from '@/features/ui/FittedCard.vue';
  import { logger } from '@/utils/logger';

  const router = useRouter();
  const { useTeamStore } = useLiveData();
  const { teamStore } = useTeamStore();

  // Reactive data
  const showConfirmationDialog = ref(false);
  const showSuccessDialog = ref(false);
  const confirmationText = ref('');
  const confirmationError = ref(false);
  const deleteError = ref('');
  const isDeleting = ref(false);
  const accountIdCopied = ref(false);

  // Computed properties
  const hasOwnedTeams = computed(() => {
    return teamStore.$state.team && teamStore.$state.team.owner === fireuser.uid;
  });

  const ownedTeamsCount = computed(() => {
    return hasOwnedTeams.value ? 1 : 0; // Assuming user can only own one team
  });

  const canDelete = computed(() => {
    return confirmationText.value === 'DELETE MY ACCOUNT';
  });

  const userEmail = computed(() => {
    // Debug logging to understand what's available
    logger.debug('Debug - fireuser:', {
      email: fireuser.email,
      uid: fireuser.uid,
      displayName: fireuser.displayName,
      loggedIn: fireuser.loggedIn,
    });

    logger.debug('Debug - auth.currentUser:', {
      email: auth.currentUser?.email,
      uid: auth.currentUser?.uid,
      displayName: auth.currentUser?.displayName,
      providerData: auth.currentUser?.providerData,
    });

    // Try fireuser.email first (standard approach)
    if (fireuser.email) {
      return fireuser.email;
    }

    // Fallback to auth.currentUser.email for OAuth providers
    if (auth.currentUser?.email) {
      return auth.currentUser.email;
    }

    // Check providerData for OAuth email (GitHub/Google)
    if (auth.currentUser?.providerData) {
      for (const provider of auth.currentUser.providerData) {
        if (provider.email) {
          return provider.email;
        }
      }
    }

    return 'No email available';
  });

  // Methods
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString();
  };

  const copyAccountId = async () => {
    try {
      await navigator.clipboard.writeText(fireuser.uid);
      accountIdCopied.value = true;
      setTimeout(() => {
        accountIdCopied.value = false;
      }, 2000);
    } catch (error) {
      logger.error('Failed to copy account ID:', error);
      // Fallback for older browsers
      try {
        const textArea = document.createElement('textarea');
        textArea.value = fireuser.uid;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        accountIdCopied.value = true;
        setTimeout(() => {
          accountIdCopied.value = false;
        }, 2000);
      } catch (fallbackError) {
        logger.error('Fallback copy also failed:', fallbackError);
      }
    }
  };

  const closeDialog = () => {
    showConfirmationDialog.value = false;
    confirmationText.value = '';
    confirmationError.value = false;
    deleteError.value = '';
  };

  const deleteAccount = async () => {
    if (!canDelete.value) {
      confirmationError.value = true;
      return;
    }

    isDeleting.value = true;
    deleteError.value = '';

    try {
      // Use Firebase callable function for account deletion
      const deleteUserAccountFn = httpsCallable(functions, 'deleteUserAccount');

      await deleteUserAccountFn({
        confirmationText: confirmationText.value,
      });

      // Success - show success dialog first, then sign out in the redirect function
      showConfirmationDialog.value = false;
      showSuccessDialog.value = true;
    } catch (error) {
      logger.error('Account deletion error:', error);

      if (error.code === 'functions/unauthenticated') {
        deleteError.value = 'Authentication required. Please refresh the page and try again.';
      } else if (error.code === 'functions/invalid-argument') {
        deleteError.value = 'Invalid confirmation text. Please type exactly: DELETE MY ACCOUNT';
      } else if (error.code === 'functions/permission-denied') {
        deleteError.value = 'Permission denied. Please refresh the page and try again.';
      } else {
        deleteError.value = error.message || 'Failed to delete account. Please try again.';
      }
    } finally {
      isDeleting.value = false;
    }
  };

  const redirectToHome = async () => {
    try {
      showSuccessDialog.value = false;
      logger.info('Signing out user and redirecting to dashboard...');

      // Clear ALL localStorage data before signing out
      localStorage.clear();

      // Sign out the user now that they've seen the success message
      await auth.signOut();

      // Navigate to dashboard
      await router.push('/');
      logger.info('Successfully signed out and redirected to dashboard');
    } catch (error) {
      logger.error('Failed to sign out and redirect:', error);
      // Fallback: force signout and navigate
      try {
        // Clear localStorage even on error
        localStorage.clear();
        await auth.signOut();
      } catch (signOutError) {
        logger.error('Signout failed:', signOutError);
      }
      window.location.href = '/';
    }
  };
</script>

<style scoped>
  .account-deletion-card {
    border: 1px solid rgb(var(--v-theme-error));
  }

  .account-deletion-card :deep(.v-card) {
    border-color: rgb(var(--v-theme-error));
  }

  ul {
    list-style-type: disc;
  }

  ul li {
    margin-bottom: 0.25rem;
  }
</style>
