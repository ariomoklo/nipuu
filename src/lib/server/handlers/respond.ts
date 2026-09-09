import { projectStore } from '$lib/server/handlers/project';
import type { RouteHandlerObject } from '$lib/types';

export function json(data: unknown, status = 200): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: { 'content-type': 'application/json' }
	});
}

export function text(value: string | number | boolean | bigint, status = 200): Response {
	return new Response(String(value), {
		status,
		headers: { 'content-type': 'text/plain; charset=utf-8' }
	});
}

export function notFound(): Response {
	return json({ error: 'Not Found' }, 404);
}

export function validationError(errors: string[]): Response {
	return json({ error: 'Validation failed', details: errors }, 400);
}

export function serverError(error: string): Response {
	return json({ error }, 500);
}

export function mapResponse(handler: RouteHandlerObject, data: unknown): Response {
	if (!Object.hasOwn(handler, 'response') || handler.response === undefined) {
		return json(data);
	}

	if (typeof handler.response !== 'function') {
		return serverError('Invalid response');
	}

	return json(handler.response({ data, model: projectStore() }));
}
