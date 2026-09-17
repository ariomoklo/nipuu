import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DispatchContext } from '$lib/server/handlers';
import { generateSchemas, type ModelDefinition } from '$lib/server/model';
import { runPlugins } from '$lib/server/plugin';
import { createTables, resetTables } from '$lib/server/table';
import type { PluginContext, PluginDefinition } from '$lib/types';

const state = vi.hoisted(() => ({ plugin: undefined as PluginDefinition | undefined }));

vi.mock('$lib/server/runtime', () => ({
	getConfig: () => ({ PLUGIN: state.plugin }),
}));

const model: ModelDefinition = {
	todos: (t) => ({
		id: t.id.index(),
		title: t
			.string()
			.required()
			.factory(({ index }) => `Todo ${index}`),
		completed: t.boolean().default(false),
	}),
};

function context(overrides: Partial<DispatchContext> = {}): DispatchContext {
	return {
		method: 'GET',
		path: '/todos/99',
		params: { id: '99' },
		queries: {},
		body: null,
		...overrides,
	};
}

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'content-type': 'application/json' },
	});
}

beforeEach(() => {
	createTables(generateSchemas(model), 2);
});

afterEach(() => {
	state.plugin = undefined;
	resetTables();
});

describe('runPlugins', () => {
	it('returns the original response when no PLUGIN is configured', async () => {
		const original = jsonResponse({ id: 1 });
		expect(await runPlugins(original, context())).toBe(original);
	});

	it('returns the original response when PLUGIN is empty', async () => {
		state.plugin = [];
		const original = jsonResponse({ id: 1 });
		expect(await runPlugins(original, context())).toBe(original);
	});

	it('runs plugins in index order and passes the response along', async () => {
		const seen: string[] = [];
		state.plugin = [
			async ({ response }) => {
				seen.push(`fnA:${await response.clone().text()}`);
				return { step: 'a' };
			},
			async ({ response }) => {
				seen.push(`fnB:${await response.clone().text()}`);
				return { step: 'b' };
			},
			async ({ response }) => {
				seen.push(`handleC:${await response.clone().text()}`);
				return { step: 'c' };
			},
		];

		const res = await runPlugins(jsonResponse({ step: 'route' }), context());
		expect(seen).toEqual(['fnA:{"step":"route"}', 'fnB:{"step":"a"}', 'handleC:{"step":"b"}']);
		expect(await res.json()).toEqual({ step: 'c' });
	});

	it('serializes a plain return as JSON at the incoming status', async () => {
		state.plugin = [({ status }) => ({ wrapped: true, status })];
		const res = await runPlugins(jsonResponse({ id: 1 }, 404), context());
		expect(res.status).toBe(404);
		expect(res.headers.get('content-type')).toBe('application/json');
		expect(await res.json()).toEqual({ wrapped: true, status: 404 });
	});

	it('uses a returned Response as-is', async () => {
		state.plugin = [
			() =>
				new Response('custom', {
					status: 410,
					headers: { 'x-plugin': 'yes' },
				}),
		];

		const res = await runPlugins(jsonResponse({ id: 1 }), context());
		expect(res.status).toBe(410);
		expect(res.headers.get('x-plugin')).toBe('yes');
		expect(await res.text()).toBe('custom');
	});

	it('carries a returned Response into the next plugin', async () => {
		state.plugin = [
			() => new Response('first', { status: 418, headers: { 'x-plugin': 'first' } }),
			({ status, response }) => ({ status, header: response.headers.get('x-plugin') }),
		];

		const res = await runPlugins(jsonResponse({ id: 1 }), context());
		expect(res.status).toBe(418);
		expect(await res.json()).toEqual({ status: 418, header: 'first' });
	});

	it('gives a plugin with no return an empty JSON body at the incoming status', async () => {
		state.plugin = [() => undefined];
		const res = await runPlugins(jsonResponse({ id: 1 }, 201), context());
		expect(res.status).toBe(201);
		expect(await res.text()).toBe('');
	});

	it('gives each plugin the plugin context with response and without data', async () => {
		let seen: PluginContext | undefined;
		state.plugin = [
			(ctx) => {
				seen = ctx;
				return { ok: true };
			},
		];

		await runPlugins(
			jsonResponse({ id: 1 }, 404),
			context({ method: 'POST', queries: { q: 'x' }, body: { title: 'a' } }),
		);

		expect(seen).toMatchObject({
			status: 404,
			method: 'POST',
			path: '/todos/99',
			params: { id: '99' },
			queries: { q: 'x' },
			body: { title: 'a' },
		});
		expect(seen).not.toHaveProperty('data');
		expect(seen?.response).toBeInstanceOf(Response);
		expect(seen?.model.todos).toHaveLength(2);
	});

	it('awaits an async plugin', async () => {
		state.plugin = [
			async () => {
				await new Promise((resolve) => setTimeout(resolve, 5));
				return { late: true };
			},
		];

		const res = await runPlugins(jsonResponse({ id: 1 }), context());
		expect(await res.json()).toEqual({ late: true });
	});

	it('returns 500 for a non-function entry', async () => {
		state.plugin = [{ not: 'a function' } as unknown as PluginDefinition[number]];
		const res = await runPlugins(jsonResponse({ id: 1 }), context());
		expect(res.status).toBe(500);
		expect(await res.json()).toEqual({ error: 'Invalid plugin' });
	});
});
