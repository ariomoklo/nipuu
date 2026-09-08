function isString(value: unknown) {
  return typeof value === 'string';
}

function isNumber(value: unknown) {
  return typeof value === 'number';
}

/**
 * Exact match. Use when the cell must equal the filter value.
 * @example eq(1, 1)
 */
function isEqual(value: unknown, target: unknown) {
  return value === target;
}

/**
 * Inequality. Use when the cell must not equal the filter value.
 * @example neq('open', 'done')
 */
function isNotEqual(value: unknown, target: unknown) {
  return value !== target;
}

/**
 * Numeric greater-than. Use for numbers strictly above the filter.
 * @example gt(5, 3)
 */
function isGreaterThan(value: unknown, target: unknown) {
  return isNumber(value) && isNumber(target) && value > target;
}

/**
 * Numeric greater-than or equal. Use for numbers at or above the filter.
 * @example gte(3, 3)
 */
function isGreaterThanOrEqual(value: unknown, target: unknown) {
  return isNumber(value) && isNumber(target) && value >= target;
}

/**
 * Numeric less-than. Use for numbers strictly below the filter.
 * @example lt(2, 10)
 */
function isLessThan(value: unknown, target: unknown) {
  return isNumber(value) && isNumber(target) && value < target;
}

/**
 * Numeric less-than or equal. Use for numbers at or below the filter.
 * @example lte(2, 2)
 */
function isLessThanOrEqual(value: unknown, target: unknown) {
  return isNumber(value) && isNumber(target) && value <= target;
}

/**
 * Cell is a substring of the filter. Use when the filter string contains the cell.
 * @example like('ab', 'abc')
 */
function isLike(value: unknown, target: unknown) {
  return isString(value) && isString(target) && target.includes(value);
}

/**
 * Cell is not a substring of the filter. Use when the filter string must not contain the cell.
 * @example unlike('x', 'abc')
 */
function isUnlike(value: unknown, target: unknown) {
  return isString(value) && isString(target) && !target.includes(value);
}

/**
 * Prefix match. Use when the cell must start with the filter string.
 * @example start('Todo 1', 'Todo')
 */
function isStart(value: unknown, target: unknown) {
  return isString(value) && isString(target) && value.startsWith(target);
}

/**
 * Suffix match. Use when the cell must end with the filter string.
 * @example end('Todo 12', '12')
 */
function isEnd(value: unknown, target: unknown) {
  return isString(value) && isString(target) && value.endsWith(target);
}

/**
 * Cell contains the filter. Use when the cell must include the filter string.
 * @example include('Todo 12', 'odo')
 */
function isInclude(value: unknown, target: unknown) {
  return isString(value) && isString(target) && value.includes(target);
}

/**
 * Cell does not contain the filter. Use when the cell must omit the filter string.
 * @example exclude('Todo 12', 'xyz')
 */
function isExclude(value: unknown, target: unknown) {
  return isString(value) && isString(target) && !value.includes(target);
}

export type FilterBy = keyof typeof filter;

export type FilterSchema = {
  key: string;
  value: unknown;
  by: FilterBy;
};

export const filter = {
  eq: isEqual,
  neq: isNotEqual,
  gt: isGreaterThan,
  gte: isGreaterThanOrEqual,
  lt: isLessThan,
  lte: isLessThanOrEqual,
  like: isLike,
  unlike: isUnlike,
  start: isStart,
  end: isEnd,
  include: isInclude,
  exclude: isExclude
} as const;

/**
 * Normalize a lookup into filter schemas. Use a record for equality, or pass filters as-is.
 * @example toFilters({ id: 1 })
 */
export function toFilters(cond: Record<string, unknown> | FilterSchema[]): FilterSchema[] {
  if (Array.isArray(cond)) return cond;
  return Object.entries(cond).map(([key, value]) => ({ key, value, by: 'eq' as const }));
}
