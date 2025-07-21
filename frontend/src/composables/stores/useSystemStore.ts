import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { doc, collection } from 'firebase/firestore';
import { fireuser, firestore } from '@/plugins/firebase';
import { useFirebaseListener } from '@/composables/firebase/useFirebaseListener';
import type { SystemState, SystemGetters } from '@/types/tarkov';

/**
 * System store definition with getters for user tokens and team info
 */
export const useSystemStore = defineStore<string, SystemState, SystemGetters>('system', {
  state: (): SystemState => ({}),
  getters: {
    userTokens(state) {
      return state?.tokens || [];
    },
    userTokenCount(state) {
      return state?.tokens?.length || 0;
    },
    userTeam(state) {
      return state.team || null;
    },
    userTeamIsOwn(state) {
      return state?.team === fireuser?.uid || false;
    },
  },
});

/**
 * Composable that manages the system store with Firebase synchronization
 */
export function useSystemStoreWithFirebase() {
  const systemStore = useSystemStore();
  const systemUnsubscribe = ref(null);

  // Computed reference to the system document
  const systemRef = computed(() => {
    if (fireuser.loggedIn) {
      return doc(collection(firestore, 'system'), fireuser.uid as string);
    }
    return null;
  });

  // Setup Firebase listener
  const { cleanup, isSubscribed } = useFirebaseListener({
    store: systemStore,
    docRef: systemRef,
    unsubscribe: systemUnsubscribe,
    storeId: 'system',
  });

  return {
    systemStore,
    systemRef,
    isSubscribed,
    cleanup,
  };
}
