import { deleteAction } from '$lib/server/handlers/delete/delete';
import { findAction } from '$lib/server/handlers/find/find';
import { json, text } from '$lib/server/handlers/respond/respond';
import { searchAction } from '$lib/server/handlers/search/search';
import type { DispatchContext } from '$lib/server/handlers/sources/sources';
import { staticAction } from '$lib/server/handlers/static/static';
import { updateAction } from '$lib/server/handlers/update/update';
import { upsertAction } from '$lib/server/handlers/upsert/upsert';
import type { RouteHandler } from '$lib/types';

export function dispatch(handler: RouteHandler, context: DispatchContext): Response {
	if (typeof handler === 'string' || typeof handler === 'number') {
		return text(handler);
	}

	if (typeof handler !== 'object' || handler === null) {
		return json({ error: 'Unknown action' }, 400);
	}

	switch (handler.action) {
		case 'static':
			return staticAction(handler);
		case 'search':
			return searchAction(handler, context);
		case 'find':
			return findAction(handler, context);
		case 'upsert':
			return upsertAction(handler, context);
		case 'update':
			return updateAction(handler, context);
		case 'delete':
			return deleteAction(handler, context);
		default:
			return json({ error: 'Unknown action' }, 400);
	}
}

export { notFound, validationError } from '$lib/server/handlers/respond/respond';
export type { DispatchContext };
