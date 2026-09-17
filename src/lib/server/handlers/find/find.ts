import { projectRowScalar, requireTable } from '$lib/server/handlers/project';
import { json, notFound } from '$lib/server/handlers/respond/respond';
import { toRouteFilters, type DispatchContext } from '$lib/server/handlers/sources/sources';
import { lookup } from '$lib/server/table';
import type { RouteHandlerObject } from '$lib/types';

export function findAction(handler: RouteHandlerObject, context: DispatchContext): Response {
	const table = requireTable(handler);
	if (!table) return json({ error: 'Unknown table' }, 400);

	const where = toRouteFilters(table, handler.where, context, 'where');
	if (where === null) return notFound();

	const found = lookup(table, 'find', where);
	if (!found || Array.isArray(found)) return notFound();
	return json(projectRowScalar(found.row, table));
}
