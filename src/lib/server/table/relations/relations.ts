import type { FieldSchema, Row, Schema } from '$lib/server/model/types';
import { on, trackDestroy, type Table } from '$lib/server/table/lifecycle';
import { isRelationValue, omitRow, projectField } from '$lib/server/table/row';
import type { TableRelationOption } from '$lib/types/table';

const RELATION_OPTION_MAX = 100;

export function bindRelations(table: Table, tables: Map<string, Table>) {
	for (const field of Object.values(table.schema.fields)) {
		if (!field.rel) continue;

		const related = tables.get(field.rel.table);
		if (!related) {
			throw new Error(
				`Cannot bind ${field.name}: table with "${field.rel.table}" name, does not exist`
			);
		}

		const sync = (sourceRow: Row, sourceIndex: number) => {
			syncRelation(table, field, sourceRow, sourceIndex);
		};

		trackDestroy(table, on(related, 'update', sync));
		trackDestroy(table, on(related, 'upsert', sync));
	}
}

export function hydrateRelations(table: Table, tables: Map<string, Table>) {
	for (const field of Object.values(table.schema.fields)) {
		if (!field.rel) continue;

		const related = tables.get(field.rel.table);
		if (!related) {
			throw new Error(
				`Cannot seed ${field.name}: table with "${field.rel.table}" name, does not exist`
			);
		}

		for (const row of table.rows) {
			const item = row[field.name];
			if (!item?.hasRelation || !isRelationValue(item.value)) continue;
			const source = related.rows[item.value.index];
			if (!source) continue;
			item.value = { index: item.value.index, row: omitRow(source, field.rel.omit) };
		}
	}
}

/** Readable field for a relation option: the first plain string that is not the joined key. */
function labelFieldOf(schema: Schema, joined: string): string | undefined {
	for (const field of Object.values(schema.fields)) {
		if (field.name === joined || field.rel || field.type !== 'string') continue;
		return field.name;
	}

	return undefined;
}

function optionText(row: Row, name: string): string | undefined {
	const item = row[name];
	if (!item) return undefined;

	const value = projectField(item);
	if (value == null || value === '') return undefined;
	return String(value);
}

/** Existing values a relation field can point at, for pickers in the inspector. */
export function relationOptions(
	table: Table,
	tables: Map<string, Table>
): Record<string, TableRelationOption[]> {
	const options: Record<string, TableRelationOption[]> = {};

	for (const field of Object.values(table.schema.fields)) {
		if (!field.rel) continue;

		const related = tables.get(field.rel.table);
		if (!related) continue;

		const joined = field.rel.field;
		const labelField = labelFieldOf(related.schema, joined);
		const taken = new Set<string>();
		const list: TableRelationOption[] = [];

		for (const row of related.rows) {
			if (list.length >= RELATION_OPTION_MAX) break;

			const value = optionText(row, joined);
			if (value === undefined || taken.has(value)) continue;

			taken.add(value);
			list.push({ value, label: labelField ? optionText(row, labelField) : undefined });
		}

		options[field.name] = list;
	}

	return options;
}

/**
 * Swap a relation label typed in a form for the value it stands for, so a field
 * picker that reads "User 4" submits the id behind it.
 */
export function resolveRelationLabels(
	form: FormData,
	options: Record<string, TableRelationOption[]>
) {
	for (const [name, list] of Object.entries(options)) {
		const typed = form.get(name);
		if (typeof typed !== 'string' || typed === '') continue;
		if (list.some((option) => option.value === typed)) continue;

		const wanted = typed.toLowerCase();
		const matched = list.find((option) => option.label?.toLowerCase() === wanted);
		if (matched) form.set(name, matched.value);
	}
}

export function syncRelation(table: Table, field: FieldSchema, sourceRow: Row, sourceIndex: number) {
	const omit = field.rel?.omit ?? [];
	for (const row of table.rows) {
		const item = row[field.name];
		if (!item?.hasRelation || !isRelationValue(item.value)) continue;
		if (item.value.index !== sourceIndex) continue;
		item.value = { index: sourceIndex, row: omitRow(sourceRow, omit) };
	}
}
