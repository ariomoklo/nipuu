import { runAppSync } from '$lib/server/effect/runtime';
import { toResponse } from '$lib/server/handlers/outcome';
import type { DispatchContext } from '$lib/server/handlers/sources/sources';
import type { RouteHandler } from '$lib/types';

export function dispatch(handler: RouteHandler, context: DispatchContext): Response {
	return runAppSync(toResponse(handler, context));
}

export { notFound, validationError } from '$lib/server/handlers/respond/respond';
export type { DispatchContext };
