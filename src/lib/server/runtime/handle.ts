import type { RequestEvent } from '@sveltejs/kit';
import { dispatch, notFound, validateMutating } from '$lib/server/handlers';
import { appendLog } from '$lib/server/logs';
import { matchRoute } from '$lib/server/router';
import { getConfig, getSchemas } from '$lib/server/runtime';
import { toStore } from '$lib/server/table';
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

	const matched = matchRoute(getConfig().ROUTE, method, pathname);
	let response: Response;

	if (!matched) {
		response = notFound();
	} else {
		Object.assign(params, matched.params);
		const handler = matched.handler as RouteHandler;
		const validation = validateMutating(getSchemas(), toStore(), method, handler, requestBody);
		response = validation ?? dispatch(handler, { params, queries });
	}

	const responseBody = await peekBody(response);
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
		status: response.status,
		responseHeaders: Object.fromEntries(response.headers.entries()),
		responseBody,
		duration: Date.now() - startedAt
	} satisfies LogEntry);

	return response;
}
