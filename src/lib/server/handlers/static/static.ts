import { bodyResponse, serverError } from '$lib/server/handlers/respond/respond';
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

	return bodyResponse(value);
}
