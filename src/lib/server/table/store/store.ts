import type { FieldSchema, Payload, Row, Schema } from '$lib/server/model/types';
import { filter, toFilters, type FilterSchema } from '$lib/server/table/filter/filter';
import { broadcast, type Table } from '$lib/server/table/lifecycle';
import { TABLE_PAGE_MAX } from '$lib/server/table/query/parse';
import {
	createFieldItem,
	filterValue,
	isFieldItem,
	omitRow,
	projectRow
} from '$lib/server/table/row';

const TABLES_KEY = Symbol.for('nipuu.tables');

type GlobalTables = typeof globalThis & {
	[TABLES_KEY]?: Map<string, Table>;
};

function matches(table: Table, row: Row, cond: FilterSchema[]) {
	if (cond.length === 0) return true;

	for (const { key, by, value } of cond) {
		const field = table.schema.fields[key];
		const cell = filterValue(row[key], field?.rel?.field);
		if (!filter[by](cell, value)) return false;
	}

	return true;
}

function relationFromScalar(field: FieldSchema, value: unknown) {
	const related = getTable(field.rel!.table);
	const join = field.rel!.field;
	const sourceIndex = related
		? related.rows.findIndex((source) => filterValue(source[join], undefined) === value)
		: -1;
	if (!related || sourceIndex === -1) {
		return { index: -1, row: {} };
	}

	return {
		index: sourceIndex,
		row: omitRow(related.rows[sourceIndex], field.rel!.omit)
	};
}

function buildRow(table: Table, payload: Payload): Row {
	const row: Row = {};
	for (const field of Object.values(table.schema.fields)) {
		if (!(field.name in payload)) continue;
		const raw = payload[field.name];
		if (isFieldItem(raw)) {
			row[field.name] = raw;
			continue;
		}

		row[field.name] = createFieldItem(
			`${table.schema.name}.${field.name}`,
			field.rel ? relationFromScalar(field, raw) : raw,
			Boolean(field.rel)
		);
	}

	return row;
}

function applyPatch(table: Table, row: Row, patch: Payload) {
	for (const [key, value] of Object.entries(patch)) {
		const field = table.schema.fields[key];
		if (!field) continue;
		if (isFieldItem(value)) {
			row[key] = value;
			continue;
		}

		if (field.rel) {
			row[key] = createFieldItem(
				`${table.schema.name}.${field.name}`,
				relationFromScalar(field, value),
				true
			);
			continue;
		}

		if (row[key]) {
			row[key].value = value;
		} else {
			row[key] = createFieldItem(`${table.schema.name}.${field.name}`, value, false);
		}
	}
}

function detectID(table: Table, payload: Payload): Record<string, unknown> {
	const ids: Record<string, unknown> = {};
	for (const schema of Object.values(table.schema.fields)) {
		if (!schema.type.startsWith('id.')) continue;
		if (!(schema.name in payload)) continue;
		const raw = payload[schema.name];
		ids[schema.name] = isFieldItem(raw) ? raw.value : raw;
	}

	return ids;
}

function fillMissingIds(table: Table, row: Row) {
	for (const schema of Object.values(table.schema.fields)) {
		if (!schema.type.startsWith('id.') || row[schema.name]) continue;
		row[schema.name] = createFieldItem(
			`${table.schema.name}.${schema.name}`,
			schema.type === 'id.index' ? table.rows.length + 1 : crypto.randomUUID(),
			false
		);
	}
}

function generateFieldValue(table: Table, field: FieldSchema, index: number) {
	if (field.rel) {
		const related = getTable(field.rel.table);
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

export function getTables(): Map<string, Table> {
	const global = globalThis as GlobalTables;
	if (!global[TABLES_KEY]) global[TABLES_KEY] = new Map();
	return global[TABLES_KEY];
}

export function getTable(name: string): Table | undefined {
	return getTables().get(name);
}

export function createTable(schema: Schema, seedCount: number): Table {
	return {
		schema,
		seedCount,
		rows: [],
		pending: new Set(),
		lifecycles: {
			'after.seed': new Set(),
			update: new Set(),
			upsert: new Set()
		},
		destroyRef: new Set()
	};
}

export function lookup(table: Table, type: 'find' | 'filter', cond: FilterSchema[]) {
	const filtered: Row[] = [];
	for (let index = 0; index < table.rows.length; index++) {
		const row = table.rows[index];
		if (!matches(table, row, cond)) continue;

		if (type === 'find') {
			return { index, row };
		}

		filtered.push(row);
	}

	return type === 'find' ? undefined : filtered;
}

export function find(
	table: Table,
	cond: Record<string, unknown> | FilterSchema[] = []
): Payload | undefined {
	const found = lookup(table, 'find', toFilters(cond));
	if (!found || Array.isArray(found)) return undefined;
	return projectRow(found.row);
}

export function select(table: Table, filters: FilterSchema[] = []): Payload[] {
	const found = lookup(table, 'filter', filters);
	if (!Array.isArray(found)) return [];
	return found.slice(0, TABLE_PAGE_MAX).map(projectRow);
}

export function insert(table: Table, payload: Payload): Row {
	const row = buildRow(table, payload);
	fillMissingIds(table, row);
	table.rows.push(row);
	return row;
}

export function upsert(table: Table, payload: Payload): Row {
	const availableID = detectID(table, payload);
	if (Object.keys(availableID).length > 0) {
		const found = lookup(table, 'find', toFilters(availableID));
		if (found && !Array.isArray(found)) {
			applyPatch(table, found.row, payload);
			table.rows[found.index] = found.row;
			void broadcast(table, 'upsert', found.row, found.index);
			return found.row;
		}
	}

	const row = insert(table, payload);
	void broadcast(table, 'upsert', row, table.rows.length - 1);
	return row;
}

export function update(
	table: Table,
	cond: Record<string, unknown> | FilterSchema[],
	patch: Payload
): Row | undefined {
	const found = lookup(table, 'find', toFilters(cond));
	if (!found || Array.isArray(found)) return undefined;

	applyPatch(table, found.row, patch);
	table.rows[found.index] = found.row;
	void broadcast(table, 'update', found.row, found.index);
	return found.row;
}

export function deleteRow(
	table: Table,
	cond: Record<string, unknown> | FilterSchema[]
): Row | undefined {
	const found = lookup(table, 'find', toFilters(cond));
	if (!found || Array.isArray(found)) return undefined;
	table.rows.splice(found.index, 1);
	return found.row;
}

export function seed(table: Table) {
	table.rows = [];
	for (let index = 0; index < table.seedCount; index++) {
		const row: Row = {};
		for (const field of Object.values(table.schema.fields)) {
			row[field.name] = createFieldItem(
				`${table.schema.name}.${field.name}`,
				generateFieldValue(table, field, index),
				Boolean(field.rel)
			);
		}

		table.rows.push(row);
	}

	void broadcast(table, 'after.seed', table);
}

export type { Table } from '$lib/server/table/lifecycle';
