import { projectRowScalar, requireTable } from '$lib/server/handlers/project';
import { json, mapResponse, notFound } from '$lib/server/handlers/respond';
import { toRouteFilters, type DispatchContext } from '$lib/server/handlers/sources/sources';
import { deleteRow } from '$lib/server/table';
import type { RouteHandlerObject } from '$lib/types';

export function deleteAction(handler: RouteHandlerObject, context: DispatchContext): Response {
	const table = requireTable(handler);
	if (!table) return json({ error: 'Unknown table' }, 400);

	const where = toRouteFilters(table, handler.where, context, 'where');
	if (where === null) return notFound();

	const removed = deleteRow(table, where);
	if (!removed) return notFound();
	return mapResponse(handler, projectRowScalar(removed, table));
}
