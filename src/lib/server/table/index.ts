import type {
  FieldSchema,
  Payload,
  Row,
  Store,
  Schema
} from '$lib/server/model/types';
import type { LifecycleListener, SetItem } from '$lib/types';
import { toFilters, filter as FilterHandler, type FilterSchema } from '$lib/server/table/filter';
import { sortByForeignKey } from '$lib/server/table/order';
import { bindRelations, hydrateRelations } from '$lib/server/table/relations';
import {
  createFieldItem,
  filterValue,
  isFieldItem,
  omitRow,
  projectRow
} from '$lib/server/table/row';
import schemaStore from '$lib/server/table/schema';

const MAX_SELECT = 100;

const TABLES = new Map<string, TableStore>();

export type TableLifecycle = 'after.seed' | 'update' | 'upsert';

export class TableStore {
  private rows: Row[] = [];
  private pending = new Set<Promise<void>>();

  readonly schema: Schema;
  readonly seedCount: number;

  private lifecycles = {
    'after.seed': new Set<(store: TableStore) => void>(),
    'update': new Set<(row: Row, index: number) => void>(),
    'upsert': new Set<(row: Row, index: number) => void>()
  } satisfies Record<TableLifecycle, Set<LifecycleListener<any[], void>>>;

  private readonly destroyRef = new Set<() => void>();

  constructor(schema: Schema, seedCount: number) {
    this.seedCount = seedCount;
    this.schema = schema;
  }

  get fields(): Schema {
    return this.schema;
  }

  get storage(): Row[] {
    return this.rows;
  }

  trackDestroy(unsub: () => void) {
    this.destroyRef.add(unsub);
  }

  destroy() {
    for (const destroy of this.destroyRef) {
      destroy();
    }
    this.destroyRef.clear();

    for (const listeners of Object.values(this.lifecycles)) {
      listeners.clear();
    }

    this.pending.clear();
    this.rows = [];
  }

  on<T extends TableLifecycle>(event: T, callback: SetItem<(typeof this.lifecycles)[T]>) {
    const fnSet = this.lifecycles[event] as Set<typeof callback>;
    fnSet.add(callback);
    return () => fnSet.delete(callback);
  }

  broadcast<T extends TableLifecycle>(
    event: T,
    ...args: Parameters<SetItem<(typeof this.lifecycles)[T]>>
  ): Promise<void> {
    let task!: Promise<void>;
    task = Promise.resolve()
      .then(() => {
        for (const callback of this.lifecycles[event]) {
          (callback as LifecycleListener<any[], void>)(...args);
        }
      })
      .catch(() => { })
      .finally(() => this.pending.delete(task));
    this.pending.add(task);
    return task;
  }

  flush(): Promise<void> {
    return Promise.all([...this.pending]).then(() => undefined);
  }

  find(cond: Record<string, unknown> | FilterSchema[] = []): Payload | undefined {
    const found = this.lookup('find', toFilters(cond));
    if (!found || Array.isArray(found)) return undefined;
    return projectRow(found.row);
  }

  select(filters: FilterSchema[] = []): Payload[] {
    const found = this.lookup('filter', filters);
    if (!Array.isArray(found)) return [];
    return found.slice(0, MAX_SELECT).map(projectRow);
  }

  insert(payload: Payload): Row {
    const row = this.buildRow(payload);
    this.fillMissingIds(row);
    this.rows.push(row);
    return row;
  }

  upsert(payload: Payload): Row {
    const availableID = this.detectID(payload);
    if (Object.keys(availableID).length > 0) {
      const found = this.lookup('find', toFilters(availableID));
      if (found && !Array.isArray(found)) {
        this.applyPatch(found.row, payload);
        this.rows[found.index] = found.row;
        void this.broadcast('upsert', found.row, found.index);
        return found.row;
      }
    }

    const row = this.insert(payload);
    void this.broadcast('upsert', row, this.rows.length - 1);
    return row;
  }

  update(cond: Record<string, unknown> | FilterSchema[], patch: Payload): Row | undefined {
    const found = this.lookup('find', toFilters(cond));
    if (!found || Array.isArray(found)) return undefined;

    this.applyPatch(found.row, patch);
    this.rows[found.index] = found.row;
    void this.broadcast('update', found.row, found.index);
    return found.row;
  }

  seed() {
    this.rows = [];
    for (let index = 0; index < this.seedCount; index++) {
      const row: Row = {};
      for (const field of Object.values(this.schema.fields)) {
        row[field.name] = createFieldItem(
          `${this.schema.name}.${field.name}`,
          this.generateFieldValue(field, index),
          Boolean(field.rel)
        );
      }
      this.rows.push(row);
    }
    void this.broadcast('after.seed', this);
  }

  private buildRow(payload: Payload): Row {
    const row: Row = {};
    for (const field of Object.values(this.schema.fields)) {
      if (!(field.name in payload)) continue;
      const raw = payload[field.name];
      if (isFieldItem(raw)) {
        row[field.name] = raw;
        continue;
      }
      row[field.name] = createFieldItem(
        `${this.schema.name}.${field.name}`,
        field.rel ? this.relationFromScalar(field, raw) : raw,
        Boolean(field.rel)
      );
    }
    return row;
  }

