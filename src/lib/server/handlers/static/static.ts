import type { ActionBody } from '$lib/server/handlers/errors';
import { InvalidStatic } from '$lib/server/handlers/errors';
import type { RouteHandlerObject } from '$lib/types';
import { Effect } from 'effect';

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

export function staticEffect(
	handler: RouteHandlerObject,
): Effect.Effect<ActionBody, InvalidStatic> {
	const value = handler.response;
	if (!isStaticResponse(value)) return Effect.fail(new InvalidStatic());

	return Effect.succeed({ _tag: 'Body', value });
}
