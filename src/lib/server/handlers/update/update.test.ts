import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { dispatch } from '$lib/server/handlers';
import { generateSchemas, type ModelDefinition } from '$lib/server/model';
import { createTables, resetTables } from '$lib/server/table';
import type { RouteHandler } from '$lib/types';

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

const updateHandler: RouteHandler = {
	action: 'update',
	model: 'todos',
	where: { id: { source: 'params', key: 'id' } },
	update: {
		title: { source: 'body', key: 'title' },
		completed: { source: 'body', key: 'completed' },
	},
};

const toggleHandler: RouteHandler = {
	action: 'update',
	model: 'todos',
	where: { id: { source: 'params', key: 'id', by: 'equal' } },
	update: {
		completed: (todo: Record<string, unknown>) => !todo.completed,
	},
};

beforeEach(() => {
	createTables(generateSchemas(model), 1);
});

afterEach(() => {
	resetTables();
});

describe('updateAction', () => {
	it('patches fields from the body map', async () => {
		const res = dispatch(updateHandler, {
			method: 'PUT',
			path: '/todos/1',
			params: { id: '1' },
			queries: {},
			body: { title: 'Renamed', completed: true },
		});
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ id: 1, title: 'Renamed', completed: true });
	});

	it('applies a row function patch', async () => {
		const res = dispatch(toggleHandler, {
			method: 'PUT',
			path: '/todos/1/toggle',
			params: { id: '1' },
			queries: {},
			body: null,
		});
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ id: 1, title: 'Todo 1', completed: true });
	});

	it('returns 404 when the row is missing', async () => {
		const res = dispatch(updateHandler, {
			method: 'PUT',
			path: '/todos/9',
			params: { id: '9' },
			queries: {},
			body: { title: 'Nope' },
		});
		expect(res.status).toBe(404);
	});

	it('returns 400 when the body fails partial validation', async () => {
		const res = dispatch(updateHandler, {
			method: 'PUT',
			path: '/todos/1',
			params: { id: '1' },
			queries: {},
			body: { completed: 'yes' },
		});
		expect(res.status).toBe(400);
		expect((await res.json()).error).toBe('Validation failed');
	});
});
