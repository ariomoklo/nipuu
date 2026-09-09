import { json, serverError, text } from '$lib/server/handlers/respond';
import type { RouteHandlerObject } from '$lib/types';

function isStaticResponse(value: unknown): boolean {
	if (value === null) return true;
	switch (typeof value) {
		case 'string':
		case 'number':
		case 'boolean':
		case 'bigint':
			return true;
		case 'object':
			return true;
		default:
			return false;
	}
}

export function staticAction(handler: RouteHandlerObject): Response {
	const value = handler.response;
	if (!isStaticResponse(value)) {
		return serverError('Invalid static response');
	}

	if (
		typeof value === 'string' ||
		typeof value === 'number' ||
		typeof value === 'boolean' ||
		typeof value === 'bigint'
	) {
		return text(value);
	}

	return json(value);
}
