import { projectRowScalar } from '$lib/server/handlers/project';
import type { ActionBody } from '$lib/server/handlers/errors';
import type { DispatchContext } from '$lib/server/handlers/sources/sources';
import { ValidationFailed, validateEffect } from '$lib/server/model/validate/validate';
import { TableNotFound, TableStore } from '$lib/server/table/store/service';
import type { RouteHandlerObject } from '$lib/types';
import { Effect } from 'effect';

export function upsertEffect(
	handler: RouteHandlerObject,
	context: DispatchContext,
): Effect.Effect<ActionBody, TableNotFound | ValidationFailed, TableStore> {
	return Effect.gen(function* () {
		if (typeof handler.model !== 'string') return yield* new TableNotFound({ table: '' });

		const tables = yield* TableStore;
		const table = yield* tables.get(handler.model);
		const store = yield* tables.snapshot;
		const data = yield* validateEffect([table.schema], store, table.schema.name, context.body);
		const row = yield* tables.upsert(table.schema.name, data);
		return { _tag: 'Json', value: projectRowScalar(row, table) };
	});
}
