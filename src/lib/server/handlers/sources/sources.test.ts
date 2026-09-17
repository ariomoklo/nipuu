import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { generateSchemas, type ModelDefinition } from '$lib/server/model';
import {
	resolveValue,
	toRouteFilters,
	type DispatchContext,
} from '$lib/server/handlers/sources/sources';
import { createTables, getTable, resetTables } from '$lib/server/table';

const model: ModelDefinition = {
	todos: (t) => ({
		id: t.id.index(),
		title: t
			.string()
			.required()
			.factory(({ index }) => `Todo ${index}`),
		completed: t.boolean().default(false),
	}),
};

const empty: DispatchContext = {
	method: 'GET',
	path: '/todos',
	params: {},
	queries: {},
	body: null,
};

afterEach(() => {
	resetTables();
});

describe('resolveValue', () => {
	it('reads params, queries, and body keys', () => {
		const context: DispatchContext = {
			method: 'GET',
			path: '/todos/3',
			params: { id: '3' },
			queries: { q: 'Todo' },
			body: { title: 'Hi' },
		};
		expect(resolveValue({ source: 'params', key: 'id' }, context)).toBe('3');
		expect(resolveValue({ source: 'queries', key: 'q' }, context)).toBe('Todo');
		expect(resolveValue({ source: 'body', key: 'title' }, context)).toBe('Hi');
		expect(resolveValue({ source: 'queries', key: 'missing' }, context)).toBeUndefined();
		expect(resolveValue({ source: 'body', key: 'title' }, empty)).toBeUndefined();
	});
});

describe('toRouteFilters', () => {
	beforeEach(() => {
		createTables(generateSchemas(model), 1);
	});

	it('maps equal to eq and include to include, and coerces query strings', () => {
		const table = getTable('todos')!;
		const filters = toRouteFilters(
			table,
			{
				title: { source: 'queries', key: 'q', by: 'include' },
				completed: { source: 'queries', key: 'completed', by: 'equal' },
				id: { source: 'params', key: 'id' },
			},
			{
				method: 'GET',
				path: '/todos/1',
				params: { id: '1' },
				queries: { q: 'odo', completed: 'false' },
				body: null,
			},
			'filter',
		);
		expect(filters).toEqual([
			{ key: 'title', value: 'odo', by: 'include' },
			{ key: 'completed', value: false, by: 'eq' },
			{ key: 'id', value: 1, by: 'eq' },
		]);
	});

	it('skips missing filter values and returns null when a where value is missing', () => {
		const table = getTable('todos')!;
		const filter = toRouteFilters(
			table,
			{ title: { source: 'queries', key: 'q', by: 'include' } },
			empty,
			'filter',
		);
		expect(filter).toEqual([]);

		const where = toRouteFilters(
			table,
			{ id: { source: 'params', key: 'id', by: 'equal' } },
			empty,
			'where',
		);
		expect(where).toBeNull();
	});
});
