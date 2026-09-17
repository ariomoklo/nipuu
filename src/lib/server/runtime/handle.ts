import type { RequestEvent } from '@sveltejs/kit';
import { dispatch, notFound, type DispatchContext } from '$lib/server/handlers';
import { waitDelay } from '$lib/server/handlers/delay/delay';
import { mapResponse } from '$lib/server/handlers/respond/respond';
import { appendLog } from '$lib/server/logs';
import { runPlugins } from '$lib/server/plugin';
import { applyPreset } from '$lib/server/preset';
import { matchRoute } from '$lib/server/router';
import { getConfig } from '$lib/server/runtime';
import type { LogEntry, RouteHandler } from '$lib/types';

async function readBody(request: Request): Promise<unknown> {
	const raw = await request.text();
	if (!raw) return null;
	try {
		return JSON.parse(raw);
	} catch {
		return raw;
	}
}

async function peekBody(response: Response): Promise<unknown> {
	const clone = response.clone();
	const raw = await clone.text();
	if (!raw) return null;
	const contentType = response.headers.get('content-type') ?? '';
	if (contentType.includes('application/json')) {
		try {
			return JSON.parse(raw);
		} catch {
			return raw;
		}
	}

	return raw;
}

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

export async function handleRequest(event: RequestEvent): Promise<Response> {
	const requestId = crypto.randomUUID();
	const startedAt = Date.now();
	event.locals.requestId = requestId;
	event.locals.startedAt = startedAt;

	const method = event.request.method;
	const pathname = event.url.pathname;
	const params: Record<string, string> = {};
	const queries = Object.fromEntries(event.url.searchParams.entries());
	const requestHeaders = Object.fromEntries(event.request.headers.entries());
	const requestBody = await readBody(event.request);
	const context: DispatchContext = {
		method,
		path: pathname,
		params,
		queries,
		body: requestBody,
	};

	const matched = matchRoute(getConfig().ROUTE, method, pathname);
	let handler: RouteHandler | undefined;
	let response: Response;

	if (!matched) {
		response = notFound();
	} else {
		Object.assign(params, matched.params);
		handler = matched.handler as RouteHandler;
		response = dispatch(handler, context);
		await waitDelay(handler);
	}

	const actionBody = await peekBody(response);
	const afterPreset = await applyPreset(response, actionBody, context);
	const mapped = mapIfRoute(handler, actionBody, context, afterPreset);
	const finalResponse = await runPlugins(mapped, context);
	const responseBody = finalResponse === response ? actionBody : await peekBody(finalResponse);
	appendLog({
		id: requestId,
		requestId,
		at: new Date(startedAt).toISOString(),
		method,
		path: pathname,
		params,
		queries,
		requestHeaders,
		requestBody,
		status: finalResponse.status,
		responseHeaders: Object.fromEntries(finalResponse.headers.entries()),
		responseBody,
		duration: Date.now() - startedAt,
	} satisfies LogEntry);

	return finalResponse;
}
