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
		completed: t.boolean().default(false)
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
			.factory(({ index }) => `user.${index}@example.com`)
	})
};

beforeEach(() => {
	createTables(generateSchemas(model), 2);
});

afterEach(() => {
	resetTables();
});

describe('upsertAction', () => {
	it('inserts a valid body and fills defaults', async () => {
		const owner = toStore().users[0]!.id.value;
		const res = dispatch(
			{ action: 'upsert', model: 'todos' },
			{ params: {}, queries: {}, body: { title: 'New', owner } }
		);
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({
			id: 3,
			title: 'New',
			owner,
			completed: false
		});
	});

	it('replaces an existing row by id', async () => {
		const owner = toStore().users[0]!.id.value;
		const res = dispatch(
			{ action: 'upsert', model: 'todos' },
			{ params: {}, queries: {}, body: { id: 1, title: 'Replaced', owner, completed: true } }
		);
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({
			id: 1,
			title: 'Replaced',
			owner,
			completed: true
		});
	});

	it('returns 400 when validation fails', async () => {
		const res = dispatch(
			{ action: 'upsert', model: 'todos' },
			{ params: {}, queries: {}, body: { title: 'No owner' } }
		);
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error).toBe('Validation failed');
		expect(body.details).toEqual(expect.arrayContaining([expect.stringContaining('owner')]));
	});
});
