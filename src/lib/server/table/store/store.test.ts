import { afterEach, describe, expect, it } from 'vitest';
import { generateSchemas, type ModelDefinition } from '$lib/server/model';
import type { RelationValue, Row } from '$lib/server/model/types';
import { createTables, find, getTable, resetTables, select } from '$lib/server/table';
import { isRelationValue } from '$lib/server/table/row';

const exampleModel: ModelDefinition = {
	notes: (t) => ({
		id: t.id.index(),
		title: t.string(),
		done: t.boolean(),
	}),
};

afterEach(() => {
	resetTables();
});

function relationOf(row: Row): RelationValue {
	const value = row.owner?.value;
	if (!isRelationValue(value)) throw new Error('expected relation value');
	return value;
}

describe('find and select', () => {
	it('uses built-in string and boolean fallbacks when a field has no factory or default', () => {
		createTables(generateSchemas(exampleModel), 1);
		expect(find(getTable('notes')!, { id: 1 })).toEqual({ id: 1, title: '', done: false });
	});

	it('prefers factory over default', () => {
		createTables(
			generateSchemas({
				items: (t) => ({
					label: t
						.string()
						.default('fallback')
						.factory(({ index }) => `item-${index}`),
				}),
			}),
			1,
		);
		expect(select(getTable('items')!)[0]?.label).toBe('item-1');
	});

	it('projects relation fields as omitted nested objects, not { index, row }', () => {
		createTables(
			generateSchemas({
				todos: (t) => ({
					id: t.id.index(),
					owner: t.id.uuid().rel('users', { field: 'id', omit: ['email'] }),
				}),
				users: (t) => ({
					id: t.id.uuid(),
					name: t.string().factory(({ index }) => `User ${index}`),
					email: t.string().factory(({ index }) => `user.${index}@example.com`),
				}),
			}),
			1,
		);

		const todos = getTable('todos')!;
		const users = getTable('users')!;
		const stored = relationOf(todos.rows[0]);
		expect(stored.row).not.toHaveProperty('email');
		expect(stored.row.name.value).toBe('User 1');

		const found = find(todos, { id: 1 });
		expect(found).toEqual({
			id: 1,
			owner: { id: users.rows[stored.index].id.value, name: 'User 1' },
		});
		expect(found).not.toHaveProperty('index');
		expect(found?.owner).not.toHaveProperty('row');
		expect(found?.owner).not.toHaveProperty('email');

		const selected = select(todos);
		expect(selected).toHaveLength(1);
		expect(selected[0]).toEqual(found);
	});
});
