import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
	compileField,
	generateSchemas,
	Field,
	validate,
	type Schema,
	type ModelDefinition
} from '$lib/server/model';
import { createTables, resetTables, toStore } from '$lib/server/table';

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

function field(table: Schema, name: string) {
	const compiled = table.fields[name];
	if (!compiled) throw new Error(`missing field ${table.name}.${name}`);
	return compiled;
}

describe('FieldBuilder', () => {
	it('compiles type, name, and optional flags', () => {
		const compiled = new Field('string')[compileField]('title');
		expect(compiled).toEqual({
			name: 'title',
			type: 'string',
			required: false,
			hasDefault: false,
			defaultValue: undefined,
			factory: undefined,
			rel: undefined
		});
	});

	it('chains required, default, factory, and rel', () => {
		const factory = ({ index }: { index: number }) => `n-${index}`;
		const compiled = new Field('id.uuid')
			.required()
			.default('unused')
			.factory(factory)
			.rel('users', { field: 'id' })
			[compileField]('owner');

		expect(compiled.name).toBe('owner');
		expect(compiled.type).toBe('id.uuid');
		expect(compiled.required).toBe(true);
		expect(compiled.hasDefault).toBe(true);
		expect(compiled.defaultValue).toBe('unused');
		expect(compiled.factory).toBe(factory);
		expect(compiled.rel).toEqual({ table: 'users', field: 'id', omit: [] });
	});
});

describe('createT', () => {
	it('returns builders for each field kind', () => {
		const t = Field.builder();
		expect(t.string()).toBeInstanceOf(Field);
		expect(t.boolean()).toBeInstanceOf(Field);
		expect(t.id.index()).toBeInstanceOf(Field);
		expect(t.id.uuid()).toBeInstanceOf(Field);
	});
});

describe('compileModel', () => {
	it('compiles tables and field metadata from a MODEL definition', () => {
		const tables = generateSchemas(exampleModel);
		expect(tables.map((table) => table.name)).toEqual(['todos', 'users']);

		const todos = tables[0];
		expect(field(todos, 'id').type).toBe('id.index');
		expect(field(todos, 'title').required).toBe(true);
		expect(field(todos, 'title').factory?.({ index: 3 })).toBe('Todo 3');
		expect(field(todos, 'owner').rel).toEqual({ table: 'users', field: 'id', omit: [] });
		expect(field(todos, 'completed')).toMatchObject({
			type: 'boolean',
			hasDefault: true,
			defaultValue: false
		});
	});

	it('returns an empty list for an empty definition', () => {
		expect(generateSchemas({})).toEqual([]);
	});

	it('throws when a field is not a FieldBuilder', () => {
		expect(() =>
			generateSchemas({
				todos: () => ({
					id: { required() {} } as never
				})
			})
		).toThrow('MODEL.todos.id must be a field builder');
	});
});

describe('validate', () => {
	const tables = generateSchemas(exampleModel);
	let owner: unknown;

	beforeEach(() => {
		createTables(tables, 2);
		owner = toStore().users[0]?.id.value;
	});

	afterEach(() => {
		resetTables();
	});

	it('rejects an unknown table', () => {
		expect(validate(tables, toStore(), 'missing', {})).toEqual({
			ok: false,
			errors: ['Unknown table: missing']
		});
	});

	it('rejects a non-object body', () => {
		const expected = { ok: false, errors: ['Body must be an object'] };
		expect(validate(tables, toStore(), 'users', null)).toEqual(expected);
		expect(validate(tables, toStore(), 'users', [])).toEqual(expected);
		expect(validate(tables, toStore(), 'users', 'nope')).toEqual(expected);
	});

	it('accepts a full valid payload and ignores unknown keys', () => {
		const result = validate(tables, toStore(), 'todos', {
			id: 10,
			title: 'Buy milk',
			owner,
			completed: true,
			extra: 'drop me'
		});
		expect(result).toEqual({
			ok: true,
			data: { id: 10, title: 'Buy milk', owner, completed: true }
		});
	});

	it('fills missing fields from defaults on a full write', () => {
		const result = validate(tables, toStore(), 'todos', {
			id: 11,
			title: 'Default completed',
			owner
		});
		expect(result).toEqual({
			ok: true,
			data: { id: 11, title: 'Default completed', owner, completed: false }
		});
	});

	it('reports missing required fields on a full write', () => {
		expect(validate(tables, toStore(), 'todos', { id: 1 })).toEqual({
			ok: false,
			errors: ['title is required', 'owner is required']
		});
	});

	it('skips missing fields on a partial write, including required ones', () => {
		expect(validate(tables, toStore(), 'todos', { title: 'Only title' }, { partial: true })).toEqual({
			ok: true,
			data: { title: 'Only title' }
		});
	});

	it('does not apply defaults on a partial write', () => {
		expect(validate(tables, toStore(), 'todos', { title: 'No default' }, { partial: true })).toEqual({
			ok: true,
			data: { title: 'No default' }
		});
	});

	it('reports type mismatches', () => {
		expect(
			validate(tables, toStore(), 'todos', {
				id: 1.5,
				title: 1,
				owner,
				completed: 'yes'
			})
		).toEqual({
			ok: false,
			errors: ['id must be an integer', 'title must be a string', 'completed must be a boolean']
		});
	});

	it('rejects a hex UUID that is not RFC 4122', () => {
		expect(
			validate(tables, toStore(), 'todos', {
				id: 1,
				title: 'Bad uuid',
				owner: '00000000-0000-0000-0000-000000000000',
				completed: false
			})
		).toEqual({
			ok: false,
			errors: ['owner must be a valid UUID']
		});
	});

	it('rejects a relation that does not exist in the store', () => {
		expect(
			validate(tables, toStore(), 'todos', {
				id: 1,
				title: 'Orphan',
				owner: '00000000-0000-4000-8000-000000000000',
				completed: false
			})
		).toEqual({
			ok: false,
			errors: ['owner does not reference an existing users.id']
		});
	});

	it('skips relation existence when the value is null', () => {
		expect(
			validate(tables, toStore(), 'todos', {
				id: 1,
				title: 'No owner',
				owner: null,
				completed: false
			})
		).toEqual({
			ok: false,
			errors: ['owner must be a valid UUID']
		});
	});
});
