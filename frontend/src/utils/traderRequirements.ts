const METHOD_ALIASES: Record<string, ComparatorKey> = {
  '>': '>',
  greaterthan: '>',
  gt: '>',
  '>=': '>=',
  greaterorequal: '>=',
  ge: '>=',
  gte: '>=',
  '<': '<',
  lessthan: '<',
  lt: '<',
  '<=': '<=',
  lessorequal: '<=',
  le: '<=',
  lte: '<=',
  '=': '=',
  '==': '=',
  eq: '=',
  equals: '=',
};

type ComparatorKey = '>' | '>=' | '<' | '<=' | '=';

const COMPARATORS: Record<ComparatorKey, (current: number, target: number) => boolean> = {
  '>': (current, target) => current > target,
  '>=': (current, target) => current >= target,
  '<': (current, target) => current < target,
  '<=': (current, target) => current <= target,
  '=': (current, target) => current === target,
};

const OPERATOR_SYMBOLS: Record<ComparatorKey, string> = {
  '>': '>',
  '>=': '≥',
  '<': '<',
  '<=': '≤',
  '=': '=',
};

export function standingComparator(
  current: number,
  compareMethod: string | undefined,
  target: number
): boolean {
  const normalisedMethod = normaliseMethod(compareMethod);
  return COMPARATORS[normalisedMethod](normaliseNumber(current), normaliseNumber(target));
}

export function formatStandingOperator(compareMethod: string | undefined): string {
  const normalisedMethod = normaliseMethod(compareMethod);
  return OPERATOR_SYMBOLS[normalisedMethod];
}

function normaliseMethod(method: string | undefined): ComparatorKey {
  if (!method) {
    return '>=';
  }
  const resolved = METHOD_ALIASES[method.toLowerCase()];
  return resolved ?? '>=';
}

function normaliseNumber(value: number): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}
