import { afterEach, describe, expect, it } from 'vitest';
import { generateSchemas, type ModelDefinition } from '$lib/server/model';
import { createTables, getTable, listTables, resetTables } from '$lib/server/table';
import {
  parseTableQuery,
  payloadFromForm,
  toFieldMeta
} from '$lib/server/table/query';

const notesModel: ModelDefinition = {
  notes: (t) => ({
    id: t.id.index(),
    title: t.string().factory(({ index }) => `Note ${index}`),
    count: t.number().factory(({ index }) => index),
    done: t.boolean().default(false)
  })
};

afterEach(() => {
  resetTables();
});

describe('listTables', () => {
  it('returns seeded table names in foreign-key order', () => {
    createTables(
      generateSchemas({
        todos: (t) => ({
          id: t.id.index(),
          owner: t.id.uuid().rel('users', { field: 'id' })
        }),
        users: (t) => ({ id: t.id.uuid() })
      }),
      1
    );
    expect(listTables()).toEqual(['users', 'todos']);
  });
});

describe('TableStore.delete', () => {
  it('removes the matching row and leaves the rest', () => {
    createTables(generateSchemas(notesModel), 3);
    const notes = getTable('notes')!;
    const removed = notes.delete({ id: 2 });
    expect(removed?.id.value).toBe(2);
    expect(notes.query().total).toBe(2);
    expect(notes.find({ id: 2 })).toBeUndefined();
    expect(notes.find({ id: 3 })?.title).toBe('Note 3');
  });

  it('returns undefined when nothing matches', () => {
    createTables(generateSchemas(notesModel), 1);
    expect(getTable('notes')!.delete({ id: 99 })).toBeUndefined();
    expect(getTable('notes')!.query().total).toBe(1);
  });
});

describe('TableStore.query', () => {
  it('paginates with page and limit', () => {
    createTables(generateSchemas(notesModel), 5);
    const notes = getTable('notes')!;
    const page1 = notes.query({ page: 1, limit: 2 });
    expect(page1.total).toBe(5);
    expect(page1.page).toBe(1);
    expect(page1.limit).toBe(2);
    expect(page1.rows.map((row) => row.id)).toEqual([1, 2]);

    const page3 = notes.query({ page: 3, limit: 2 });
    expect(page3.rows.map((row) => row.id)).toEqual([5]);
  });

  it('filters with typed operators then paginates', () => {
    createTables(generateSchemas(notesModel), 5);
    const notes = getTable('notes')!;
    const result = notes.query({
      filters: [{ key: 'count', by: 'gte', value: 3 }],
      page: 1,
      limit: 10
    });
    expect(result.rows.map((row) => row.id)).toEqual([3, 4, 5]);
  });

  it('querysearch matches strings case-insensitively', () => {
    createTables(generateSchemas(notesModel), 3);
    const result = getTable('notes')!.query({ search: 'note 2' });
    expect(result.total).toBe(1);
    expect(result.rows[0]?.title).toBe('Note 2');
  });

  it('querysearch matches numbers and booleans by type', () => {
    createTables(generateSchemas(notesModel), 3);
    const notes = getTable('notes')!;
    notes.update({ id: 2 }, { done: true });

    expect(notes.query({ search: '2' }).rows.map((row) => row.id)).toEqual([2]);
    expect(notes.query({ search: 'true' }).rows.map((row) => row.id)).toEqual([2]);
    expect(notes.query({ search: 'false' }).rows.map((row) => row.id)).toEqual([1, 3]);
  });

  it('querysearch skips relation columns', () => {
    createTables(
      generateSchemas({
        todos: (t) => ({
          id: t.id.index(),
          title: t.string().factory(() => 'Todo'),
          owner: t.id.uuid().rel('users', { field: 'id' })
        }),
        users: (t) => ({
          id: t.id.uuid(),
          name: t.string().factory(() => 'UniqueUserName')
        })
      }),
      1
    );
    const userName = getTable('users')!.storage[0].name.value as string;
    expect(getTable('todos')!.query({ search: userName }).total).toBe(0);
    expect(getTable('todos')!.query({ search: 'Todo' }).total).toBe(1);
  });
});

describe('parseTableQuery', () => {
  it('parses q, page, limit, and field filters', () => {
    createTables(generateSchemas(notesModel), 1);
    const schema = getTable('notes')!.schema;
    const parsed = parseTableQuery(
      schema,
      new URLSearchParams('q=Note&page=2&limit=5&count=3&count.by=gte&title=Note&title.by=include')
    );
    expect(parsed.search).toBe('Note');
    expect(parsed.page).toBe(2);
    expect(parsed.limit).toBe(5);
    expect(parsed.filters).toEqual([
      { key: 'title', value: 'Note', by: 'include' },
      { key: 'count', value: 3, by: 'gte' }
    ]);
  });

  it('drops operators that are not allowed for the field type', () => {
    createTables(generateSchemas(notesModel), 1);
    const schema = getTable('notes')!.schema;
    const parsed = parseTableQuery(
      schema,
      new URLSearchParams('title=Note&title.by=gte&count=1&count.by=include&done=true&done.by=eq')
    );
    expect(parsed.filters).toEqual([{ key: 'done', value: true, by: 'eq' }]);
  });
});

describe('toFieldMeta', () => {
  it('strips factories and flags auto ids', () => {
    createTables(generateSchemas(notesModel), 1);
    const id = toFieldMeta(getTable('notes')!.schema.fields.id);
    expect(id).toMatchObject({
      name: 'id',
      type: 'id.index',
      autoId: true,
      identity: true,
      operators: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte']
    });
    expect(id).not.toHaveProperty('factory');
  });
});

describe('payloadFromForm', () => {
  it('omits auto ids on create and identity-only on delete', () => {
    createTables(generateSchemas(notesModel), 1);
    const schema = getTable('notes')!.schema;

    const createData = new FormData();
    createData.set('id', '99');
    createData.set('title', 'Hello');
    createData.set('count', '4');
    createData.set('done', 'true');
    expect(payloadFromForm(schema, createData, 'create')).toEqual({
      title: 'Hello',
      count: 4,
      done: true
    });

    const deleteData = new FormData();
    deleteData.set('id', '2');
    deleteData.set('title', 'ignored');
    expect(payloadFromForm(schema, deleteData, 'delete')).toEqual({ id: 2 });
  });
});
