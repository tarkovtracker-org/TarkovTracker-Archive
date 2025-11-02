import { computed, ref, watch, nextTick } from 'vue';
import { defineStore } from 'pinia';
import {
  doc,
  collection,
  onSnapshot,
  type DocumentData,
  type Unsubscribe,
} from 'firebase/firestore';
import { fireuser, firestore } from '@/plugins/firebase';
import { useFirebaseListener } from '@/composables/firebase/useFirebaseListener';
import { useSystemStoreWithFirebase } from './useSystemStore';
import type { TeamState, TeamGetters } from '@/types/tarkov';
import type { Store } from 'pinia';
import type { UserState } from '@/shared_state';
import { logger } from '@/utils/logger';

/**
 * Team store definition with getters for team info and members
 */
export const useTeamStore = defineStore<string, TeamState, TeamGetters>('team', {
  state: (): TeamState => ({}),
  getters: {
    teamOwner(state) {
      return state?.owner || null;
    },
    isOwner(state) {
      const owner = state.owner;
      return owner === fireuser.uid;
    },
    teamPassword(state) {
      return state?.password || null;
    },
    teamMembers(state) {
      return state?.members || [];
    },
    teammates(state) {
      const currentMembers = state?.members;
      const currentFireUID = fireuser?.uid;

      if (currentMembers && currentFireUID) {
        return currentMembers.filter((member) => member !== currentFireUID);
      }

      return [];
    },
  },
});

/**
 * Composable that manages the team store with Firebase synchronization
 */
export function useTeamStoreWithFirebase() {
  const { systemStore } = useSystemStoreWithFirebase();
  const teamStore = useTeamStore();
  const teamUnsubscribe = ref(null);

  // Computed reference to the team document based on system store
  const teamRef = computed(() => {
    const currentSystemStateTeam = systemStore.$state.team;

    if (fireuser.loggedIn && currentSystemStateTeam && typeof currentSystemStateTeam === 'string') {
      return doc(collection(firestore, 'team'), currentSystemStateTeam);
    }

    return null;
  });

  const handleTeamSnapshot = (_data: DocumentData | null) => {};

  // Setup Firebase listener
  const { cleanup, isSubscribed } = useFirebaseListener({
    store: teamStore,
    docRef: teamRef,
    unsubscribe: teamUnsubscribe,
    storeId: 'team',
    onSnapshot: handleTeamSnapshot,
  });

  return {
    teamStore,
    teamRef,
    isSubscribed,
    cleanup,
  };
}

/**
 * Composable for managing teammate stores dynamically
 */
export function useTeammateStores() {
  const { teamStore } = useTeamStoreWithFirebase();
  const teammateStores = ref<Record<string, Store<string, UserState>>>({});
  const teammateUnsubscribes = ref<Record<string, Unsubscribe>>({});

  // Watch team state changes to manage teammate stores
  watch(
    () => teamStore.$state,
    async (newState, _oldState) => {
      await nextTick();

      const currentFireUID = fireuser?.uid;
      const newTeammatesArray =
        newState.members?.filter((member: string) => member !== currentFireUID) || [];

      // Remove stores for teammates no longer in the team
      for (const teammate of Object.keys(teammateStores.value)) {
        if (!newTeammatesArray.includes(teammate)) {
          if (teammateUnsubscribes.value[teammate]) {
            teammateUnsubscribes.value[teammate]();
            delete teammateUnsubscribes.value[teammate];
          }

          delete teammateStores.value[teammate];
        }
      }

      // Add stores for new teammates
      try {
        for (const teammate of newTeammatesArray) {
          if (!teammateStores.value[teammate]) {
            await createTeammateStore(teammate);
          }
        }
      } catch (error) {
        logger.error('Error managing teammate stores:', error);
      }
    },
    {
      immediate: true,
      deep: true,
    }
  );

  // Create a store for a specific teammate
  const createTeammateStore = async (teammateId: string) => {
    try {
      // Import required dependencies
      const { defineStore } = await import('pinia');
      const { getters, actions, defaultState } = await import('@/shared_state');

      // Define the teammate store
      const storeDefinition = defineStore(`teammate-${teammateId}`, {
        state: () => JSON.parse(JSON.stringify(defaultState)),
        getters: getters,
        actions: actions,
      });

      const storeInstance = storeDefinition();
      teammateStores.value[teammateId] = storeInstance;

      // Setup Firebase listener for this teammate
      teammateUnsubscribes.value[teammateId] = onSnapshot(
        doc(firestore, 'progress', teammateId),
        (snapshot) => {
          const firestoreDocData = snapshot.data();
          const docExists = snapshot.exists();

          if (docExists && firestoreDocData) {
            storeInstance.$patch(firestoreDocData);
          } else {
            storeInstance.$patch(JSON.parse(JSON.stringify(defaultState)));
          }
        },
        (error) => {
          if (error.code === 'permission-denied' && teammateUnsubscribes.value[teammateId]) {
            teammateUnsubscribes.value[teammateId]();
            delete teammateUnsubscribes.value[teammateId];
          } else {
            logger.error(`Error in teammate ${teammateId} listener:`, error);
          }
        }
      );
    } catch (error) {
      logger.error(`Error creating store for teammate ${teammateId}:`, error);
    }
  };

  // Cleanup all teammate stores
  const cleanup = () => {
    Object.values(teammateUnsubscribes.value).forEach((unsubscribe) => {
      if (unsubscribe) unsubscribe();
    });
    teammateUnsubscribes.value = {};
    teammateStores.value = {};
  };

  return {
    teammateStores,
    teammateUnsubscribes,
    cleanup,
  };
}
