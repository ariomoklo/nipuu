import { afterEach, describe, expect, it } from 'vitest';
import { generateSchemas, type ModelDefinition } from '$lib/server/model';
import type { RelationValue, Row } from '$lib/server/model/types';
import { createTables, listTables, resetTables, toStore } from '$lib/server/table';
import { isRelationValue } from '$lib/server/table/row';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

afterEach(() => {
	resetTables();
});

function relationOf(row: Row): RelationValue {
	const value = row.owner?.value;
	if (!isRelationValue(value)) throw new Error('expected relation value');
	return value;
}

describe('createTables', () => {
	it('seeds count rows per table with factories, defaults, ids, and relations', () => {
		createTables(generateSchemas(exampleModel), 3);
		const store = toStore();

		expect(store.users).toHaveLength(3);
		expect(store.todos).toHaveLength(3);

		const userIds = store.users.map((row) => row.id.value);
		expect(new Set(userIds).size).toBe(3);

		store.users.forEach((row, i) => {
			const index = i + 1;
			expect(row.id.value).toMatch(UUID_RE);
			expect(row.name.value).toBe(`User ${index}`);
			expect(row.email.value).toBe(`user.${index}@example.com`);
		});

		store.todos.forEach((row, i) => {
			const index = i + 1;
			expect(row.id.value).toBe(index);
			expect(row.title.value).toBe(`Todo ${index}`);
			expect(row.completed.value).toBe(false);
			expect(row.owner.hasRelation).toBe(true);
			const rel = relationOf(row);
			expect(rel.index).toBeGreaterThanOrEqual(0);
			expect(rel.index).toBeLessThan(3);
			expect(userIds).toContain(rel.row.id.value);
			expect(rel.row.id.value).toBe(store.users[rel.index]?.id.value);
		});
	});

	it('returns empty row lists when count is 0', () => {
		createTables(generateSchemas(exampleModel), 0);
		expect(toStore().users).toEqual([]);
		expect(toStore().todos).toEqual([]);
	});

	it('throws when a relation target table does not exist', () => {
		const tables = generateSchemas({
			todos: (t) => ({
				owner: t.id.uuid().rel('users', { field: 'id' })
			})
		});
		expect(() => createTables(tables, 1)).toThrow(
			'Cannot seed owner: table with "users" name, does not exist'
		);
	});
});

describe('listTables', () => {
	it('returns seeded table names in foreign-key order', () => {
		createTables(
			generateSchemas({
				todos: (t) => ({
					id: t.id.index(),
					owner: t.id.uuid().rel('users', { field: 'id' })
				}),
				users: (t) => ({ id: t.id.uuid() })
			}),
			1
		);
		expect(listTables()).toEqual(['users', 'todos']);
	});
});
