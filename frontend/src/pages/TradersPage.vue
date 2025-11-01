<template>
  <div class="trader-page w-full min-h-screen p-6 bg-gray-800 flex flex-col items-center">
    <h1 class="text-2xl font-bold mb-4 text-center text-white">
      {{ t('Traders Level and Loyality') }}
    </h1>


    <div class="profile-note mb-6">
      Values apply to your PvP profile.
    </div>

    <!-- Ligne 1 : 6 cartes -->
    <div class="trader-row mb-4 justify-center">
      <v-card
        v-for="card in traderCards.slice(0,6)"
        :key="card.trader.id"
        variant="elevated"
        class="trader-card"
      >
        <div class="trader-card__header">
          <v-avatar size="56" class="trader-card__avatar mb-2">
            <v-img v-if="card.trader.imageLink" :src="card.trader.imageLink" />
            <v-icon v-else>mdi-account-tie</v-icon>
          </v-avatar>
          <div class="trader-card__title text-center">
            <div class="trader-card__name">{{ card.trader.name }}</div>
            <div class="trader-card__meta">
              <span v-if="card.loyaltyEditable">
                {{ t('drawer.trader_settings.level_range', { min: card.minLevel, max: card.maxLevel }) }}
              </span>
              <span v-else>
                {{ t('drawer.trader_settings.fixed_level', { value: card.level }) }}
              </span>
            </div>
          </div>
          <v-chip class="trader-card__current mt-2" size="small" color="primary" variant="flat">
            {{ t('drawer.trader_settings.current_level', { value: card.level }) }}
          </v-chip>
        </div>

        <div class="trader-card__body">
          <v-select
            v-if="card.loyaltyEditable"
            :model-value="card.level"
            :items="card.items"
            :label="t('drawer.trader_settings.loyalty_label')"
            density="compact"
            variant="outlined"
            hide-details
            class="w-full px-2"
            @update:model-value="(value) => handleLoyaltyChange(card, value)"
          />
          <div v-else class="trader-card__loyalty-chip mb-2 px-2">
            <v-chip size="small" color="surface-variant" variant="flat">
              {{ t('drawer.trader_settings.fixed_level_chip', { value: card.level }) }}
            </v-chip>
          </div>

          <v-text-field
            :model-value="standingValues[card.trader.id] ?? '0'"
            :label="t('drawer.trader_settings.standing_label')"
            type="number"
            step="0.01"
            density="compact"
            variant="outlined"
            hide-details
            prepend-inner-icon="mdi-thumb-up-outline"
            @focus="() => onStandingFocus(card.trader.id)"
            @blur="() => commitStanding(card)"
            @keyup.enter.prevent="commitStanding(card)"
            @update:model-value="(value) => onStandingInput(card.trader.id, value)"
            class="w-full px-2"
          />
        </div>
      </v-card>
    </div>

    <!-- Ligne 2 : 5 cartes -->
    <div class="trader-row justify-center">
      <v-card
        v-for="card in traderCards.slice(6)"
        :key="card.trader.id"
        variant="elevated"
        class="trader-card"
      >
        <div class="trader-card__header">
          <v-avatar size="56" class="trader-card__avatar mb-2">
            <v-img v-if="card.trader.imageLink" :src="card.trader.imageLink" />
            <v-icon v-else>mdi-account-tie</v-icon>
          </v-avatar>
          <div class="trader-card__title text-center">
            <div class="trader-card__name">{{ card.trader.name }}</div>
            <div class="trader-card__meta">
              <span v-if="card.loyaltyEditable">
                {{ t('drawer.trader_settings.level_range', { min: card.minLevel, max: card.maxLevel }) }}
              </span>
              <span v-else>
                {{ t('drawer.trader_settings.fixed_level', { value: card.level }) }}
              </span>
            </div>
          </div>
          <v-chip class="trader-card__current mt-2" size="small" color="primary" variant="flat">
            {{ t('drawer.trader_settings.current_level', { value: card.level }) }}
          </v-chip>
        </div>

        <div class="trader-card__body">
          <v-select
            v-if="card.loyaltyEditable"
            :model-value="card.level"
            :items="card.items"
            :label="t('drawer.trader_settings.loyalty_label')"
            density="compact"
            variant="outlined"
            hide-details
            class="w-full px-2"
            @update:model-value="(value) => handleLoyaltyChange(card, value)"
          />
          <div v-else class="trader-card__loyalty-chip mb-2 px-2">
            <v-chip size="small" color="surface-variant" variant="flat">
              {{ t('drawer.trader_settings.fixed_level_chip', { value: card.level }) }}
            </v-chip>
          </div>

          <v-text-field
            :model-value="standingValues[card.trader.id] ?? '0'"
            :label="t('drawer.trader_settings.standing_label')"
            type="number"
            step="0.01"
            density="compact"
            variant="outlined"
            hide-details
            prepend-inner-icon="mdi-thumb-up-outline"
            @focus="() => onStandingFocus(card.trader.id)"
            @blur="() => commitStanding(card)"
            @keyup.enter.prevent="commitStanding(card)"
            @update:model-value="(value) => onStandingInput(card.trader.id, value)"
            class="w-full px-2"
          />
        </div>
      </v-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue';
import { useI18n } from 'vue-i18n';
import { useTarkovStore } from '@/stores/tarkov';
import { useTarkovData } from '@/composables/tarkovdata';
import type { Trader } from '@/types/tarkov';

const { t } = useI18n({ useScope: 'global' });
const tarkovStore = useTarkovStore();
const { traders } = useTarkovData();

