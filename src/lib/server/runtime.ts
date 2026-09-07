import type { RequestEvent } from '@sveltejs/kit';
import { loadConfig, readSeedCount, type NipuuConfig } from '$lib/server/config';
import { dispatch, notFound, validationError } from '$lib/server/handlers';
import { LogStore } from '$lib/server/logs';
import {
	compileModel,
	seedStore,
	validate,
	type CompiledTable,
	type Store
} from '$lib/server/model';
import { matchRoute } from '$lib/server/router';
import type { LogEntry, RouteHandler } from '$lib/types';

const RUNTIME_KEY = Symbol.for('nipuu.runtime');
const RUNTIME_PROMISE_KEY = Symbol.for('nipuu.runtime.promise');

type GlobalRuntime = typeof globalThis & {
	[RUNTIME_KEY]?: NipuuRuntime;
	[RUNTIME_PROMISE_KEY]?: Promise<NipuuRuntime>;
};

export class NipuuRuntime {
	#config: NipuuConfig;
	#tables: CompiledTable[];
	#store: Store;
	logs: LogStore;

	constructor(config: NipuuConfig, tables: CompiledTable[], store: Store, logs: LogStore) {
		this.#config = config;
		this.#tables = tables;
		this.#store = store;
		this.logs = logs;
	}

	get store(): Store {
		return this.#store;
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
			const validation = validateMutating(this.#tables, this.#store, method, handler, requestBody);
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

function validateMutating(
	tables: CompiledTable[],
	store: Store,
	method: string,
	handler: RouteHandler,
	body: unknown
): Response | null {
	if (method !== 'POST' && method !== 'PUT') return null;
	if (typeof handler !== 'object' || handler === null) return null;
	if (typeof handler.model !== 'string') return null;

	const payload = method === 'PUT' && body == null ? {} : body;
	const result = validate(tables, store, handler.model, payload, { partial: method === 'PUT' });
	if (!result.ok) return validationError(result.errors);
	return null;
}

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

async function createRuntime(): Promise<NipuuRuntime> {
	const config = await loadConfig();
	const tables = compileModel(config.MODEL);
	const store = seedStore(tables, readSeedCount());
	return new NipuuRuntime(config, tables, store, new LogStore());
}

export async function initRuntime(): Promise<NipuuRuntime> {
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

export function getRuntime(): NipuuRuntime {
	const runtime = (globalThis as GlobalRuntime)[RUNTIME_KEY];
	if (!runtime) {
		throw new Error('Nipuu runtime is not initialized');
	}
	return runtime;
}
