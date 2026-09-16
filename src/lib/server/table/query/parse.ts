import type { FieldKind, FieldSchema, Payload, Schema } from '$lib/server/model/types';
import { filter, type FilterBy, type FilterSchema } from '$lib/server/table/filter/filter';
import type { TableFieldMeta } from '$lib/types/table';

const RESERVED_PARAMS = new Set(['q', 'page', 'limit']);

const OPERATORS_BY_KIND: Record<FieldKind, FilterBy[]> = {
	string: ['eq', 'neq', 'like', 'unlike', 'include', 'exclude', 'start', 'end'],
	'id.uuid': ['eq', 'neq', 'like', 'unlike', 'include', 'exclude', 'start', 'end'],
	number: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte'],
	'id.index': ['eq', 'neq', 'gt', 'gte', 'lt', 'lte'],
	boolean: ['eq', 'neq'],
	enum: ['eq', 'neq'],
};

function isFilterBy(value: string): value is FilterBy {
	return Object.prototype.hasOwnProperty.call(filter, value);
}

function isAutoIdField(field: FieldSchema): boolean {
	return (field.type === 'id.index' || field.type === 'id.uuid') && !field.rel;
}

function isIdentityField(field: FieldSchema): boolean {
	return field.type.startsWith('id.') && !field.rel;
}

export function coerceFieldValue(type: FieldKind, raw: string): unknown {
	if (raw === '') return undefined;

	switch (type) {
		case 'boolean':
			if (raw === 'true') return true;
			if (raw === 'false') return false;
			return undefined;
		case 'number': {
			const n = Number(raw);
			return Number.isFinite(n) ? n : undefined;
		}

		case 'id.index': {
			const n = Number(raw);
			return Number.isInteger(n) ? n : undefined;
		}

		default:
			return raw;
	}
}

export const TABLE_PAGE_DEFAULT = 20;
export const TABLE_PAGE_MAX = 100;

export type TableQueryInput = {
	filters: FilterSchema[];
	search: string;
	page: number;
	limit: number;
	values: Record<string, string>;
	operators: Record<string, string>;
};

export type FormPayloadMode = 'create' | 'update' | 'delete';

export function toFieldMeta(field: FieldSchema): TableFieldMeta {
	return {
		name: field.name,
		type: field.type,
		required: field.required,
		hasDefault: field.hasDefault,
		enum: field.enum,
		rel: field.rel ? { table: field.rel.table, field: field.rel.field } : undefined,
		operators: [...OPERATORS_BY_KIND[field.type]],
		autoId: isAutoIdField(field),
		identity: isIdentityField(field),
	};
}

export function clampPage(page: number): number {
	return Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1;
}

export function clampLimit(limit: number): number {
	if (!Number.isFinite(limit) || limit < 1) return TABLE_PAGE_DEFAULT;
	return Math.min(TABLE_PAGE_MAX, Math.floor(limit));
}

export function parseTableQuery(schema: Schema, params: URLSearchParams): TableQueryInput {
	const search = params.get('q') ?? '';
	const page = clampPage(Number.parseInt(params.get('page') ?? '1', 10));
	const limit = clampLimit(Number.parseInt(params.get('limit') ?? String(TABLE_PAGE_DEFAULT), 10));
	const filters: FilterSchema[] = [];
	const values: Record<string, string> = {};
	const operators: Record<string, string> = {};

	for (const field of Object.values(schema.fields)) {
		if (RESERVED_PARAMS.has(field.name)) continue;
		const raw = params.get(field.name);
		if (raw == null || raw === '') continue;

		const byRaw = params.get(`${field.name}.by`) ?? 'eq';
		values[field.name] = raw;
		operators[field.name] = byRaw;

		if (!isFilterBy(byRaw)) continue;
		if (!OPERATORS_BY_KIND[field.type].includes(byRaw)) continue;

		const value = coerceFieldValue(field.type, raw);
		if (value === undefined) continue;
		filters.push({ key: field.name, value, by: byRaw });
	}

	return { filters, search, page, limit, values, operators };
}

export function payloadFromForm(schema: Schema, data: FormData, mode: FormPayloadMode): Payload {
	const payload: Payload = {};

	for (const field of Object.values(schema.fields)) {
		if (mode === 'create' && isAutoIdField(field)) continue;
		if (mode === 'delete' && !isIdentityField(field)) continue;

		const raw = data.get(field.name);
		if (typeof raw !== 'string' || raw === '') continue;

		const value = coerceFieldValue(field.type, raw);
		if (value === undefined) continue;
		payload[field.name] = value;
	}

	return payload;
}