const TRADER_ORDER = ['Prapor','Therapist','Fence','Skier','Peacekeeper','Mechanic','Ragman','Jaeger','Ref','Lightkeeper','BTR Driver'];
const orderLookup = new Map(TRADER_ORDER.map((name,index)=>[name.toLowerCase(),index]));

const orderedTraders = computed(() => [...(traders.value||[])].sort((a,b)=>{
  const aIdx = orderLookup.get((a.name??'').toLowerCase())??Number.MAX_SAFE_INTEGER;
  const bIdx = orderLookup.get((b.name??'').toLowerCase())??Number.MAX_SAFE_INTEGER;
  return aIdx!==bIdx?aIdx-bIdx:(a.name??'').localeCompare(b.name??'');
}));

const FENCE_ID='579dc571d53a0658a154fbec';
const FENCE_LEVEL_MAX=4;
const FENCE_LEVEL_MIN=1;
const FENCE_LEVEL_THRESHOLD=6;
const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));

interface TraderCard{
  trader:Trader;
  level:number;
  minLevel:number;
  maxLevel:number;
  loyaltyEditable:boolean;
  items:{value:number; title:string}[];
}

const standingValues = reactive<Record<string,string>>({});

const traderCards = computed<TraderCard[]>(()=>{
  const standings = tarkovStore.getCurrentProgressData()?.traderStandings||{};
  return orderedTraders.value.map(trader=>{
    const isFence = trader.id===FENCE_ID;
    const levelValues = new Set<number>();
    (trader.levels||[]).forEach(e=>typeof e?.level==='number'&&levelValues.add(e.level));
    if(levelValues.size===0) levelValues.add(1);
    if(isFence){levelValues.clear(); levelValues.add(FENCE_LEVEL_MIN); levelValues.add(FENCE_LEVEL_MAX);}
    const allowedLevels = Array.from(levelValues).sort((a,b)=>a-b);
    const minLevel = allowedLevels[0]??1;
    const maxLevel = allowedLevels[allowedLevels.length-1]??minLevel;
    const entry = standings[trader.id];
    let storedLevel = typeof entry?.loyaltyLevel==='number'?Math.round(entry.loyaltyLevel):minLevel;
    let level = clamp(storedLevel,minLevel,maxLevel);
    if(isFence){
      const standing = typeof entry?.standing==='number'?entry.standing:0;
      level = standing>=FENCE_LEVEL_THRESHOLD||level>=FENCE_LEVEL_MAX?FENCE_LEVEL_MAX:FENCE_LEVEL_MIN;
    }
    const items = allowedLevels.map(l=>({
      value:l,
      title: l===0 ? t('drawer.trader_settings.loyalty_locked') : t('drawer.trader_settings.loyalty_value',{value:l})
    }));
    if(!(trader.id in standingValues)){
      standingValues[trader.id] = (entry?.standing??0).toFixed(2).replace(/\.00$/,'');
    }
    return {trader,level,minLevel,maxLevel,loyaltyEditable:allowedLevels.length>1||isFence,items};
  });
});

const handleLoyaltyChange = (card:TraderCard,value:unknown)=>{
  const numeric = Number(value);
  if(Number.isNaN(numeric)) return;
  const clamped = clamp(numeric, card.minLevel, card.maxLevel);
  card.level = clamped;
  tarkovStore.setTraderLoyaltyLevel(card.trader.id, clamped);
};

const onStandingFocus = (id:string)=>{ standingValues[id] = standingValues[id]; };
const onStandingInput = (id:string,value:string)=>{ standingValues[id] = value; };
const commitStanding = (card:TraderCard)=>{
  const parsed = parseFloat(standingValues[card.trader.id]??'0')||0;
  standingValues[card.trader.id] = parsed.toFixed(2).replace(/\.00$/,'');
  tarkovStore.setTraderStanding(card.trader.id, parsed);
};

const currentGameModeLabel = computed(()=> tarkovStore.getCurrentGameMode()==='pve'?t('drawer.trader_settings.mode_pve'):t('drawer.trader_settings.mode_pvp'));
</script>

<style scoped>
.trader-row {
  display: flex;
  flex-wrap: nowrap;
  gap: 16px;
  justify-content: center;
}
.trader-card {
  background: rgba(var(--v-theme-surface), 0.95) !important;
  border-radius: 12px;
  border: 1px solid rgba(var(--v-theme-on-surface),0.06);
  backdrop-filter: blur(4px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  width: 180px;
  padding: 8px;
  box-shadow: 0 3px 6px rgba(0,0,0,0.06);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.trader-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 12px rgba(0,0,0,0.12);
}
.trader-card__header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.trader-card__avatar {
  border: 1px solid rgba(var(--v-theme-on-surface),0.12);
  border-radius: 50%;
}
.trader-card__title {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.trader-card__name {
  font-weight: 600;
  font-size: 0.95rem;
  text-align: center;
}
.trader-card__meta {
  font-size: 0.7rem;
  opacity: 0.7;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  text-align: center;
}
.trader-card__current {
  font-size: 0.75rem;
  font-weight: 600;
  margin-bottom: 12px;
}
.trader-card__body {
  display: flex;
  flex-direction: column;
  gap: 15px;
  width: 100%;
  padding: 0 6px;
}
.trader-card__loyalty-chip {
  display: flex;
  justify-content: center;
  padding: 0 6px;
}
.profile-note {
  color: white;
  font-size: 1.125rem;
  font-weight: 600;
  text-align: center;
}
</style>
