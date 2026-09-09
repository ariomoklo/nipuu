import { validate, type Payload } from '$lib/server/model';
import { projectRowScalar, requireTable } from '$lib/server/handlers/project';
import { json, mapResponse, notFound, validationError } from '$lib/server/handlers/respond';
import {
	resolveFieldValue,
	toRouteFilters,
	type DispatchContext
} from '$lib/server/handlers/sources/sources';
import { lookup, toStore, update, type Table } from '$lib/server/table';
import type { RouteHandlerObject } from '$lib/types';

function buildPatch(
	table: Table,
	handler: RouteHandlerObject,
	context: DispatchContext,
	current: Payload
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

export function updateAction(handler: RouteHandlerObject, context: DispatchContext): Response {
	const table = requireTable(handler);
	if (!table) return json({ error: 'Unknown table' }, 400);

	const where = toRouteFilters(table, handler.where, context, 'where');
	if (where === null) return notFound();

	const payload = context.body == null ? {} : context.body;
	const result = validate([table.schema], toStore(), table.schema.name, payload, { partial: true });
	if (!result.ok) return validationError(result.errors);

	const found = lookup(table, 'find', where);
	if (!found || Array.isArray(found)) return notFound();

	const patch = buildPatch(table, handler, context, projectRowScalar(found.row, table));
	const updated = update(table, where, patch);
	if (!updated) return notFound();
	return mapResponse(handler, projectRowScalar(updated, table));
}
