<template>
  <v-row align="center" class="compact-row">
    <!-- View tabs -->
    <v-col cols="9" sm="8" md="9" lg="8">
      <v-card>
        <v-tabs
          v-model="activeView"
          bg-color="accent"
          slider-color="secondary"
          align-tabs="center"
          show-arrows
        >
          <v-tab
            v-for="(view, index) in views"
            :key="index"
            :value="view.view"
            :prepend-icon="view.icon"
            data-test="view-tab"
          >
            {{ view.title }}
          </v-tab>
        </v-tabs>
      </v-card>
    </v-col>

    <!-- Search input -->
    <v-col cols="3" sm="4" md="3" lg="3">
      <v-text-field
        v-model="searchText"
        label="Search by item name"
        variant="solo"
        hide-details
        density="comfortable"
        :append-inner-icon="searchText ? 'mdi-close-circle' : ''"
        data-test="search-input"
        @click:append-inner="clearSearch"
      ></v-text-field>
    </v-col>

    <!-- Settings button -->
    <v-col cols="3" sm="2" md="1" lg="1">
      <v-dialog v-model="settingsDialogOpen" scrim="#9A8866" data-test="settings-dialog">
        <template #activator="{ props }">
          <v-btn
            v-bind="props"
            variant="tonal"
            style="width: 100%; height: 48px"
            class="px-0"
            data-test="settings-button"
          >
            <v-icon>mdi-cog</v-icon>
          </v-btn>
        </template>
        <v-row class="justify-center">
          <v-col cols="auto">
            <v-card :title="$t('page.neededitems.options.title')" style="width: fit-content">
              <v-card-text>
                <v-container class="ma-0 pa-0">
                  <v-row class="compact-row">
                    <!-- Layout style -->
                    <v-col cols="12">
                      <v-btn-toggle v-model="itemStyle" rounded="0" group variant="outlined">
                        <v-btn value="mediumCard" icon="mdi-view-grid"> </v-btn>
                        <v-btn value="smallCard" icon="mdi-view-comfy"> </v-btn>
                        <v-btn value="row" icon="mdi-view-sequential"> </v-btn>
                      </v-btn-toggle>
                    </v-col>

                    <!-- Visibility toggles -->
                    <v-col cols="12">
                      <v-switch
                        v-model="hideFIR"
                        :label="$t(hideFIRLabel)"
                        inset
                        true-icon="mdi-eye-off"
                        false-icon="mdi-eye"
                        :color="hideFIRColor"
                        hide-details
                        density="compact"
                      ></v-switch>

                      <v-switch
                        v-model="itemsHideAll"
                        :label="$t(itemsHideAllLabel)"
                        inset
                        true-icon="mdi-eye-off"
                        false-icon="mdi-eye"
                        :color="itemsHideAllColor"
                        hide-details
                        density="compact"
                      ></v-switch>

                      <v-switch
                        v-model="itemsHideNonFIR"
                        :disabled="itemsHideAll"
                        :label="$t(itemsHideNonFIRLabel)"
                        inset
                        true-icon="mdi-eye-off"
                        false-icon="mdi-eye"
                        :color="itemsHideNonFIRColor"
                        hide-details
                        density="compact"
                      ></v-switch>

                      <v-switch
                        v-model="itemsHideHideout"
                        :disabled="itemsHideAll"
                        :label="$t(itemsHideHideoutLabel)"
                        inset
                        true-icon="mdi-eye-off"
                        false-icon="mdi-eye"
                        :color="itemsHideHideoutColor"
                        hide-details
                        density="compact"
                      ></v-switch>
                    </v-col>
                  </v-row>
                  <v-row justify="end">
                    <v-col cols="12" md="6">
                      <v-btn color="primary" block @click="closeSettings">
                        {{ $t('page.neededitems.options.close') }}
                      </v-btn>
                    </v-col>
                  </v-row>
                </v-container>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-dialog>
    </v-col>
  </v-row>
</template>

<script setup lang="ts">
  import { ref, computed } from 'vue';
  import { useNeededItems } from '@/composables/useNeededItems';
  import { useNeededItemsSettings } from '@/composables/useNeededItemsSettings';

  interface NeededItemsView {
    title: string;
    icon: string;
    view: 'all' | 'tasks' | 'hideout';
  }

  const props = defineProps<{
    views: NeededItemsView[];
    searchText: string;
    activeView: string;
  }>();

  const emit = defineEmits<{
    'update:searchText': [value: string];
    'update:activeView': [value: string];
  }>();

  // State
  const settingsDialogOpen = ref(false);

  // Composables
  const { clearItemFilterNameText } = useNeededItems();

  const {
    neededItemsStyle,
    hideFIR,
    hideFIRLabel,
    hideFIRColor,
    itemsHideAll,
    itemsHideAllLabel,
    itemsHideAllColor,
    itemsHideNonFIR,
    itemsHideNonFIRLabel,
    itemsHideNonFIRColor,
    itemsHideHideout,
    itemsHideHideoutLabel,
    itemsHideHideoutColor,
  } = useNeededItemsSettings();

  // Computed properties with two-way binding
  const searchText = computed({
    get: () => props.searchText,
    set: (value) => emit('update:searchText', value),
  });

  const activeView = computed({
    get: () => props.activeView,
    set: (value) => emit('update:activeView', value),
  });

  const itemStyle = computed({
    get: () => neededItemsStyle.value,
    set: (value) => {
      neededItemsStyle.value = value;
    },
  });

  // Methods
  const clearSearch = () => {
    clearItemFilterNameText();
  };

  const closeSettings = () => {
    settingsDialogOpen.value = false;
  };
</script>

<style lang="scss" scoped>
  .compact-row {
    --v-layout-column-gap: 12px;
    --v-layout-row-gap: 12px;
  }
</style>
