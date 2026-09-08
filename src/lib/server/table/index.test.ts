import { afterEach, describe, expect, it } from 'vitest';
import { generateSchemas, type ModelDefinition } from '$lib/server/model';
import type { RelationValue, Row } from '$lib/server/model/types';
import {
	createTables,
	getTable,
	resetTables,
	sortTablesByFk,
	toStore
} from '$lib/server/table';
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

	it('uses built-in string and boolean fallbacks when a field has no factory or default', () => {
		createTables(
			generateSchemas({
				notes: (t) => ({
					id: t.id.index(),
					title: t.string(),
					done: t.boolean()
				})
			}),
			1
		);
		expect(getTable('notes')?.find({ id: 1 })).toEqual({ id: 1, title: '', done: false });
	});

	it('prefers factory over default', () => {
		createTables(
			generateSchemas({
				items: (t) => ({
					label: t
						.string()
						.default('fallback')
						.factory(({ index }) => `item-${index}`)
				})
			}),
			1
		);
		expect(getTable('items')?.select()[0]?.label).toBe('item-1');
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

describe('select and find', () => {
	it('projects relation fields as omitted nested objects, not { index, row }', () => {
		createTables(
			generateSchemas({
				todos: (t) => ({
					id: t.id.index(),
					owner: t.id.uuid().rel('users', { field: 'id', omit: ['email'] })
				}),
				users: (t) => ({
					id: t.id.uuid(),
					name: t.string().factory(({ index }) => `User ${index}`),
					email: t.string().factory(({ index }) => `user.${index}@example.com`)
				})
			}),
			1
		);

		const todos = getTable('todos')!;
		const users = getTable('users')!;
		const stored = relationOf(todos.storage[0]);
		expect(stored.row).not.toHaveProperty('email');
		expect(stored.row.name.value).toBe('User 1');

		const found = todos.find({ id: 1 });
		expect(found).toEqual({
			id: 1,
			owner: { id: users.storage[stored.index].id.value, name: 'User 1' }
		});
		expect(found).not.toHaveProperty('index');
		expect(found?.owner).not.toHaveProperty('row');
		expect(found?.owner).not.toHaveProperty('email');

		const selected = todos.select();
		expect(selected).toHaveLength(1);
		expect(selected[0]).toEqual(found);
	});
});

describe('relation sync', () => {
	it('returns the committed row before related snapshots catch up', async () => {
		createTables(generateSchemas(exampleModel), 3);
		const todos = getTable('todos')!;
		const users = getTable('users')!;
		const linked = relationOf(todos.storage[0]);
		const source = users.storage[linked.index];
		const previousName = source.name.value;

		const committed = users.update({ id: source.id.value }, { name: 'Renamed' });
		expect(committed?.name.value).toBe('Renamed');
		expect(relationOf(todos.storage[0]).row.name.value).toBe(previousName);

		await users.flush();
		expect(relationOf(todos.storage[0]).row.name.value).toBe('Renamed');
		expect(relationOf(todos.storage[0]).row.id.value).toBe(source.id.value);
	});

	it('does not rewrite snapshots for unrelated indexes', async () => {
		createTables(generateSchemas(exampleModel), 3);
		const todos = getTable('todos')!;
		const users = getTable('users')!;

		users.update({ id: users.storage[0].id.value }, { name: 'Only zero' });
		await users.flush();

		for (const row of todos.storage) {
			const rel = relationOf(row);
			if (rel.index === 0) {
				expect(rel.row.name.value).toBe('Only zero');
			} else {
				expect(rel.row.name.value).not.toBe('Only zero');
			}
		}
	});

	it('stops syncing after destroy', async () => {
		createTables(generateSchemas(exampleModel), 2);
		const todos = getTable('todos')!;
		const users = getTable('users')!;
		const linked = relationOf(todos.storage[0]);
		const sourceId = users.storage[linked.index].id.value;

		todos.destroy();
		expect(() => users.update({ id: sourceId }, { name: 'After destroy' })).not.toThrow();
		await users.flush();
		expect(todos.storage).toEqual([]);
	});
});
