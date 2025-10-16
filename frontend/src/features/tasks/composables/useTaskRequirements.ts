import { computed, type Ref } from 'vue';
import { useTarkovStore } from '@/stores/tarkov';
import type { Task, TaskObjective } from '@/types/tarkov';
import { standingComparator, formatStandingOperator } from '@/utils/traderRequirements';

interface TraderRequirementSummary {
  id: string;
  name: string;
  required: number;
  current: number;
  met: boolean;
}

interface TraderStandingSummary {
  id: string;
  name: string;
  required: number;
  current: number;
  operator: string;
  met: boolean;
}

export function useTaskRequirements(task: Ref<Task>) {
  const tarkovStore = useTarkovStore();
  const traderLoyaltyRequirements = computed<TraderRequirementSummary[]>(() =>
    parseTraderRequirements(task.value, tarkovStore)
  );
  const traderStandingRequirements = computed<TraderStandingSummary[]>(() =>
    parseStandingRequirements(task.value, tarkovStore)
  );
  return {
    traderLoyaltyRequirements,
    traderStandingRequirements,
  };
}
function parseTraderRequirements(task: Task, tarkovStore: ReturnType<typeof useTarkovStore>) {
  if (!task) return [];
  const requirementMap = new Map<string, TraderRequirementSummary>();
  collectLevelRequirements(task.traderLevelRequirements, requirementMap);
  collectLegacyRequirements(task.traderRequirements, requirementMap);
  collectObjectiveLevelRequirements(task.objectives, requirementMap);
  return Array.from(requirementMap.values())
    .map((requirement) => {
      const raw = Number(tarkovStore.getTraderLoyaltyLevel(requirement.id));
      const current = clampNumber(Number.isFinite(raw) ? Math.round(raw) : 0, 0, 10);
      return {
        ...requirement,
        current,
        met: current >= requirement.required,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}
function collectLevelRequirements(
  requirements: Task['traderLevelRequirements'] | undefined,
  requirementMap: Map<string, TraderRequirementSummary>
) {
  for (const requirement of requirements || []) {
    const traderId = requirement?.trader?.id;
    if (!traderId) continue;
    const required = clampRequirementLevel(requirement?.level);
    mergeRequirement(requirementMap, traderId, requirement?.trader?.name, required);
  }
}
function collectLegacyRequirements(
  requirements: Task['traderRequirements'] | undefined,
  requirementMap: Map<string, TraderRequirementSummary>
) {
  for (const requirement of requirements || []) {
    const traderId = requirement?.trader?.id;
    if (!traderId) continue;
    const required = clampRequirementLevel(requirement?.value);
    mergeRequirement(requirementMap, traderId, requirement?.trader?.name, required);
  }
}
function collectObjectiveLevelRequirements(
  objectives: TaskObjective[] | undefined,
  requirementMap: Map<string, TraderRequirementSummary>
) {
  if (!Array.isArray(objectives)) return;
  objectives.filter(isMandatoryTraderLevelObjective).forEach((objective) => {
    const traderId = objective.trader?.id;
    if (!traderId) return;
    const required = clampRequirementLevel(objective.level);
    mergeRequirement(requirementMap, traderId, objective.trader?.name, required);
  });
}
function mergeRequirement(
  requirementMap: Map<string, TraderRequirementSummary>,
  traderId: string,
  displayName: string | undefined,
  required: number
) {
  const existing = requirementMap.get(traderId);
  if (!existing || required > existing.required) {
    requirementMap.set(traderId, {
      id: traderId,
      name: displayName || traderId,
      required,
      current: 0,
      met: false,
    });
  }
}
function parseStandingRequirements(task: Task, tarkovStore: ReturnType<typeof useTarkovStore>) {
  const objectives = Array.isArray(task?.objectives) ? task.objectives : [];
  return objectives
    .filter(isMandatoryStandingObjective)
    .map((objective) => createStandingSummary(objective, tarkovStore))
    .sort((a, b) => a.name.localeCompare(b.name));
}
function clampRequirementLevel(level: unknown): number {
  const num = Number(level);
  if (!Number.isFinite(num)) return 0;
  return clampNumber(Math.floor(num), 0, 10);
}
function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
function isMandatoryTraderLevelObjective(
  objective: TaskObjective | undefined
): objective is TaskObjective {
  return Boolean(objective && objective.type === 'traderLevel' && objective.optional !== true);
}
function isMandatoryStandingObjective(
  objective: TaskObjective | undefined
): objective is TaskObjective {
  return Boolean(objective && objective.type === 'traderStanding' && objective.optional !== true);
}
function createStandingSummary(
  objective: TaskObjective,
  tarkovStore: ReturnType<typeof useTarkovStore>
) {
  const traderId = objective.trader?.id ?? '';
  const required = clampNumber(Number(objective.value) || 0, -10, 10);
  const currentRaw = traderId ? Number(tarkovStore.getTraderStanding(traderId)) : 0;
  const current = clampNumber(Number.isFinite(currentRaw) ? currentRaw : 0, -10, 10);
  const compareMethod = objective.compareMethod;
  return {
    id: objective.id ?? traderId,
    name: objective.trader?.name || traderId || 'Trader',
    required,
    current,
    operator: formatStandingOperator(compareMethod),
    met: standingComparator(current, compareMethod, required),
  };
}
