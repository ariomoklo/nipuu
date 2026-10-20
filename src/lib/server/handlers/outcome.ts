import {
	bodyResponse,
	json,
	notFound,
	serverError,
	text,
	validationError,
} from '$lib/server/handlers/respond/respond';
import { deleteEffect } from '$lib/server/handlers/delete/delete';
import type { ActionBody } from '$lib/server/handlers/errors';
import { InvalidStatic, UnknownAction } from '$lib/server/handlers/errors';
import { findEffect } from '$lib/server/handlers/find/find';
import { searchEffect } from '$lib/server/handlers/search/search';
import type { DispatchContext } from '$lib/server/handlers/sources/sources';
import { staticEffect } from '$lib/server/handlers/static/static';
import { updateEffect } from '$lib/server/handlers/update/update';
import { upsertEffect } from '$lib/server/handlers/upsert/upsert';
import { ValidationFailed } from '$lib/server/model/validate/validate';
import { RowNotFound, TableNotFound, type TableStore } from '$lib/server/table/store/service';
import type { RouteHandler, RouteHandlerObject } from '$lib/types';
import { Effect, Match } from 'effect';

export type { ActionBody } from '$lib/server/handlers/errors';
export { InvalidStatic, UnknownAction } from '$lib/server/handlers/errors';

export type HandlerError =
	| TableNotFound
	| RowNotFound
	| ValidationFailed
	| UnknownAction
	| InvalidStatic;

function isRecord(handler: RouteHandler): handler is RouteHandlerObject {
	return typeof handler === 'object' && handler !== null;
}

export function dispatchEffect(
	handler: RouteHandler,
	context: DispatchContext,
): Effect.Effect<ActionBody, HandlerError, TableStore> {
	if (typeof handler === 'string' || typeof handler === 'number') {
		return Effect.succeed({ _tag: 'Text', value: handler });
	}

	if (!isRecord(handler)) return Effect.fail(new UnknownAction());

	const run = Match.type<RouteHandlerObject>().pipe(
		Match.when(
			(route) => route.action === 'static',
			(value) => staticEffect(value),
		),
		Match.when(
			(route) => route.action === 'search',
			(value) => searchEffect(value, context),
		),
		Match.when(
			(route) => route.action === 'find',
			(value) => findEffect(value, context),
		),
		Match.when(
			(route) => route.action === 'upsert',
			(value) => upsertEffect(value, context),
		),
		Match.when(
			(route) => route.action === 'update',
			(value) => updateEffect(value, context),
		),
		Match.when(
			(route) => route.action === 'delete',
			(value) => deleteEffect(value, context),
		),
		Match.orElse(() => Effect.fail(new UnknownAction())),
	);

	return run(handler);
}

function successResponse(body: ActionBody): Response {
	if (body._tag === 'Text') return text(body.value);
	if (body._tag === 'Body') return bodyResponse(body.value);
	return json(body.value);
}

export function toResponse(
	handler: RouteHandler,
	context: DispatchContext,
): Effect.Effect<Response, never, TableStore> {
	return dispatchEffect(handler, context).pipe(
		Effect.map(successResponse),
		Effect.catchTags({
			TableNotFound: () => Effect.succeed(json({ error: 'Unknown table' }, 400)),
			RowNotFound: () => Effect.succeed(notFound()),
			ValidationFailed: (error) => Effect.succeed(validationError([...error.errors])),
			UnknownAction: () => Effect.succeed(json({ error: 'Unknown action' }, 400)),
			InvalidStatic: () => Effect.succeed(serverError('Invalid static response')),
		}),
	);
}
