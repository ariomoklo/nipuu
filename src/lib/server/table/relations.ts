import type { FieldSchema, Row, Schema } from '$lib/server/model/types';
import { isRelationValue, omitRow } from '$lib/server/table/row';

export type RelatableStore = {
	schema: Schema;
	storage: Row[];
	trackDestroy(unsub: () => void): void;
	on(event: 'update' | 'upsert', callback: (row: Row, index: number) => void): () => void;
};

export function bindRelations(
	store: RelatableStore,
	tables: { get(name: string): RelatableStore | undefined }
) {
	for (const field of Object.values(store.schema.fields)) {
		if (!field.rel) continue;

		const related = tables.get(field.rel.table);
		if (!related) {
			throw new Error(
				`Cannot bind ${field.name}: table with "${field.rel.table}" name, does not exist`
			);
		}

		const sync = (sourceRow: Row, sourceIndex: number) => {
			syncRelation(store, field, sourceRow, sourceIndex);
		};

		store.trackDestroy(related.on('update', sync));
		store.trackDestroy(related.on('upsert', sync));
	}
}

export function hydrateRelations(
	store: RelatableStore,
	tables: { get(name: string): RelatableStore | undefined }
) {
	for (const field of Object.values(store.schema.fields)) {
		if (!field.rel) continue;

		const related = tables.get(field.rel.table);
		if (!related) {
			throw new Error(
				`Cannot seed ${field.name}: table with "${field.rel.table}" name, does not exist`
			);
		}

		for (const row of store.storage) {
			const item = row[field.name];
			if (!item?.hasRelation || !isRelationValue(item.value)) continue;
			const source = related.storage[item.value.index];
			if (!source) continue;
			item.value = { index: item.value.index, row: omitRow(source, field.rel.omit) };
		}
	}
}

export function syncRelation(
	store: RelatableStore,
	field: FieldSchema,
	sourceRow: Row,
	sourceIndex: number
) {
	const omit = field.rel?.omit ?? [];
	for (const row of store.storage) {
		const item = row[field.name];
		if (!item?.hasRelation || !isRelationValue(item.value)) continue;
		if (item.value.index !== sourceIndex) continue;
		item.value = { index: sourceIndex, row: omitRow(sourceRow, omit) };
	}
}
