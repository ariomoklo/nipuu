import { describe, expect, it } from 'vitest';
import { generateSchemas, type ModelDefinition } from '$lib/server/model';
import { sortTablesByFk } from '$lib/server/table';

const exampleModel: ModelDefinition = {
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

describe('sortTablesByFk', () => {
	it('orders related tables so parents come first', () => {
		const sorted = sortTablesByFk(generateSchemas(exampleModel));
		expect(sorted.map((table) => table.name)).toEqual(['users', 'todos']);
	});

	it('keeps independent tables in definition order', () => {
		const sorted = sortTablesByFk(
			generateSchemas({
				alpha: (t) => ({ id: t.id.index() }),
				beta: (t) => ({ id: t.id.index() })
			})
		);
		expect(sorted.map((table) => table.name)).toEqual(['alpha', 'beta']);
	});

	it('throws on circular relations', () => {
		const tables = generateSchemas({
			a: (t) => ({ id: t.id.index(), bId: t.id.index().rel('b', { field: 'id' }) }),
			b: (t) => ({ id: t.id.index(), aId: t.id.index().rel('a', { field: 'id' }) })
		});
		expect(() => sortTablesByFk(tables)).toThrow('Circular relation involving table "a"');
	});

	it('throws on a self-relation', () => {
		const tables = generateSchemas({
			users: (t) => ({
				id: t.id.uuid(),
				manager: t.id.uuid().rel('users', { field: 'id' })
			})
		});
		expect(() => sortTablesByFk(tables)).toThrow('Circular relation involving table "users"');
	});
});
