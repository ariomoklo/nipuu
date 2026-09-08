import type { FieldSchema, Row } from '$lib/server/model/types';
import { on, trackDestroy, type Table } from '$lib/server/table/lifecycle';
import { isRelationValue, omitRow } from '$lib/server/table/row';

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

export function syncRelation(table: Table, field: FieldSchema, sourceRow: Row, sourceIndex: number) {
	const omit = field.rel?.omit ?? [];
	for (const row of table.rows) {
		const item = row[field.name];
		if (!item?.hasRelation || !isRelationValue(item.value)) continue;
		if (item.value.index !== sourceIndex) continue;
		item.value = { index: sourceIndex, row: omitRow(sourceRow, omit) };
	}
}
