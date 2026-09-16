import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { dispatch } from '$lib/server/handlers';
import { generateSchemas, type ModelDefinition } from '$lib/server/model';
import { createTables, resetTables, toStore } from '$lib/server/table';

const model: ModelDefinition = {
	todos: (t) => ({
		id: t.id.index(),
		title: t
			.string()
			.required()
			.factory(({ index }) => `Todo ${index}`),
		owner: t.id.uuid().required().rel('users', { field: 'id' }),
		completed: t.boolean().default(false),
	}),
	users: (t) => ({
		id: t.id.uuid(),
		name: t
			.string()
			.required()
			.factory(({ index }) => `User ${index}`),
		email: t
			.string()
			.required()
			.factory(({ index }) => `user.${index}@example.com`),
	}),
};

const searchHandler = {
	action: 'search',
	model: 'todos',
	filter: {
		title: { source: 'queries', key: 'q', by: 'include' },
		completed: { source: 'queries', key: 'completed', by: 'equal' },
	},
	sort: {
		sortBy: { source: 'queries', key: 'sortBy' },
		orderBy: { source: 'queries', key: 'orderBy' },
	},
	pagination: {
		type: 'cursor',
		start: { source: 'queries', key: 'from' },
		end: { source: 'queries', key: 'to' },
		limit: { source: 'queries', key: 'limit' },
	},
} as const;

beforeEach(() => {
	createTables(generateSchemas(model), 3);
});

afterEach(() => {
	resetTables();
});

describe('searchAction', () => {
	it('returns projected rows with scalar relation ids', async () => {
		const res = dispatch(
			{ action: 'search', model: 'todos' },
			{ params: {}, queries: {}, body: null },
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body).toHaveLength(3);
		expect(body[0]).toEqual({
			id: 1,
			title: 'Todo 1',
			owner: expect.any(String),
			completed: false,
		});
	});

	it('filters by include and equal, sorts, and slices a cursor page', async () => {
		const filtered = dispatch(searchHandler, {
			params: {},
			queries: { q: 'Todo 1' },
			body: null,
		});
		expect(await filtered.json()).toEqual([expect.objectContaining({ id: 1, title: 'Todo 1' })]);

		const sorted = dispatch(searchHandler, {
			params: {},
			queries: { sortBy: 'title', orderBy: 'desc' },
			body: null,
		});
		expect((await sorted.json()).map((row: { title: string }) => row.title)).toEqual([
			'Todo 3',
			'Todo 2',
			'Todo 1',
		]);

		const page = dispatch(searchHandler, {
			params: {},
			queries: { from: '1', to: '3', limit: '1' },
			body: null,
		});
		expect(await page.json()).toEqual([expect.objectContaining({ id: 2, title: 'Todo 2' })]);
	});

	it('joins via response({ data, model })', async () => {
		const res = dispatch(
			{
				action: 'search',
				model: 'todos',
				response: ({
					data,
					model: store,
				}: {
					data: { owner: string }[];
					model: Record<string, { id: string }[]>;
				}) => ({
					todos: data.map((todo: { owner: string }) =>
						store.users.find((user: { id: string }) => todo.owner === user.id),
					),
					total: data.length,
				}),
			},
			{ params: {}, queries: {}, body: null },
		);
		const body = await res.json();
		expect(body.total).toBe(3);
		expect(body.todos[0]).toEqual(
			expect.objectContaining({
				id: expect.any(String),
				name: expect.stringMatching(/^User /),
			}),
		);
	});

	it('filters by where from params', async () => {
		const owner = toStore().users[0]!.id.value as string;
		const res = dispatch(
			{
				action: 'search',
				model: 'todos',
				where: { owner: { source: 'params', key: 'id', by: 'equal' } },
			},
			{ params: { id: owner }, queries: {}, body: null },
		);
		const body = await res.json();
		expect(body.every((todo: { owner: string }) => todo.owner === owner)).toBe(true);
	});

	it('returns 400 for an unknown table', async () => {
		const res = dispatch(
			{ action: 'search', model: 'missing' },
			{ params: {}, queries: {}, body: null },
		);
		expect(res.status).toBe(400);
		expect(await res.json()).toEqual({ error: 'Unknown table' });
	});

	it('returns 500 when response is present but not a function', async () => {
		const res = dispatch(
			{ action: 'search', model: 'todos', response: { bad: true } },
			{ params: {}, queries: {}, body: null },
		);
		expect(res.status).toBe(500);
		expect(await res.json()).toEqual({ error: 'Invalid response' });
	});
});
