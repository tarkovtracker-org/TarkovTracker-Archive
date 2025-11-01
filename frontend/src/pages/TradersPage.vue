<template>
  <v-container class="py-6">
    <v-row>
      <v-col cols="12" md="8" class="mx-auto">
        <v-alert type="info" variant="tonal" density="compact" class="trader-mode-alert mb-4">
          {{ t('drawer.trader_settings.mode_hint', { mode: currentGameModeLabel }) }}
        </v-alert>

        <v-card
          v-for="card in traderCards"
          :key="card.trader.id"
          variant="elevated"
          class="trader-card mb-4"
        >
          <div class="trader-card__header">
            <v-avatar size="42" class="trader-card__avatar">
              <v-img v-if="card.trader.imageLink" :src="card.trader.imageLink" />
              <v-icon v-else>mdi-account-tie</v-icon>
            </v-avatar>

            <div class="trader-card__title">
              <span class="trader-card__name">{{ card.trader.name }}</span>
              <span v-if="card.loyaltyEditable" class="trader-card__meta">
                {{
                  t('drawer.trader_settings.level_range', {
                    min: card.minLevel,
                    max: card.maxLevel,
                  })
                }}
              </span>
              <span v-else class="trader-card__meta">
                {{ t('drawer.trader_settings.fixed_level', { value: card.level }) }}
              </span>
            </div>

            <v-chip class="trader-card__current" size="small" color="primary" variant="flat">
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
              @update:model-value="(value) => handleLoyaltyChange(card, value)"
            />

            <div v-else class="trader-card__loyalty-chip">
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
            />
          </div>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { computed, reactive, watchEffect } from 'vue';
import { useI18n } from 'vue-i18n';
import { useTarkovStore } from '@/stores/tarkov';
import { useTarkovData } from '@/composables/tarkovdata';
import type { Trader } from '@/types/tarkov';

const { t } = useI18n({ useScope: 'global' });
const tarkovStore = useTarkovStore();
const { traders } = useTarkovData();

const TRADER_ORDER = [
  'Prapor',
  'Therapist',
  'Fence',
  'Skier',
  'Peacekeeper',
  'Mechanic',
  'Ragman',
  'Jaeger',
  'Ref',
  'Lightkeeper',
  'BTR Driver',
];

const orderLookup = new Map(TRADER_ORDER.map((name, index) => [name.toLowerCase(), index]));

const orderedTraders = computed(() => {
  return [...(traders.value || [])].sort((a, b) => {
    const aName = a?.name ?? '';
    const bName = b?.name ?? '';
    const aIdx = orderLookup.get(aName.toLowerCase()) ?? Number.MAX_SAFE_INTEGER;
    const bIdx = orderLookup.get(bName.toLowerCase()) ?? Number.MAX_SAFE_INTEGER;
    if (aIdx !== bIdx) {
      return aIdx - bIdx;
    }
    return aName.localeCompare(bName);
  });
});

const currentProgress = computed(() => {
  if (typeof tarkovStore.getCurrentProgressData === 'function') {
    return tarkovStore.getCurrentProgressData();
  }
  return null;
});

const FENCE_ID = '579dc571d53a0658a154fbec';
const FENCE_LEVEL_MAX = 4;
const FENCE_LEVEL_MIN = 1;
const FENCE_LEVEL_THRESHOLD = 6;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

interface TraderCard {
  trader: Trader;
  items: { value: number; title: string }[];
  minLevel: number;
  maxLevel: number;
  level: number;
  isFence: boolean;
  loyaltyEditable: boolean;
  allowedLevels: number[];
}

