import { describe, expect, it } from 'vitest';
import {
	compileField,
	compileModel,
	createT,
	FieldBuilder,
	seedStore,
	sortTablesByFk,
	validate,
	type CompiledTable,
	type ModelDefinition
} from '$lib/server/model';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const exampleModel: ModelDefinition = {
	todos: (t) => ({
		id: t.id.index(),
		title: t
			.string()
			.required()
			.factory(({ index }) => `Todo ${index}`),
		owner: t.id.uuid().required().rel('users', 'id'),
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

function field(table: CompiledTable, name: string) {
	const compiled = table.fields[name];
	if (!compiled) throw new Error(`missing field ${table.name}.${name}`);
	return compiled;
}

describe('FieldBuilder', () => {
	it('compiles type, name, and optional flags', () => {
		const compiled = new FieldBuilder('string')[compileField]('title');
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
		const compiled = new FieldBuilder('uuid')
			.required()
			.default('unused')
			.factory(factory)
			.rel('users', 'id')
			[compileField]('owner');

		expect(compiled.name).toBe('owner');
		expect(compiled.type).toBe('uuid');
		expect(compiled.required).toBe(true);
		expect(compiled.hasDefault).toBe(true);
		expect(compiled.defaultValue).toBe('unused');
		expect(compiled.factory).toBe(factory);
		expect(compiled.rel).toEqual({ table: 'users', field: 'id' });
	});
});

describe('createT', () => {
	it('returns builders for each field kind', () => {
		const t = createT();
		expect(t.string()).toBeInstanceOf(FieldBuilder);
		expect(t.boolean()).toBeInstanceOf(FieldBuilder);
		expect(t.id.index()).toBeInstanceOf(FieldBuilder);
		expect(t.id.uuid()).toBeInstanceOf(FieldBuilder);
	});
});

describe('compileModel', () => {
	it('compiles tables and field metadata from a MODEL definition', () => {
		const tables = compileModel(exampleModel);
		expect(tables.map((table) => table.name)).toEqual(['todos', 'users']);

		const todos = tables[0];
		expect(field(todos, 'id').type).toBe('index');
		expect(field(todos, 'title').required).toBe(true);
		expect(field(todos, 'title').factory?.({ index: 3 })).toBe('Todo 3');
		expect(field(todos, 'owner').rel).toEqual({ table: 'users', field: 'id' });
		expect(field(todos, 'completed')).toMatchObject({
			type: 'boolean',
			hasDefault: true,
			defaultValue: false
		});
	});

	it('returns an empty list for an empty definition', () => {
		expect(compileModel({})).toEqual([]);
	});

	it('throws when a field is not a FieldBuilder', () => {
		expect(() =>
			compileModel({
				todos: () => ({
					id: { required() {} } as never
				})
			})
		).toThrow('MODEL.todos.id must be a field builder');
	});
});

describe('sortTablesByFk', () => {
	it('orders related tables so parents come first', () => {
		const sorted = sortTablesByFk(compileModel(exampleModel));
		expect(sorted.map((table) => table.name)).toEqual(['users', 'todos']);
	});

	it('keeps independent tables in definition order', () => {
		const sorted = sortTablesByFk(
			compileModel({
				alpha: (t) => ({ id: t.id.index() }),
				beta: (t) => ({ id: t.id.index() })
			})
		);
		expect(sorted.map((table) => table.name)).toEqual(['alpha', 'beta']);
	});

	it('throws on circular relations', () => {
		const tables = compileModel({
			a: (t) => ({ id: t.id.index(), bId: t.id.index().rel('b', 'id') }),
			b: (t) => ({ id: t.id.index(), aId: t.id.index().rel('a', 'id') })
		});
		expect(() => sortTablesByFk(tables)).toThrow('Circular relation involving table "a"');
	});

	it('throws on a self-relation', () => {
		const tables = compileModel({
			users: (t) => ({
				id: t.id.uuid(),
				manager: t.id.uuid().rel('users', 'id')
			})
		});
		expect(() => sortTablesByFk(tables)).toThrow('Circular relation involving table "users"');
	});
});

describe('seedStore', () => {
	it('seeds count rows per table with factories, defaults, ids, and relations', () => {
		const store = seedStore(compileModel(exampleModel), 3);

		expect(store.users).toHaveLength(3);
		expect(store.todos).toHaveLength(3);

		const userIds = store.users.map((row) => row.id);
		expect(new Set(userIds).size).toBe(3);

		store.users.forEach((row, i) => {
			const index = i + 1;
			expect(row.id).toMatch(UUID_RE);
			expect(row.name).toBe(`User ${index}`);
			expect(row.email).toBe(`user.${index}@example.com`);
		});

		store.todos.forEach((row, i) => {
			const index = i + 1;
			expect(row.id).toBe(index);
			expect(row.title).toBe(`Todo ${index}`);
			expect(row.completed).toBe(false);
			expect(userIds).toContain(row.owner);
		});
	});

	it('uses built-in string and boolean fallbacks when a field has no factory or default', () => {
		const store = seedStore(
			compileModel({
				notes: (t) => ({
					id: t.id.index(),
					title: t.string(),
					done: t.boolean()
				})
			}),
			1
		);
		expect(store.notes[0]).toEqual({ id: 1, title: '', done: false });
	});

	it('prefers factory over default', () => {
		const store = seedStore(
			compileModel({
				items: (t) => ({
					label: t
						.string()
						.default('fallback')
						.factory(({ index }) => `item-${index}`)
				})
			}),
			1
		);
		expect(store.items[0]?.label).toBe('item-1');
	});

	it('returns empty row lists when count is 0', () => {
		const store = seedStore(compileModel(exampleModel), 0);
		expect(store.users).toEqual([]);
		expect(store.todos).toEqual([]);
	});

	it('throws when a relation target has no rows', () => {
		const tables = compileModel({
			todos: (t) => ({
				owner: t.id.uuid().rel('users', 'id')
			})
		});
		expect(() => seedStore(tables, 1)).toThrow(
			'Cannot seed owner: related table "users" has no rows'
		);
	});
});

describe('validate', () => {
	const tables = compileModel(exampleModel);
	const store = seedStore(tables, 2);
	const owner = store.users[0]?.id;

	it('rejects an unknown table', () => {
		expect(validate(tables, store, 'missing', {})).toEqual({
			ok: false,
			errors: ['Unknown table: missing']
		});
	});

	it('rejects a non-object body', () => {
		const expected = { ok: false, errors: ['Body must be an object'] };
		expect(validate(tables, store, 'users', null)).toEqual(expected);
		expect(validate(tables, store, 'users', [])).toEqual(expected);
		expect(validate(tables, store, 'users', 'nope')).toEqual(expected);
	});

	it('accepts a full valid payload and ignores unknown keys', () => {
		const result = validate(tables, store, 'todos', {
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
		const result = validate(tables, store, 'todos', {
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
		expect(validate(tables, store, 'todos', { id: 1 })).toEqual({
			ok: false,
			errors: ['title is required', 'owner is required']
		});
	});

	it('skips missing fields on a partial write, including required ones', () => {
		expect(validate(tables, store, 'todos', { title: 'Only title' }, { partial: true })).toEqual({
			ok: true,
			data: { title: 'Only title' }
		});
	});

	it('does not apply defaults on a partial write', () => {
		expect(validate(tables, store, 'todos', { title: 'No default' }, { partial: true })).toEqual({
			ok: true,
			data: { title: 'No default' }
		});
	});

	it('reports type mismatches', () => {
		expect(
			validate(tables, store, 'todos', {
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

	it('rejects a relation that does not exist in the store', () => {
		expect(
			validate(tables, store, 'todos', {
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
			validate(tables, store, 'todos', {
				id: 1,
				title: 'No owner',
				owner: null,
				completed: false
			})
		).toEqual({
			ok: false,
			errors: ['owner must be a string']
		});
	});
});
