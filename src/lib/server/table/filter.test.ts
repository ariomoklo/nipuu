import { describe, expect, it } from 'vitest';
import { filter, toFilters } from '$lib/server/table/filter';

describe('filter.eq', () => {
  it('matches equal values of any type', () => {
    expect(filter.eq(1, 1)).toBe(true);
    expect(filter.eq('open', 'open')).toBe(true);
    expect(filter.eq(true, true)).toBe(true);
    expect(filter.eq(1, '1')).toBe(false);
    expect(filter.eq(1, 2)).toBe(false);
  });
});

describe('filter.neq', () => {
  it('matches when values differ', () => {
    expect(filter.neq('open', 'done')).toBe(true);
    expect(filter.neq(1, 1)).toBe(false);
    expect(filter.neq(1, '1')).toBe(true);
  });
});

describe('filter.gt', () => {
  it('matches numbers strictly above the target', () => {
    expect(filter.gt(5, 3)).toBe(true);
    expect(filter.gt(3, 3)).toBe(false);
    expect(filter.gt(2, 3)).toBe(false);
    expect(filter.gt('5', 3)).toBe(false);
  });
});

describe('filter.gte', () => {
  it('matches numbers at or above the target', () => {
    expect(filter.gte(3, 3)).toBe(true);
    expect(filter.gte(4, 3)).toBe(true);
    expect(filter.gte(2, 3)).toBe(false);
    expect(filter.gte('3', 3)).toBe(false);
  });
});

describe('filter.lt', () => {
  it('matches numbers strictly below the target', () => {
    expect(filter.lt(2, 10)).toBe(true);
    expect(filter.lt(10, 10)).toBe(false);
    expect(filter.lt(11, 10)).toBe(false);
    expect(filter.lt(2, '10')).toBe(false);
  });
});

describe('filter.lte', () => {
  it('matches numbers at or below the target', () => {
    expect(filter.lte(2, 2)).toBe(true);
    expect(filter.lte(1, 2)).toBe(true);
    expect(filter.lte(3, 2)).toBe(false);
    expect(filter.lte(2, '2')).toBe(false);
  });
});

describe('filter.like', () => {
  it('matches when the filter string contains the cell', () => {
    expect(filter.like('ab', 'abc')).toBe(true);
    expect(filter.like('abc', 'abc')).toBe(true);
    expect(filter.like('x', 'abc')).toBe(false);
    expect(filter.like(1, '1')).toBe(false);
  });
});

describe('filter.unlike', () => {
  it('matches when the filter string does not contain the cell', () => {
    expect(filter.unlike('x', 'abc')).toBe(true);
    expect(filter.unlike('ab', 'abc')).toBe(false);
    expect(filter.unlike(1, '1')).toBe(false);
  });
});

describe('filter.start', () => {
  it('matches when the cell starts with the target', () => {
    expect(filter.start('Todo 1', 'Todo')).toBe(true);
    expect(filter.start('Todo 1', '1')).toBe(false);
    expect(filter.start(1, '1')).toBe(false);
  });
});

describe('filter.end', () => {
  it('matches when the cell ends with the target', () => {
    expect(filter.end('Todo 12', '12')).toBe(true);
    expect(filter.end('Todo 12', 'Todo')).toBe(false);
    expect(filter.end(12, '12')).toBe(false);
  });
});

describe('filter.include', () => {
  it('matches when the cell contains the target', () => {
    expect(filter.include('Todo 12', 'odo')).toBe(true);
    expect(filter.include('Todo 12', 'xyz')).toBe(false);
    expect(filter.include(12, '1')).toBe(false);
  });
});

describe('filter.exclude', () => {
  it('matches when the cell does not contain the target', () => {
    expect(filter.exclude('Todo 12', 'xyz')).toBe(true);
    expect(filter.exclude('Todo 12', 'odo')).toBe(false);
    expect(filter.exclude(12, '1')).toBe(false);
  });
});

describe('toFilters', () => {
  it('turns a record into eq filters', () => {
    expect(toFilters({ id: 1, title: 'Note' })).toEqual([
      { key: 'id', value: 1, by: 'eq' },
      { key: 'title', value: 'Note', by: 'eq' }
    ]);
  });

  it('returns an existing filter list unchanged', () => {
    const filters = [{ key: 'title', value: 'Note', by: 'include' as const }];
    expect(toFilters(filters)).toBe(filters);
  });
});
