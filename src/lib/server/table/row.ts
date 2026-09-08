import type { FieldItem, Payload, RelationValue, Row } from '$lib/server/model/types';

export function createFieldItem(schema: string, value: unknown, hasRelation: boolean): FieldItem {
	return { schema, value, hasRelation };
}

export function isFieldItem(value: unknown): value is FieldItem {
	return (
		typeof value === 'object' &&
		value !== null &&
		'schema' in value &&
		'value' in value &&
		'hasRelation' in value
	);
}

export function isRelationValue(value: unknown): value is RelationValue {
	return (
		typeof value === 'object' &&
		value !== null &&
		'index' in value &&
		'row' in value &&
		typeof (value as RelationValue).index === 'number' &&
		typeof (value as RelationValue).row === 'object' &&
		(value as RelationValue).row !== null
	);
}

export function cloneFieldItem(item: FieldItem): FieldItem {
	return {
		schema: item.schema,
		hasRelation: item.hasRelation,
		value: cloneValue(item.value)
	};
}

export function cloneRow(row: Row): Row {
	const next: Row = {};
	for (const [key, item] of Object.entries(row)) {
		next[key] = cloneFieldItem(item);
	}
	return next;
}

export function omitRow(row: Row, omit: string[]): Row {
	const next = cloneRow(row);
	for (const key of omit) {
		delete next[key];
	}
	return next;
}

export function projectField(item: FieldItem): unknown {
	if (item.hasRelation && isRelationValue(item.value)) {
		return projectRow(item.value.row);
	}
	return item.value;
}

export function projectRow(row: Row): Payload {
	const out: Payload = {};
	for (const [key, item] of Object.entries(row)) {
		out[key] = projectField(item);
	}
	return out;
}

export function filterValue(item: FieldItem | undefined, joinField?: string): unknown {
	if (!item) return undefined;
	if (item.hasRelation && isRelationValue(item.value)) {
		if (!joinField) return undefined;
		return item.value.row[joinField]?.value;
	}
	return item.value;
}

export function relationIndex(item: FieldItem | undefined): number | undefined {
	if (!item?.hasRelation || !isRelationValue(item.value)) return undefined;
	return item.value.index;
}

function cloneValue(value: unknown): unknown {
	if (isRelationValue(value)) {
		return { index: value.index, row: cloneRow(value.row) };
	}
	if (isFieldItem(value)) {
		return cloneFieldItem(value);
	}
	return value;
}
