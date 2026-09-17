import { validate } from '$lib/server/model';
import { projectRowScalar, requireTable } from '$lib/server/handlers/project';
import { json, validationError } from '$lib/server/handlers/respond/respond';
import type { DispatchContext } from '$lib/server/handlers/sources/sources';
import { toStore, upsert } from '$lib/server/table';
import type { RouteHandlerObject } from '$lib/types';

export function upsertAction(handler: RouteHandlerObject, context: DispatchContext): Response {
	const table = requireTable(handler);
	if (!table) return json({ error: 'Unknown table' }, 400);

	const result = validate([table.schema], toStore(), table.schema.name, context.body);
	if (!result.ok) return validationError(result.errors);

	const row = upsert(table, result.data);
	return json(projectRowScalar(row, table));
}
