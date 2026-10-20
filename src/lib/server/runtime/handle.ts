import { NipuuConfig } from '$lib/server/app/services';
import { delayFor } from '$lib/server/handlers/delay/delay';
import { toResponse } from '$lib/server/handlers/outcome';
import { mapResponse, notFound, serverError } from '$lib/server/handlers/respond/respond';
import type { DispatchContext } from '$lib/server/handlers/sources/sources';
import { LogStore } from '$lib/server/logs/service';
import { runPluginsEffect } from '$lib/server/plugin';
import { applyPresetEffect } from '$lib/server/preset';
import { matchRoute } from '$lib/server/router';
import type { LogEntry, RouteHandler } from '$lib/types';
import { Clock, Effect, Exit } from 'effect';

const readBody = Effect.fn('nipuu.readBody')(function* (request: Request) {
	const raw = yield* Effect.tryPromise({
		try: () => request.text(),
		catch: () => new Error('body'),
	}).pipe(Effect.orElseSucceed(() => ''));

	if (!raw) return null;

	return yield* Effect.try({
		try: () => JSON.parse(raw) as unknown,
		catch: () => new Error('json'),
	}).pipe(Effect.orElseSucceed(() => raw));
});

const peekBody = Effect.fn('nipuu.peekBody')(function* (response: Response) {
	const raw = yield* Effect.tryPromise({
		try: () => response.clone().text(),
		catch: () => new Error('peek'),
	}).pipe(Effect.orElseSucceed(() => ''));

	if (!raw) return null;

	const contentType = response.headers.get('content-type') ?? '';
	if (!contentType.includes('application/json')) return raw;

	return yield* Effect.try({
		try: () => JSON.parse(raw) as unknown,
		catch: () => new Error('json'),
	}).pipe(Effect.orElseSucceed(() => raw));
});

function mapIfRoute(
	handler: RouteHandler | undefined,
	data: unknown,
	context: DispatchContext,
	response: Response,
): Response {
	if (handler === undefined) return response;
	if (typeof handler === 'string' || typeof handler === 'number') return response;
	if (typeof handler !== 'object' || handler === null) return response;
	if (handler.action === 'static') return response;

	return mapResponse(handler, data, context, response);
}

const runAction = Effect.fn('nipuu.runAction')(function* (
	handler: RouteHandler,
	context: DispatchContext,
) {
	const response = yield* toResponse(handler, context);
	yield* delayFor(handler);
	return response;
});

export const handleRequestEffect = Effect.fn('nipuu.handleRequest')(function* (
	request: Request,
	url: URL,
) {
	const requestId = yield* Effect.sync(() => crypto.randomUUID());
	const startedAt = yield* Clock.currentTimeMillis;

	const method = request.method;
	const pathname = url.pathname;
	const queries = Object.fromEntries(url.searchParams.entries());
	const requestHeaders = Object.fromEntries(request.headers.entries());
	const params: Record<string, string> = {};
	const bag = {
		requestBody: null as unknown,
		responseBody: null as unknown,
		status: 500,
		responseHeaders: {} as Record<string, string>,
	};

	const remember = (response: Response, body: unknown) => {
		bag.status = response.status;
		bag.responseHeaders = Object.fromEntries(response.headers.entries());
		bag.responseBody = body;
	};

	const work = Effect.gen(function* () {
		yield* Effect.log('request');
		const requestBody = yield* readBody(request);
		bag.requestBody = requestBody;
		const context: DispatchContext = { method, path: pathname, params, queries, body: requestBody };
		const config = yield* NipuuConfig;
		const matched = matchRoute(config.ROUTE, method, pathname);

		let handler: RouteHandler | undefined;
		let response: Response;

		if (!matched) {
			response = notFound();
		} else {
			Object.assign(params, matched.params);
			handler = matched.handler as RouteHandler;
			response = yield* runAction(handler, context);
		}

		const actionBody = yield* peekBody(response);
		const afterPreset = yield* applyPresetEffect(config.PRESET, response, actionBody, context).pipe(
			Effect.catchTag('UserCodeFailed', () => Effect.succeed(serverError('Preset failed'))),
		);
		const mapped = yield* Effect.try({
			try: () => mapIfRoute(handler, actionBody, context, afterPreset),
			catch: (cause) => cause,
		}).pipe(Effect.tapError((cause) => Effect.logError('response mapper failed', cause)));
		const finalResponse = yield* runPluginsEffect(config.PLUGIN, mapped, context).pipe(
			Effect.catchTag('InvalidPlugin', () => Effect.succeed(serverError('Invalid plugin'))),
			Effect.catchTag('UserCodeFailed', () => Effect.succeed(serverError('Plugin failed'))),
		);
		const responseBody = finalResponse === response ? actionBody : yield* peekBody(finalResponse);
		remember(finalResponse, responseBody);
		return finalResponse;
	}).pipe(
		Effect.annotateLogs({ requestId, method, path: pathname }),
		Effect.onExit((exit) =>
			Effect.gen(function* () {
				const ended = yield* Clock.currentTimeMillis;
				const status = Exit.isSuccess(exit) ? bag.status : 500;
				const logs = yield* LogStore;
				const entry: LogEntry = {
					id: requestId,
					requestId,
					at: new Date(startedAt).toISOString(),
					method,
					path: pathname,
					params,
					queries,
					requestHeaders,
					requestBody: bag.requestBody,
					status,
					responseHeaders: bag.responseHeaders,
					responseBody: bag.responseBody,
					duration: ended - startedAt,
				};
				yield* logs.append(entry);
			}).pipe(Effect.ignoreCause({ log: false })),
		),
		Effect.catchCause(() => Effect.succeed(serverError('Invalid response'))),
	);

	return yield* work;
});
