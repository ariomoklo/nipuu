import type { RequestEvent } from '@sveltejs/kit';
import { loadConfig, readSeedCount, type ConfigDefinition } from '$lib/server/runtime/config';
import { dispatch, notFound } from '$lib/server/handlers';
import { LogStore } from '$lib/server/logs';
import { generateSchemas, type Store, type Schema } from '$lib/server/model';
import { matchRoute } from '$lib/server/router';
import { peekBody, readBody, validateMutating } from '$lib/server/runtime/utils';
import { createTables, toStore } from '$lib/server/table';
import type { LogEntry, RouteHandler } from '$lib/types';

const RUNTIME_KEY = Symbol.for('nipuu.runtime');
const RUNTIME_PROMISE_KEY = Symbol.for('nipuu.runtime.promise');

type GlobalRuntime = typeof globalThis & {
	[RUNTIME_KEY]?: Runtime;
	[RUNTIME_PROMISE_KEY]?: Promise<Runtime>;
};

export class Runtime {
	#config: ConfigDefinition;
	#tables: Schema[];
	logs: LogStore;

	constructor(config: ConfigDefinition, tables: Schema[], logs: LogStore) {
		this.#config = config;
		this.#tables = tables;
		this.logs = logs;
	}

	get store(): Store {
		return toStore();
	}

	async handle(event: RequestEvent): Promise<Response> {
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

		const matched = matchRoute(this.#config.ROUTE, method, pathname);
		let response: Response;

		if (!matched) {
			response = notFound();
		} else {
			Object.assign(params, matched.params);
			const handler = matched.handler as RouteHandler;
			const validation = validateMutating(this.#tables, this.store, method, handler, requestBody);
			response = validation ?? dispatch(handler, { params, queries });
		}

		const responseBody = await peekBody(response);
		this.logs.append({
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
}

async function createRuntime(): Promise<Runtime> {
	const config = await loadConfig();
	const schemas = generateSchemas(config.MODEL);
	createTables(schemas, readSeedCount());

	return new Runtime(config, schemas, new LogStore());
}

export async function initRuntime(): Promise<Runtime> {
	const global = globalThis as GlobalRuntime;
	if (global[RUNTIME_KEY]) return global[RUNTIME_KEY];
	if (!global[RUNTIME_PROMISE_KEY]) {
		global[RUNTIME_PROMISE_KEY] = createRuntime().then((runtime) => {
			global[RUNTIME_KEY] = runtime;
			return runtime;
		});
	}
	return global[RUNTIME_PROMISE_KEY];
}

export function getRuntime(): Runtime {
	const runtime = (globalThis as GlobalRuntime)[RUNTIME_KEY];
	if (!runtime) {
		throw new Error('Nipuu runtime is not initialized');
	}
	return runtime;
}