  private applyPatch(row: Row, patch: Payload) {
    for (const [key, value] of Object.entries(patch)) {
      const field = this.schema.fields[key];
      if (!field) continue;
      if (isFieldItem(value)) {
        row[key] = value;
        continue;
      }
      if (field.rel) {
        row[key] = createFieldItem(
          `${this.schema.name}.${field.name}`,
          this.relationFromScalar(field, value),
          true
        );
        continue;
      }
      if (row[key]) {
        row[key].value = value;
      } else {
        row[key] = createFieldItem(`${this.schema.name}.${field.name}`, value, false);
      }
    }
  }

  private relationFromScalar(field: FieldSchema, value: unknown) {
    const related = TABLES.get(field.rel!.table);
    const join = field.rel!.field;
    const sourceIndex = related
      ? related.rows.findIndex((source) => filterValue(source[join], undefined) === value)
      : -1;
    if (!related || sourceIndex === -1) {
      return { index: -1, row: {} };
    }
    return {
      index: sourceIndex,
      row: omitRow(related.storage[sourceIndex], field.rel!.omit)
    };
  }

  private detectID(payload: Payload): Record<string, unknown> {
    const ids: Record<string, unknown> = {};
    for (const schema of Object.values(this.schema.fields)) {
      if (!schema.type.startsWith('id.')) continue;
      if (!(schema.name in payload)) continue;
      const raw = payload[schema.name];
      ids[schema.name] = isFieldItem(raw) ? raw.value : raw;
    }
    return ids;
  }

  private fillMissingIds(row: Row) {
    for (const schema of Object.values(this.schema.fields)) {
      if (!schema.type.startsWith('id.') || row[schema.name]) continue;
      row[schema.name] = createFieldItem(
        `${this.schema.name}.${schema.name}`,
        schema.type === 'id.index' ? this.rows.length + 1 : crypto.randomUUID(),
        false
      );
    }
  }

  private generateFieldValue(field: FieldSchema, index: number) {
    if (field.rel) {
      const related = TABLES.get(field.rel.table);
      if (!related) {
        throw new Error(
          `Cannot seed ${field.name}: table with "${field.rel.table}" name, does not exist`
        );
      }
      if (related.seedCount === 0) {
        throw new Error(
          `Cannot seed ${field.name}: related table "${field.rel.table}" has no rows`
        );
      }
      return { index: Math.floor(Math.random() * related.seedCount), row: {} };
    }

    if (field.type === 'id.index') return index + 1;
    if (field.type === 'id.uuid') return crypto.randomUUID();
    if (field.factory) return field.factory({ index: index + 1 });
    if (field.hasDefault) return field.defaultValue;
    if (field.type === 'boolean') return false;
    if (field.type === 'string') return '';
    return null;
  }

  private lookup(type: 'find' | 'filter', cond: FilterSchema[]) {
    const filtered: Row[] = [];
    for (let index = 0; index < this.rows.length; index++) {
      const row = this.rows[index];
      if (!this.matches(row, cond)) continue;

      if (type === 'find') {
        return { index, row };
      }
      filtered.push(row);
    }

    return type === 'find' ? undefined : filtered;
  }

  private matches(row: Row, cond: FilterSchema[]) {
    if (cond.length === 0) return true;

    for (const { key, by, value } of cond) {
      const field = this.schema.fields[key];
      const cell = filterValue(row[key], field?.rel?.field);
      if (!FilterHandler[by](cell, value)) return false;
    }
    return true;
  }
}

function registerSchemas(tables: Schema[]) {
  for (const table of tables) {
    for (const field of Object.values(table.fields)) {
      schemaStore.add(`${table.name}.${field.name}`, field);
    }
  }
}

export function createTables(schemas: Schema[], seedCount: number) {
  resetTables();
  registerSchemas(schemas);

  const sorted = sortByForeignKey(schemas);
  for (const schema of sorted) {
    const table = new TableStore(schema, seedCount);
    TABLES.set(schema.name, table);
    table.seed();
  }

  for (const schema of sorted) {
    const table = TABLES.get(schema.name)!;
    bindRelations(table, TABLES);
    hydrateRelations(table, TABLES);
  }
}

export function resetTables() {
  for (const store of TABLES.values()) {
    store.destroy();
  }
  TABLES.clear();
  schemaStore.clear();
}

export function getTable(name: string): TableStore | undefined {
  return TABLES.get(name);
}

export function toStore(): Store {
  const store: Store = {};
  for (const [name, table] of TABLES) {
    store[name] = table.storage;
  }
  return store;
}

export function flushAll(): Promise<void> {
  return Promise.all([...TABLES.values()].map((table) => table.flush())).then(() => undefined);
}

export { sortByForeignKey as sortTablesByFk } from '$lib/server/table/order';
export type { FilterSchema } from '$lib/server/table/filter';
