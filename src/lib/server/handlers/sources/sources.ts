import { coerceFieldValue, type FilterSchema, type Table } from '$lib/server/table';
import type { RouteFieldRef } from '$lib/types';

export type DispatchContext = {
	params: Record<string, string>;
	queries: Record<string, string>;
	body: unknown;
};

function isFieldRef(value: unknown): value is RouteFieldRef {
	if (typeof value !== 'object' || value === null) return false;
	const ref = value as Record<string, unknown>;
	return (
		(ref.source === 'params' || ref.source === 'queries' || ref.source === 'body') &&
		typeof ref.key === 'string'
	);
}

function readSource(
	source: RouteFieldRef['source'],
	key: string,
	context: DispatchContext
): unknown {
	if (source === 'params') {
		return Object.hasOwn(context.params, key) ? context.params[key] : undefined;
	}

	if (source === 'queries') {
		return Object.hasOwn(context.queries, key) ? context.queries[key] : undefined;
	}

	if (context.body === null || typeof context.body !== 'object' || Array.isArray(context.body)) {
		return undefined;
	}

	const body = context.body as Record<string, unknown>;
	return Object.hasOwn(body, key) ? body[key] : undefined;
}

function coerceValue(table: Table, fieldName: string, raw: unknown): unknown {
	if (raw === undefined) return undefined;
	const field = table.schema.fields[fieldName];
	if (!field) return raw;
	if (typeof raw !== 'string') return raw;
	return coerceFieldValue(field.type, raw);
}

export function resolveValue(ref: unknown, context: DispatchContext): unknown {
	if (!isFieldRef(ref)) return undefined;
	return readSource(ref.source, ref.key, context);
}

export function resolveFieldValue(
	table: Table,
	fieldName: string,
	ref: unknown,
	context: DispatchContext
): unknown {
	return coerceValue(table, fieldName, resolveValue(ref, context));
}

export function toRouteFilters(
	table: Table,
	map: unknown,
	context: DispatchContext,
	mode: 'where' | 'filter'
): FilterSchema[] | null {
	if (map == null || typeof map !== 'object' || Array.isArray(map)) return [];

	const filters: FilterSchema[] = [];
	for (const [fieldName, ref] of Object.entries(map as Record<string, unknown>)) {
		if (!table.schema.fields[fieldName] || !isFieldRef(ref)) continue;
		const value = resolveFieldValue(table, fieldName, ref, context);
		if (value === undefined) {
			if (mode === 'where') return null;
			continue;
		}

		filters.push({
			key: fieldName,
			value,
			by: ref.by === 'include' ? 'include' : 'eq'
		});
	}

	return filters;
}
