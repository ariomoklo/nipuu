import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DispatchContext } from '$lib/server/handlers';
import { generateSchemas, type ModelDefinition } from '$lib/server/model';
import { applyPreset } from '$lib/server/preset';
import { createTables, resetTables } from '$lib/server/table';
import type { PresetContext, PresetDefinition } from '$lib/types';

const state = vi.hoisted(() => ({ preset: undefined as PresetDefinition | undefined }));

vi.mock('$lib/server/runtime', () => ({
	getConfig: () => ({ PRESET: state.preset }),
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

beforeEach(() => {
	createTables(generateSchemas(model), 2);
});

afterEach(() => {
	state.preset = undefined;
	resetTables();
});

describe('applyPreset', () => {
	it('returns the original response when no PRESET is configured', async () => {
		const original = new Response('{}', { status: 404 });
		expect(await applyPreset(original, {}, context())).toBe(original);
	});

	it('returns the original response when nothing matches', async () => {
		state.preset = { POST: { 404: { error: 'nope' } } };
		const original = new Response('{}', { status: 404 });
		expect(await applyPreset(original, {}, context())).toBe(original);

		state.preset = { GET: { 500: { error: 'nope' } } };
		expect(await applyPreset(original, {}, context())).toBe(original);
	});

	it('replaces the body from a matching method and keeps the status', async () => {
		state.preset = { GET: { 404: { error: 'Nothing here' } } };
		const res = await applyPreset(new Response('{}', { status: 404 }), {}, context());
		expect(res.status).toBe(404);
		expect(res.headers.get('content-type')).toBe('application/json');
		expect(await res.json()).toEqual({ error: 'Nothing here' });
	});

	it('serializes a primitive leaf as text/plain', async () => {
		state.preset = { GET: { 404: 'gone' } };
		const res = await applyPreset(new Response('{}', { status: 404 }), {}, context());
		expect(res.status).toBe(404);
		expect(res.headers.get('content-type')).toBe('text/plain; charset=utf-8');
		expect(await res.text()).toBe('gone');
	});

	it('matches a wildcard method', async () => {
		state.preset = { '*': { 500: { error: 'boom' } } };
		const res = await applyPreset(
			new Response('{}', { status: 500 }),
			{},
			context({ method: 'DELETE' }),
		);
		expect(await res.json()).toEqual({ error: 'boom' });
	});

	it('prefers an exact method over the wildcard method', async () => {
		state.preset = {
			'*': { 404: { from: 'any' } },
			GET: { 404: { from: 'get' } },
		};
		const res = await applyPreset(new Response('{}', { status: 404 }), {}, context());
		expect(await res.json()).toEqual({ from: 'get' });
	});

	it('falls through a matching method that has no entry for the status', async () => {
		state.preset = {
			GET: { 400: { from: 'get' } },
			'*': { 404: { from: 'any' } },
		};
		const res = await applyPreset(new Response('{}', { status: 404 }), {}, context());
		expect(await res.json()).toEqual({ from: 'any' });
	});

	it('matches a status glob such as 5**', async () => {
		state.preset = { GET: { '5**': 'something went wrong' } };
		const res500 = await applyPreset(new Response('{}', { status: 500 }), {}, context());
		expect(await res500.text()).toBe('something went wrong');

		const res502 = await applyPreset(new Response('{}', { status: 502 }), {}, context());
		expect(await res502.text()).toBe('something went wrong');
	});

	it('prefers an exact status over a glob', async () => {
		state.preset = { GET: { '5**': { from: 'glob' }, 500: { from: 'exact' } } };
		const res = await applyPreset(new Response('{}', { status: 500 }), {}, context());
		expect(await res.json()).toEqual({ from: 'exact' });
	});

	it('prefers a more specific glob over *', async () => {
		state.preset = { GET: { '*': { from: 'any' }, '5**': { from: '5xx' } } };
		const res = await applyPreset(new Response('{}', { status: 502 }), {}, context());
		expect(await res.json()).toEqual({ from: '5xx' });
	});

	it('leaves the built-in body when a glob does not match', async () => {
		state.preset = { GET: { '5**': { error: 'boom' } } };
		const original = new Response('{}', { status: 404 });
		expect(await applyPreset(original, {}, context())).toBe(original);
	});

	it('overrides every method and status with a * / * catch-all', async () => {
		state.preset = { '*': { '*': 'base default fallback' } };
		const notFound = await applyPreset(
			new Response('{}', { status: 404 }),
			{},
			context({ method: 'POST' }),
		);
		expect(notFound.status).toBe(404);
		expect(await notFound.text()).toBe('base default fallback');

		const ok = await applyPreset(new Response('{}', { status: 200 }), {}, context());
		expect(ok.status).toBe(200);
		expect(await ok.text()).toBe('base default fallback');
	});

	it('lets a more specific leaf beat the * / * catch-all', async () => {
		state.preset = {
			'*': { '*': 'base default fallback', 404: { error: 'Nothing here' } },
			GET: { 404: { error: 'get miss' } },
		};
		const get404 = await applyPreset(new Response('{}', { status: 404 }), {}, context());
		expect(await get404.json()).toEqual({ error: 'get miss' });

		const post404 = await applyPreset(
			new Response('{}', { status: 404 }),
			{},
			context({ method: 'POST' }),
		);
		expect(await post404.json()).toEqual({ error: 'Nothing here' });

		const get200 = await applyPreset(new Response('{}', { status: 200 }), {}, context());
		expect(await get200.text()).toBe('base default fallback');
	});

	it('gives a function leaf the preset context without response', async () => {
		let seen: PresetContext | undefined;
		state.preset = {
			GET: {
				404: (ctx: PresetContext) => {
					seen = ctx;
					return { error: `todo ${ctx.params.id} not found` };
				},
			},
		};

		const res = await applyPreset(
			new Response('{}', { status: 404 }),
			{ error: 'Not Found' },
			context({ queries: { q: 'x' } }),
		);

		expect(await res.json()).toEqual({ error: 'todo 99 not found' });
		expect(seen).toMatchObject({
			data: { error: 'Not Found' },
			status: 404,
			method: 'GET',
			path: '/todos/99',
			params: { id: '99' },
			queries: { q: 'x' },
			body: null,
		});
		expect(seen).not.toHaveProperty('response');
		expect(seen?.model.todos).toHaveLength(2);
	});

	it('uses a returned Response as-is', async () => {
		state.preset = {
			GET: {
				404: () =>
					new Response('custom', {
						status: 410,
						headers: { 'x-preset': 'yes' },
					}),
			},
		};

		const res = await applyPreset(new Response('{}', { status: 404 }), {}, context());
		expect(res.status).toBe(410);
		expect(res.headers.get('x-preset')).toBe('yes');
		expect(await res.text()).toBe('custom');
	});
});
