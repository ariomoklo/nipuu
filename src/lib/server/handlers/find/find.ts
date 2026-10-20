import { projectRowScalar } from '$lib/server/handlers/project';
import type { ActionBody } from '$lib/server/handlers/errors';
import { toRouteFilters, type DispatchContext } from '$lib/server/handlers/sources/sources';
import { lookup } from '$lib/server/table';
import { RowNotFound, TableNotFound, TableStore } from '$lib/server/table/store/service';
import type { RouteHandlerObject } from '$lib/types';
import { Effect } from 'effect';

export function findEffect(
	handler: RouteHandlerObject,
	context: DispatchContext,
): Effect.Effect<ActionBody, TableNotFound | RowNotFound, TableStore> {
	return Effect.gen(function* () {
		if (typeof handler.model !== 'string') return yield* new TableNotFound({ table: '' });

		const tables = yield* TableStore;
		const table = yield* tables.get(handler.model);
		const where = toRouteFilters(table, handler.where, context, 'where');
		if (where === null)
			return yield* new RowNotFound({ table: table.schema.name, where: handler.where });

		const found = lookup(table, 'find', where);
		if (!found || Array.isArray(found)) {
			return yield* new RowNotFound({ table: table.schema.name, where });
		}

		return { _tag: 'Json', value: projectRowScalar(found.row, table) };
	});
}
