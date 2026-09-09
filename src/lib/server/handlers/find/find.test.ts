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
		completed: t.boolean().default(false)
	})
};

const findHandler: RouteHandler = {
	action: 'find',
	model: 'todos',
	where: { id: { source: 'params', key: 'id', by: 'equal' } }
};

beforeEach(() => {
	createTables(generateSchemas(model), 2);
});

afterEach(() => {
	resetTables();
});

describe('findAction', () => {
	it('returns one projected row', async () => {
		const res = dispatch(findHandler, { params: { id: '2' }, queries: {}, body: null });
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ id: 2, title: 'Todo 2', completed: false });
	});

	it('returns 404 when no row matches', async () => {
		const res = dispatch(findHandler, { params: { id: '99' }, queries: {}, body: null });
		expect(res.status).toBe(404);
		expect(await res.json()).toEqual({ error: 'Not Found' });
	});

	it('returns 404 when a where value is missing', async () => {
		const res = dispatch(findHandler, { params: {}, queries: {}, body: null });
		expect(res.status).toBe(404);
	});
});
