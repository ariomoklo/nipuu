import type { Payload } from '$lib/server/model';
import { ValidationFailed, validateEffect } from '$lib/server/model/validate/validate';
import { projectRowScalar } from '$lib/server/handlers/project';
import type { ActionBody } from '$lib/server/handlers/errors';
import {
	resolveFieldValue,
	toRouteFilters,
	type DispatchContext,
} from '$lib/server/handlers/sources/sources';
import { lookup, type Table } from '$lib/server/table';
import { RowNotFound, TableNotFound, TableStore } from '$lib/server/table/store/service';
import type { RouteHandlerObject } from '$lib/types';
import { Effect } from 'effect';

function buildPatch(
	table: Table,
	handler: RouteHandlerObject,
	context: DispatchContext,
	current: Payload,
): Payload {
	const spec = handler.update;
	if (spec == null || typeof spec !== 'object' || Array.isArray(spec)) return {};

	const patch: Payload = {};
	for (const [fieldName, ref] of Object.entries(spec as Record<string, unknown>)) {
		if (!table.schema.fields[fieldName]) continue;
		if (typeof ref === 'function') {
			patch[fieldName] = (ref as (row: Payload) => unknown)(current);
			continue;
		}

		const value = resolveFieldValue(table, fieldName, ref, context);
		if (value === undefined) continue;
		patch[fieldName] = value;
	}

	return patch;
}

export function updateEffect(
	handler: RouteHandlerObject,
	context: DispatchContext,
): Effect.Effect<ActionBody, TableNotFound | RowNotFound | ValidationFailed, TableStore> {
	return Effect.gen(function* () {
		if (typeof handler.model !== 'string') return yield* new TableNotFound({ table: '' });

		const tables = yield* TableStore;
		const table = yield* tables.get(handler.model);
		const where = toRouteFilters(table, handler.where, context, 'where');
		if (where === null)
			return yield* new RowNotFound({ table: table.schema.name, where: handler.where });

		const payload = context.body == null ? {} : context.body;
		const store = yield* tables.snapshot;
		yield* validateEffect([table.schema], store, table.schema.name, payload, {
			partial: true,
		});
		const found = lookup(table, 'find', where);
		if (!found || Array.isArray(found)) {
			return yield* new RowNotFound({ table: table.schema.name, where });
		}

		const patch = buildPatch(table, handler, context, projectRowScalar(found.row, table));
		const updated = yield* tables.update(table.schema.name, where, patch);
		return { _tag: 'Json', value: projectRowScalar(updated, table) };
	});
}
