import { assert, it } from '@effect/vitest';
import { Effect } from 'effect';
import { generateSchemas, type ModelDefinition, type Schema } from '$lib/server/model';
import { payloadSchema } from '$lib/server/model/validate/schema';
import { ValidationFailed, validateEffect } from '$lib/server/model/validate/validate';
import { createTables, resetTables, toStore } from '$lib/server/table';

const model: ModelDefinition = {
	todos: (t) => ({
		id: t.id.index(),
		title: t.string().required(),
		owner: t.id.uuid().required().rel('users', { field: 'id' }),
		completed: t.boolean().default(false),
	}),
	users: (t) => ({
		id: t.id.uuid(),
		name: t.string().required(),
	}),
};

const tables = generateSchemas(model);
const todos = tables.find((table) => table.name === 'todos')!;

const statusTable: Schema = {
	name: 'tasks',
	fields: {
		status: {
			name: 'status',
			type: 'enum',
			enum: ['open', 'done'],
			required: true,
			hasDefault: false,
			defaultValue: undefined,
		},
	},
};

it.effect('valid input decodes and drops unknown keys', () =>
	Effect.gen(function* () {
		createTables(tables, 1);
		const owner = toStore().users[0]?.id.value;
		const data = yield* validateEffect(tables, toStore(), 'todos', {
			id: 4,
			title: 'Buy milk',
			owner,
			completed: true,
			extra: true,
		});
		assert.deepStrictEqual(data, { id: 4, title: 'Buy milk', owner, completed: true });
		resetTables();
	}),
);

it.effect('reports every field problem', () =>
	Effect.gen(function* () {
		const error = yield* Effect.flip(
			validateEffect(tables, {}, 'todos', { id: 1.5, title: 1, completed: 'yes' }),
		);
		assert.instanceOf(error, ValidationFailed);
		assert.deepStrictEqual(error.errors, [
			'id must be an integer',
			'title must be a string',
			'owner is required',
			'completed must be a boolean',
		]);
	}),
);

it.effect('partial mode skips missing fields and does not apply defaults', () =>
	Effect.gen(function* () {
		const data = yield* validateEffect(
			tables,
			{},
			'todos',
			{ title: 'Only title' },
			{ partial: true },
		);
		assert.deepStrictEqual(data, { title: 'Only title' });
	}),
);

it.effect('an enum mismatch is ValidationFailed', () =>
	Effect.gen(function* () {
		const error = yield* Effect.flip(
			validateEffect([statusTable], {}, 'tasks', { status: 'later' }),
		);
		assert.strictEqual(error._tag, 'ValidationFailed');
		assert.deepStrictEqual(error.errors, ['status must be a valid enum value']);
	}),
);

it.effect('derives a schema once and decodes twice', () =>
	Effect.gen(function* () {
		const schema = payloadSchema(todos, false);
		assert.strictEqual(payloadSchema(todos, false), schema);

		const input = { title: 'Once' };
		const first = yield* Effect.flip(validateEffect(tables, {}, 'todos', input));
		const second = yield* Effect.flip(validateEffect(tables, {}, 'todos', input));
		assert.deepStrictEqual(first.errors, second.errors);
		assert.deepStrictEqual(first.errors, ['owner is required']);
	}),
);
