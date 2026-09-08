import { afterEach, describe, expect, it } from 'vitest';
import { generateSchemas, type ModelDefinition } from '$lib/server/model';
import type { RelationValue, Row } from '$lib/server/model/types';
import { createTables, getTable, resetTables, update } from '$lib/server/table';
import { destroy, flush } from '$lib/server/table/lifecycle';
import { isRelationValue } from '$lib/server/table/row';

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

describe('relation sync', () => {
	it('returns the committed row before related snapshots catch up', async () => {
		createTables(generateSchemas(exampleModel), 3);
		const todos = getTable('todos')!;
		const users = getTable('users')!;
		const linked = relationOf(todos.rows[0]);
		const source = users.rows[linked.index];
		const previousName = source.name.value;

		const committed = update(users, { id: source.id.value }, { name: 'Renamed' });
		expect(committed?.name.value).toBe('Renamed');
		expect(relationOf(todos.rows[0]).row.name.value).toBe(previousName);

		await flush(users);
		expect(relationOf(todos.rows[0]).row.name.value).toBe('Renamed');
		expect(relationOf(todos.rows[0]).row.id.value).toBe(source.id.value);
	});

	it('does not rewrite snapshots for unrelated indexes', async () => {
		createTables(generateSchemas(exampleModel), 3);
		const todos = getTable('todos')!;
		const users = getTable('users')!;

		update(users, { id: users.rows[0].id.value }, { name: 'Only zero' });
		await flush(users);

		for (const row of todos.rows) {
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
		const linked = relationOf(todos.rows[0]);
		const sourceId = users.rows[linked.index].id.value;

		destroy(todos);
		expect(() => update(users, { id: sourceId }, { name: 'After destroy' })).not.toThrow();
		await flush(users);
		expect(todos.rows).toEqual([]);
	});
});
