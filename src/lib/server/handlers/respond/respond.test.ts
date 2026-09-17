import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { json, mapResponse } from '$lib/server/handlers/respond/respond';
import { generateSchemas, type ModelDefinition } from '$lib/server/model';
import { createTables, resetTables } from '$lib/server/table';
import type { RouteContext } from '$lib/types';

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

const context = {
	method: 'GET',
	path: '/todos/99',
	params: { id: '99' },
	queries: { q: 'x' },
	body: null,
};

beforeEach(() => {
	createTables(generateSchemas(model), 2);
});

afterEach(() => {
	resetTables();
});

describe('mapResponse', () => {
	it('keeps the incoming response when the handler has no mapper', async () => {
		const incoming = json({ error: 'Nothing here' }, 404);
		const res = mapResponse(
			{ action: 'find', model: 'todos' },
			{ error: 'Not Found' },
			context,
			incoming,
		);
		expect(res).toBe(incoming);
	});

	it('returns 500 when response is present but not a function', async () => {
		const res = mapResponse(
			{ action: 'search', model: 'todos', response: { bad: true } },
			[],
			context,
			json([]),
		);
		expect(res.status).toBe(500);
		expect(await res.json()).toEqual({ error: 'Invalid response' });
	});

	it('keeps the incoming status for a plain return', async () => {
		const incoming = json({ error: 'Not Found' }, 404);
		const res = mapResponse(
			{
				action: 'find',
				model: 'todos',
				response: ({ status, params }: RouteContext) =>
					status === 404 ? { error: `todo ${params.id} not found` } : null,
			},
			{ error: 'Not Found' },
			context,
			incoming,
		);
		expect(res.status).toBe(404);
		expect(await res.json()).toEqual({ error: 'todo 99 not found' });
	});

	it('gives the mapper the route context and honours a returned Response', async () => {
		let seen: RouteContext | undefined;
		const incoming = json([{ id: 1 }], 200);
		const res = mapResponse(
			{
				action: 'search',
				model: 'todos',
				response: (ctx: RouteContext) => {
					seen = ctx;
					return new Response('done', { status: 207, headers: { 'x-total': '3' } });
				},
			},
			[{ id: 1 }],
			context,
			incoming,
		);

		expect(res.status).toBe(207);
		expect(res.headers.get('x-total')).toBe('3');
		expect(await res.text()).toBe('done');
		expect(seen).toMatchObject({
			data: [{ id: 1 }],
			status: 200,
			method: 'GET',
			path: '/todos/99',
			params: { id: '99' },
			queries: { q: 'x' },
			body: null,
		});
		expect(seen?.response).toBe(incoming);
		expect(seen?.model.todos).toHaveLength(2);
	});
});
