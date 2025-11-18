import { computed, ref, watch } from 'vue';
import { useTarkovStore } from '@/stores/tarkov';
import { usePlayerLevelData } from '@/composables/data/useMapData';
import { fireuser } from '@/plugins/firebase';

// Define factions as constants since they're not dynamic
const FACTIONS = {
  USEC: { id: 'USEC', name: 'USEC', color: '#4CAF50' },
  BEAR: { id: 'BEAR', name: 'BEAR', color: '#F44336' },
};

export function useUserLevel() {
  const tarkovStore = useTarkovStore();
  const { maxPlayerLevel } = usePlayerLevelData();

  // State for editing
  const isEditing = ref(false);
  const editValue = ref(0);
  const editMenuOpen = ref(false);

  // Computed properties
  const userLevel = computed(() => tarkovStore.playerLevel());
  const factions = computed(() => FACTIONS);
  const maxLevel = computed(() => maxPlayerLevel.value);
  const factionId = computed(() => tarkovStore.getPMCFaction());
  // Current faction and display
  const currentFaction = computed(() => {
    if (!factions.value || !factionId.value) return null;
    return factions.value[factionId.value];
  });
  const factionName = computed(() => {
    return currentFaction.value?.name ?? 'Unknown';
  });
  const factionColor = computed(() => {
    return currentFaction.value?.color ?? 'white';
  });
  // Level validation
  const validLevels = computed(() => {
    if (!maxLevel.value) return [];
    return Array.from({ length: maxLevel.value }, (_, i) => i + 1);
  });
  // Methods
  function startEditing() {
    if (!userLevel.value) return;
    isEditing.value = true;
    editValue.value = userLevel.value;
  }
  function cancelEditing() {
    isEditing.value = false;
    editValue.value = 0;
  }
  function confirmLevelChange() {
    if (!fireuser.uid) return;
    try {
      // Use tarkovStore.setLevel which should handle the level update
      tarkovStore.setLevel(editValue.value);
      isEditing.value = false;
      editMenuOpen.value = false;
    } catch (error) {
      console.error('Failed to update level:', error);
    }
  }
  // Auto-close edit menu when clicking outside
  watch(editMenuOpen, (isOpen) => {
    if (!isOpen) {
      cancelEditing();
    }
  });
  return {
    // State
    isEditing,
    editValue,
    editMenuOpen,
    // Computed
    userLevel,
    factions,
    maxLevel,
    currentFaction,
    factionName,
    factionColor,
    validLevels,
    // Methods
    startEditing,
    cancelEditing,
    confirmLevelChange,
  };
}
