import { afterEach, describe, expect, it } from 'vitest';
import { generateSchemas, type ModelDefinition } from '$lib/server/model';
import type { RelationValue, Row } from '$lib/server/model/types';
import {
	createTables,
	getTable,
	getTables,
	relationOptions,
	resetTables,
	resolveRelationLabels,
	update
} from '$lib/server/table';
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

describe('relationOptions', () => {
	it('lists the joined value with the first string field as label', () => {
		createTables(generateSchemas(exampleModel), 2);
		const todos = getTable('todos')!;
		const users = getTable('users')!;

		expect(relationOptions(todos, getTables())).toEqual({
			owner: users.rows.map((row) => ({ value: row.id.value, label: row.name.value }))
		});
	});

	it('skips fields without a relation', () => {
		createTables(generateSchemas(exampleModel), 2);
		const users = getTable('users')!;

		expect(relationOptions(users, getTables())).toEqual({});
	});

	it('leaves the label off when the related table has no plain string field', () => {
		createTables(
			generateSchemas({
				todos: (t) => ({ id: t.id.index(), owner: t.id.uuid().rel('users', { field: 'id' }) }),
				users: (t) => ({ id: t.id.uuid() })
			}),
			2
		);

		const options = relationOptions(getTable('todos')!, getTables());
		expect(options.owner).toHaveLength(2);
		expect(options.owner.every((option) => option.label === undefined)).toBe(true);
	});
});

describe('resolveRelationLabels', () => {
	const options = {
		owner: [
			{ value: 'user-a', label: 'User 1' },
			{ value: 'user-b', label: 'User 2' }
		]
	};

	function resolve(owner: string): string | null {
		const form = new FormData();
		form.set('owner', owner);
		resolveRelationLabels(form, options);
		return form.get('owner') as string | null;
	}

	it('swaps a label for the value it stands for, ignoring case', () => {
		expect(resolve('User 2')).toBe('user-b');
		expect(resolve('user 2')).toBe('user-b');
	});

	it('leaves values and unknown text alone', () => {
		expect(resolve('user-a')).toBe('user-a');
		expect(resolve('User 9')).toBe('User 9');
		expect(resolve('')).toBe('');
	});
});