const traderCards = computed<TraderCard[]>(() => {
  const standings = currentProgress.value?.traderStandings || {};
  return orderedTraders.value.map((trader) => {
    const isFence = trader.id === FENCE_ID;
    const levelValues = new Set<number>();
    (trader.levels || []).forEach((entry) => {
      if (typeof entry?.level === 'number') {
        levelValues.add(entry.level);
      }
    });
    if (levelValues.size === 0) {
      levelValues.add(1);
    }
    if (isFence) {
      levelValues.clear();
      levelValues.add(FENCE_LEVEL_MIN);
      levelValues.add(FENCE_LEVEL_MAX);
    }
    const allowedLevels = Array.from(levelValues).sort((a, b) => a - b);
    const minLevel = allowedLevels[0] ?? 1;
    const maxLevel = allowedLevels[allowedLevels.length - 1] ?? minLevel;
    const items = allowedLevels.map((level) => ({
      value: level,
      title:
        level === 0
          ? t('drawer.trader_settings.loyalty_locked')
          : t('drawer.trader_settings.loyalty_value', { value: level }),
    }));
    const entry = standings[trader.id];
    let storedLevel =
      typeof entry?.loyaltyLevel === 'number' ? Math.round(entry.loyaltyLevel) : undefined;
    if (!allowedLevels.includes(storedLevel ?? NaN)) {
      storedLevel = undefined;
    }
    let computedLevel = clamp(storedLevel ?? minLevel, minLevel, maxLevel);
    if (isFence) {
      const currentStanding = typeof entry?.standing === 'number' ? entry.standing : 0;
      if (currentStanding >= FENCE_LEVEL_THRESHOLD || computedLevel >= FENCE_LEVEL_MAX) {
        computedLevel = FENCE_LEVEL_MAX;
      } else {
        computedLevel = FENCE_LEVEL_MIN;
      }
    }
    const loyaltyEditable = isFence ? true : items.length > 1;
    return {
      trader,
      items,
      minLevel,
      maxLevel,
      level: computedLevel,
      isFence,
      loyaltyEditable,
      allowedLevels,
    };
  });
});

watchEffect(() => {
  traderCards.value.forEach((card) => {
    const currentLevel = tarkovStore.getTraderLoyaltyLevel(card.trader.id);
    const currentStanding = tarkovStore.getTraderStanding(card.trader.id);
    if (card.isFence) {
      const shouldBeLevel4 =
        currentStanding >= FENCE_LEVEL_THRESHOLD || currentLevel >= FENCE_LEVEL_MAX;
      if (shouldBeLevel4) {
        if (currentLevel !== FENCE_LEVEL_MAX) {
          tarkovStore.setTraderLoyaltyLevel(card.trader.id, FENCE_LEVEL_MAX);
        }
        if (currentStanding < FENCE_LEVEL_THRESHOLD) {
          tarkovStore.setTraderStanding(card.trader.id, FENCE_LEVEL_THRESHOLD);
        }
      } else if (currentLevel !== FENCE_LEVEL_MIN) {
        tarkovStore.setTraderLoyaltyLevel(card.trader.id, FENCE_LEVEL_MIN);
      }
    } else {
      const normalizedLevel = clamp(Math.round(currentLevel), card.minLevel, card.maxLevel);
      if (normalizedLevel !== currentLevel) {
        tarkovStore.setTraderLoyaltyLevel(card.trader.id, normalizedLevel);
      }
    }
  });
});

const standingValues = reactive<Record<string, string>>({});
const editingStanding = reactive<Record<string, boolean>>({});

const formatStanding = (value: number) => {
  if (!Number.isFinite(value)) return '0';
  const fixed = value.toFixed(2);
  return fixed.replace(/\.00$/, '');
};

watchEffect(() => {
  traderCards.value.forEach((card) => {
    if (editingStanding[card.trader.id]) return;
    const stored = tarkovStore.getTraderStanding(card.trader.id);
    standingValues[card.trader.id] = formatStanding(stored);
  });
});

const snapToAllowedLevel = (allowedLevels: number[], target: number) => {
  if (!allowedLevels.length) return target;
  return allowedLevels.reduce(
    (closest, level) => (Math.abs(level - target) < Math.abs(closest - target) ? level : closest),
    allowedLevels[0]!
  );
};

