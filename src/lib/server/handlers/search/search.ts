import type { Row } from '$lib/server/model';
import { projectRowScalar } from '$lib/server/handlers/project';
import type { ActionBody } from '$lib/server/handlers/errors';
import {
	resolveValue,
	toRouteFilters,
	type DispatchContext,
} from '$lib/server/handlers/sources/sources';
import { lookup, type Table } from '$lib/server/table';
import { TableNotFound, TableStore } from '$lib/server/table/store/service';
import type { RouteHandlerObject } from '$lib/types';
import { Effect } from 'effect';

function parseIndex(raw: unknown): number | undefined {
	if (raw === undefined || raw === null || raw === '') return undefined;
	const n = typeof raw === 'number' ? raw : Number(raw);
	if (!Number.isInteger(n) || n < 0) return undefined;
	return n;
}

function compare(a: unknown, b: unknown, sign: number): number {
	if (typeof a === 'number' && typeof b === 'number') return (a - b) * sign;
	if (typeof a === 'string' && typeof b === 'string') return a.localeCompare(b) * sign;
	if (typeof a === 'boolean' && typeof b === 'boolean') return (Number(a) - Number(b)) * sign;
	return String(a).localeCompare(String(b)) * sign;
}

function sortRows(rows: Row[], table: Table, sortBy: unknown, orderBy: unknown): Row[] {
	if (typeof sortBy !== 'string' || !table.schema.fields[sortBy]) return rows;
	const sign = orderBy === 'desc' ? -1 : 1;
	return rows.toSorted((left, right) => {
		const a = projectRowScalar(left, table)[sortBy];
		const b = projectRowScalar(right, table)[sortBy];
		if (a == null && b == null) return 0;
		if (a == null) return 1;
		if (b == null) return -1;
		return compare(a, b, sign);
	});
}

function paginate(rows: Row[], handler: RouteHandlerObject, context: DispatchContext): Row[] {
	const pagination = handler.pagination;
	if (pagination == null || typeof pagination !== 'object') return rows;
	const from = parseIndex(resolveValue(pagination.start, context)) ?? 0;
	const to = parseIndex(resolveValue(pagination.end, context)) ?? rows.length;
	const limit = parseIndex(resolveValue(pagination.limit, context));
	const sliced = rows.slice(from, to);
	if (limit === undefined) return sliced;
	return sliced.slice(0, limit);
}

export function searchEffect(
	handler: RouteHandlerObject,
	context: DispatchContext,
): Effect.Effect<ActionBody, TableNotFound, TableStore> {
	return Effect.gen(function* () {
		if (typeof handler.model !== 'string') return yield* new TableNotFound({ table: '' });

		const tables = yield* TableStore;
		const table = yield* tables.get(handler.model);
		const where = toRouteFilters(table, handler.where, context, 'where');
		if (where === null) return { _tag: 'Json', value: [] };

		const filter = toRouteFilters(table, handler.filter, context, 'filter') ?? [];
		const found = lookup(table, 'filter', [...where, ...filter]);
		const matched = Array.isArray(found) ? found : [];
		const sort = handler.sort;
		const sorted = sortRows(
			matched,
			table,
			sort && typeof sort === 'object' ? resolveValue(sort.sortBy, context) : undefined,
			sort && typeof sort === 'object' ? resolveValue(sort.orderBy, context) : undefined,
		);
		const page = paginate(sorted, handler, context).map((row) => projectRowScalar(row, table));
		return { _tag: 'Json', value: page };
	});
}
