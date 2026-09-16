import type { Schema, Store } from '$lib/server/model/types';
import { destroy, flush } from '$lib/server/table/lifecycle';
import { sortByForeignKey } from '$lib/server/table/order/order';
import { bindRelations, hydrateRelations } from '$lib/server/table/relations/relations';
import { addSchema, clearSchemas } from '$lib/server/table/schema';
import { createTable, getTable, getTables, seed } from '$lib/server/table/store/store';

function registerSchemas(tables: Schema[]) {
  for (const table of tables) {
    for (const field of Object.values(table.fields)) {
      addSchema(`${table.name}.${field.name}`, field);
    }
  }
}

export function createTables(schemas: Schema[], seedCount: number) {
  resetTables();
  registerSchemas(schemas);

  const tables = getTables();
  const sorted = sortByForeignKey(schemas);
  for (const schema of sorted) {
    const table = createTable(schema, seedCount);
    tables.set(schema.name, table);
    seed(table);
  }

  for (const schema of sorted) {
    const table = tables.get(schema.name)!;
    bindRelations(table, tables);
    hydrateRelations(table, tables);
  }
}

export function resetTables() {
  const tables = getTables();
  for (const table of tables.values()) {
    destroy(table);
  }

  tables.clear();
  clearSchemas();
}

export function listTables(): string[] {
  return [...getTables().keys()];
}

export function toStore(): Store {
  const store: Store = {};
  for (const [name, table] of getTables()) {
    store[name] = table.rows;
  }

  return store;
}

export function flushAll(): Promise<void> {
  return Promise.all([...getTables().values()].map((table) => flush(table))).then(
    () => undefined
  );
}

export { getTable, getTables };
export {
  deleteRow,
  find,
  insert,
  lookup,
  select,
  update,
  upsert
} from '$lib/server/table/store/store';
export type { Table } from '$lib/server/table/lifecycle';
export { filterValue } from '$lib/server/table/row';
export { relationOptions, resolveRelationLabels } from '$lib/server/table/relations/relations';
export { query } from '$lib/server/table/query/query';
export { destroy, flush } from '$lib/server/table/lifecycle';
export { sortByForeignKey as sortTablesByFk } from '$lib/server/table/order/order';
export type { FilterSchema } from '$lib/server/table/filter/filter';
export {
  coerceFieldValue,
  parseTableQuery,
  payloadFromForm,
  toFieldMeta,
  TABLE_PAGE_DEFAULT,
  TABLE_PAGE_MAX
} from '$lib/server/table/query/parse';
