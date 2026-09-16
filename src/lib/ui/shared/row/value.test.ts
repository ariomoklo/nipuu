import { describe, expect, it } from 'vitest';
import { cellText, cellTitle, fieldValue, rowIdentity } from '$lib/ui/shared/row/value';
import type { TableFieldMeta } from '$lib/types/table';

function field(overrides: Partial<TableFieldMeta> = {}): TableFieldMeta {
	return {
		name: 'title',
		type: 'string',
		required: false,
		hasDefault: false,
		operators: ['eq'],
		autoId: false,
		identity: false,
		...overrides
	};
}

const owner = field({ name: 'owner', type: 'id.uuid', rel: { table: 'users', field: 'id' } });

describe('fieldValue', () => {
	it('reads the referenced field out of a relation cell', () => {
		const row = { owner: { id: 'u-1', name: 'User 1' } };
		expect(fieldValue(row, owner)).toBe('u-1');
	});

	it('stringifies booleans and treats null as empty', () => {
		expect(fieldValue({ done: false }, field({ name: 'done', type: 'boolean' }))).toBe('false');
		expect(fieldValue({ title: null }, field())).toBe('');
	});
});

describe('cellText', () => {
	it('shows an em dash for empty and null values', () => {
		expect(cellText({ title: '' }, field())).toBe('—');
		expect(cellText({ owner: null }, owner)).toBe('—');
	});

	it('keeps false visible instead of reading it as empty', () => {
		expect(cellText({ done: false }, field({ name: 'done', type: 'boolean' }))).toBe('false');
	});
});

describe('cellTitle', () => {
	it('returns the whole relation object', () => {
		const row = { owner: { id: 'u-1', name: 'User 1' } };
		expect(cellTitle(row, owner)).toBe('{"id":"u-1","name":"User 1"}');
	});

	it('only sets a tooltip for text past the truncation limit', () => {
		expect(cellTitle({ title: 'short' }, field())).toBeUndefined();
		expect(cellTitle({ title: 'x'.repeat(25) }, field())).toBe('x'.repeat(25));
	});
});

describe('rowIdentity', () => {
	it('collects identity fields only', () => {
		const fields = [field({ name: 'id', type: 'id.index', identity: true }), field(), owner];
		expect(rowIdentity({ id: 7, title: 'Todo 7', owner: { id: 'u-1' } }, fields)).toEqual({
			id: '7'
		});
	});
});
