import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { generateSchemas, validate, type ModelDefinition } from '$lib/server/model';
import { createTables, resetTables, toStore } from '$lib/server/table';

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
			errors: ['Unknown table: missing'],
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
			extra: 'drop me',
		});
		expect(result).toEqual({
			ok: true,
			data: { id: 10, title: 'Buy milk', owner, completed: true },
		});
	});

	it('fills missing fields from defaults on a full write', () => {
		const result = validate(tables, toStore(), 'todos', {
			id: 11,
			title: 'Default completed',
			owner,
		});
		expect(result).toEqual({
			ok: true,
			data: { id: 11, title: 'Default completed', owner, completed: false },
		});
	});

	it('reports missing required fields on a full write', () => {
		expect(validate(tables, toStore(), 'todos', { id: 1 })).toEqual({
			ok: false,
			errors: ['title is required', 'owner is required'],
		});
	});

	it('skips missing fields on a partial write, including required ones', () => {
		expect(
			validate(tables, toStore(), 'todos', { title: 'Only title' }, { partial: true }),
		).toEqual({
			ok: true,
			data: { title: 'Only title' },
		});
	});

	it('does not apply defaults on a partial write', () => {
		expect(
			validate(tables, toStore(), 'todos', { title: 'No default' }, { partial: true }),
		).toEqual({
			ok: true,
			data: { title: 'No default' },
		});
	});

	it('reports type mismatches', () => {
		expect(
			validate(tables, toStore(), 'todos', {
				id: 1.5,
				title: 1,
				owner,
				completed: 'yes',
			}),
		).toEqual({
			ok: false,
			errors: ['id must be an integer', 'title must be a string', 'completed must be a boolean'],
		});
	});

	it('rejects a hex UUID that is not RFC 4122', () => {
		expect(
			validate(tables, toStore(), 'todos', {
				id: 1,
				title: 'Bad uuid',
				owner: '00000000-0000-0000-0000-000000000000',
				completed: false,
			}),
		).toEqual({
			ok: false,
			errors: ['owner must be a valid UUID'],
		});
	});

	it('rejects a relation that does not exist in the store', () => {
		expect(
			validate(tables, toStore(), 'todos', {
				id: 1,
				title: 'Orphan',
				owner: '00000000-0000-4000-8000-000000000000',
				completed: false,
			}),
		).toEqual({
			ok: false,
			errors: ['owner does not reference an existing users.id'],
		});
	});

	it('skips relation existence when the value is null', () => {
		expect(
			validate(tables, toStore(), 'todos', {
				id: 1,
				title: 'No owner',
				owner: null,
				completed: false,
			}),
		).toEqual({
			ok: false,
			errors: ['owner must be a valid UUID'],
		});
	});
});