const handleLoyaltyChange = (card: TraderCard, value: unknown) => {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return;
  const snapped = snapToAllowedLevel(card.allowedLevels, Math.round(numeric));
  if (card.isFence) {
    if (snapped >= FENCE_LEVEL_MAX) {
      tarkovStore.setTraderLoyaltyLevel(card.trader.id, FENCE_LEVEL_MAX);
      const currentStanding = tarkovStore.getTraderStanding(card.trader.id);
      if (currentStanding < FENCE_LEVEL_THRESHOLD) {
        tarkovStore.setTraderStanding(card.trader.id, FENCE_LEVEL_THRESHOLD);
        standingValues[card.trader.id] = formatStanding(FENCE_LEVEL_THRESHOLD);
      }
    } else {
      tarkovStore.setTraderLoyaltyLevel(card.trader.id, FENCE_LEVEL_MIN);
      const currentStanding = tarkovStore.getTraderStanding(card.trader.id);
      if (currentStanding >= FENCE_LEVEL_THRESHOLD) {
        const reduced = Math.min(currentStanding, FENCE_LEVEL_THRESHOLD - 0.01);
        tarkovStore.setTraderStanding(card.trader.id, reduced);
        standingValues[card.trader.id] = formatStanding(reduced);
      }
    }
    return;
  }
  const clamped = clamp(snapped, card.minLevel, card.maxLevel);
  tarkovStore.setTraderLoyaltyLevel(card.trader.id, clamped);
};

const onStandingFocus = (traderId: string) => {
  editingStanding[traderId] = true;
};

const onStandingInput = (traderId: string, value: string) => {
  standingValues[traderId] = value;
};

const commitStanding = (card: TraderCard) => {
  const traderId = card.trader.id;
  const raw = standingValues[traderId];
  const numeric = Number.parseFloat(raw);
  const parsed = Number.isFinite(numeric) ? numeric : 0;
  if (card.isFence) {
    if (parsed >= FENCE_LEVEL_THRESHOLD) {
      tarkovStore.setTraderStanding(traderId, parsed);
      if (tarkovStore.getTraderLoyaltyLevel(traderId) !== FENCE_LEVEL_MAX) {
        tarkovStore.setTraderLoyaltyLevel(traderId, FENCE_LEVEL_MAX);
      }
    } else {
      tarkovStore.setTraderStanding(traderId, parsed);
      if (tarkovStore.getTraderLoyaltyLevel(traderId) !== FENCE_LEVEL_MIN) {
        tarkovStore.setTraderLoyaltyLevel(traderId, FENCE_LEVEL_MIN);
      }
    }
  } else {
    tarkovStore.setTraderStanding(traderId, parsed);
  }
  editingStanding[traderId] = false;
  standingValues[traderId] = formatStanding(tarkovStore.getTraderStanding(traderId));
};

const currentGameModeLabel = computed(() =>
  tarkovStore.getCurrentGameMode() === 'pve'
    ? t('drawer.trader_settings.mode_pve')
    : t('drawer.trader_settings.mode_pvp')
);
</script>

<style scoped>
.trader-card {
  padding: 16px;
  border-radius: 12px;
  background: rgba(var(--v-theme-surface), 0.95) !important;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  backdrop-filter: blur(8px);
}

.trader-card__header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.trader-card__avatar {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
}

.trader-card__name {
  font-weight: 600;
  font-size: 1rem;
}

.trader-card__meta {
  font-size: 0.75rem;
  opacity: 0.7;
}

.trader-card__body {
  display: grid;
  gap: 12px;
}

.trader-mode-alert {
  background: rgba(var(--v-theme-primary), 0.12) !important;
  border: 1px solid rgba(var(--v-theme-primary), 0.25);
  color: rgba(var(--v-theme-primary), 0.9);
}
</style>
