import { describe, expect, it } from 'vitest';
import { generateSchemas, type ModelDefinition, type Schema } from '$lib/server/model';

const exampleModel: ModelDefinition = {
	todos: (t) => ({
		id: t.id.index(),
		title: t
			.string()
			.required()
			.factory(({ index }) => `Todo ${index}`),
		owner: t.id.uuid().required().rel('users', { field: 'id' }),
		completed: t.boolean().default(false),
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
			.factory(({ index }) => `user.${index}@example.com`),
	}),
};

function schemaField(table: Schema, name: string) {
	const compiled = table.fields[name];
	if (!compiled) throw new Error(`missing field ${table.name}.${name}`);
	return compiled;
}

describe('generateSchemas', () => {
	it('compiles tables and field metadata from a MODEL definition', () => {
		const tables = generateSchemas(exampleModel);
		expect(tables.map((table) => table.name)).toEqual(['todos', 'users']);

		const todos = tables[0];
		expect(schemaField(todos, 'id').type).toBe('id.index');
		expect(schemaField(todos, 'title').required).toBe(true);
		expect(schemaField(todos, 'title').factory?.({ index: 3 })).toBe('Todo 3');
		expect(schemaField(todos, 'owner').rel).toEqual({ table: 'users', field: 'id', omit: [] });
		expect(schemaField(todos, 'completed')).toMatchObject({
			type: 'boolean',
			hasDefault: true,
			defaultValue: false,
		});
	});

	it('returns an empty list for an empty definition', () => {
		expect(generateSchemas({})).toEqual([]);
	});

	it('throws when a field is not a FieldBuilder', () => {
		expect(() =>
			generateSchemas({
				todos: () => ({
					id: { required() {} } as never,
				}),
			}),
		).toThrow('MODEL.todos.id must be a field builder');
	});
});
