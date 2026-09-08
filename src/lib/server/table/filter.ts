function isString(value: unknown) {
  return typeof value === 'string';
}

function isNumber(value: unknown) {
  return typeof value === 'number';
}

export type FilterBy = keyof typeof filter;

export type FilterSchema = {
  key: string;
  value: unknown;
  by: FilterBy;
};

export const filter = {
  'eq': (value: unknown, target: unknown) => value === target,
  'neq': (value: unknown, target: unknown) => value !== target,
  'gt': (value: unknown, target: unknown) => isNumber(value) && isNumber(target) && value > target,
  'gte': (value: unknown, target: unknown) => isNumber(value) && isNumber(target) && value >= target,
  'lt': (value: unknown, target: unknown) => isNumber(value) && isNumber(target) && value < target,
  'lte': (value: unknown, target: unknown) => isNumber(value) && isNumber(target) && value <= target,
  'in': (value: unknown, target: unknown) => isString(value) && isString(target) && target.includes(value),
  'nin': (value: unknown, target: unknown) => isString(value) && isString(target) && !target.includes(value),
  'start': (value: unknown, target: unknown) => isString(value) && isString(target) && value.startsWith(target),
  'end': (value: unknown, target: unknown) => isString(value) && isString(target) && value.endsWith(target)
} as const;

export function toFilters(cond: Record<string, unknown> | FilterSchema[]): FilterSchema[] {
  if (Array.isArray(cond)) return cond;
  return Object.entries(cond).map(([key, value]) => ({ key, value, by: 'eq' as const }));
}