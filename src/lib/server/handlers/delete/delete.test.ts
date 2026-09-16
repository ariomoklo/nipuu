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

const deleteHandler: RouteHandler = {
	action: 'delete',
	model: 'todos',
	where: { id: { source: 'params', key: 'id' } },
};

beforeEach(() => {
	createTables(generateSchemas(model), 2);
});

afterEach(() => {
	resetTables();
});

describe('deleteAction', () => {
	it('removes the matching row and returns it', async () => {
		const res = dispatch(deleteHandler, { params: { id: '1' }, queries: {}, body: null });
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ id: 1, title: 'Todo 1', completed: false });

		const missing = dispatch(
			{ action: 'find', model: 'todos', where: { id: { source: 'params', key: 'id' } } },
			{ params: { id: '1' }, queries: {}, body: null },
		);
		expect(missing.status).toBe(404);
	});

	it('returns 404 when no row matches', async () => {
		const res = dispatch(deleteHandler, { params: { id: '9' }, queries: {}, body: null });
		expect(res.status).toBe(404);
		expect(await res.json()).toEqual({ error: 'Not Found' });
	});
});
