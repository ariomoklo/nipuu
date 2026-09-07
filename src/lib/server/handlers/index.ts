import type { RouteHandler, RouteHandlerObject } from '$lib/types';

export type DispatchContext = {
	params: Record<string, string>;
	queries: Record<string, string>;
};

function json(data: unknown, status = 200): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: { 'content-type': 'application/json' }
	});
}

export function dispatch(handler: RouteHandler, context: DispatchContext): Response {
	if (typeof handler === 'string' || typeof handler === 'number') {
		return new Response(String(handler), {
			status: 200,
			headers: { 'content-type': 'text/plain; charset=utf-8' }
		});
	}

	const objectHandler = handler as RouteHandlerObject;
	return json({
		_nipuu: {
			matched: true,
			action: objectHandler.action,
			model: objectHandler.model,
			params: context.params,
			queries: context.queries
		}
	});
}

export function notFound(): Response {
	return json({ error: 'Not Found' }, 404);
}

export function validationError(errors: string[]): Response {
	return json({ error: 'Validation failed', details: errors }, 400);
}
