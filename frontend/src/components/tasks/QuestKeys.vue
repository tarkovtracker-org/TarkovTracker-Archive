<template>
  <v-row no-gutters>
    <v-col cols="auto" class="py-1">
      <v-sheet class="pa-1 rounded-lg" color="accent">
        <div
          v-for="(keyMap, keyMapIndex) in neededKeys"
          :key="keyMapIndex"
          class="d-flex align-center my-1"
        >
          <i18n-t
            keypath="page.tasks.questcard.keysneeded"
            :plural="keyMap.keys.length"
            scope="global"
          >
            <template #keys>
              <span
                v-for="(key, keyIndex) in keyMap.keys"
                :key="keyIndex"
                class="d-inline-block"
              >
                <tarkov-item
                  :item-id="key.id"
                  :item-name="key.shortName"
                  :dev-link="key.link"
                  :wiki-link="key.wikiLink"
                  :count="1"
                  class="mr-2"
                />
              </span>
            </template>
            <template #map>
              {{ keyMap.map.name }}
            </template>
          </i18n-t>
        </div>
      </v-sheet>
    </v-col>
  </v-row>
</template>

<script setup>
import { defineAsyncComponent } from 'vue'

const TarkovItem = defineAsyncComponent(() => import('@/components/game/TarkovItem'))

defineProps({
  neededKeys: { type: Array, required: true }
})
</script>