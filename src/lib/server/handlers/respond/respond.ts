import { projectStore } from '$lib/server/handlers/project';
import type { DispatchContext } from '$lib/server/handlers/sources/sources';
import type { PluginContext, PresetContext, RouteContext, RouteHandlerObject } from '$lib/types';

function toDatalessContext(context: DispatchContext, status: number): Omit<PresetContext, 'data'> {
	return {
		model: projectStore(),
		status,
		method: context.method,
		path: context.path,
		params: context.params,
		queries: context.queries,
		body: context.body,
	};
}

function toBaseContext(data: unknown, context: DispatchContext, status: number): PresetContext {
	return { data, ...toDatalessContext(context, status) };
}

export function json(data: unknown, status = 200): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: { 'content-type': 'application/json' },
	});
}

export function text(value: string | number | boolean | bigint, status = 200): Response {
	return new Response(String(value), {
		status,
		headers: { 'content-type': 'text/plain; charset=utf-8' },
	});
}

export function bodyResponse(value: unknown, status = 200): Response {
	if (
		typeof value === 'string' ||
		typeof value === 'number' ||
		typeof value === 'boolean' ||
		typeof value === 'bigint'
	) {
		return text(value, status);
	}

	return json(value, status);
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

export function toPresetContext(
	data: unknown,
	context: DispatchContext,
	status: number,
): PresetContext {
	return toBaseContext(data, context, status);
}

export function toRouteContext(
	data: unknown,
	context: DispatchContext,
	response: Response,
): RouteContext {
	return {
		...toBaseContext(data, context, response.status),
		response,
	};
}

export function toPluginContext(context: DispatchContext, response: Response): PluginContext {
	return {
		...toDatalessContext(context, response.status),
		response,
	};
}

export function mapResponse(
	handler: RouteHandlerObject,
	data: unknown,
	context: DispatchContext,
	response: Response,
): Response {
	if (!Object.hasOwn(handler, 'response') || handler.response === undefined) {
		return response;
	}

	if (typeof handler.response !== 'function') {
		return serverError('Invalid response');
	}

	const mapped = (handler.response as (ctx: RouteContext) => unknown)(
		toRouteContext(data, context, response),
	);

	return mapped instanceof Response ? mapped : json(mapped, response.status);
}
