import { describe, expect, it } from 'vitest';
import type { FieldKind, FieldSchema } from '$lib/server/model/types';
import { validator } from '$lib/server/model/validate/validator';

function conf(type: FieldKind, extra: Partial<FieldSchema> = {}): FieldSchema {
	return {
		name: 'field',
		type,
		required: false,
		hasDefault: false,
		defaultValue: undefined,
		...extra,
	};
}

describe('validator.string', () => {
	it('accepts a string and rejects other types', () => {
		expect(validator.string('ok', conf('string'))).toEqual({
			ok: true,
			message: 'Must be a string',
		});
		expect(validator.string(1, conf('string')).ok).toBe(false);
	});
});

describe('validator.boolean', () => {
	it('accepts a boolean and rejects other types', () => {
		expect(validator.boolean(true, conf('boolean')).ok).toBe(true);
		expect(validator.boolean('true', conf('boolean')).ok).toBe(false);
	});
});

describe('validator.number', () => {
	it('accepts a number and rejects other types', () => {
		expect(validator.number(1.5, conf('number')).ok).toBe(true);
		expect(validator.number('1', conf('number')).ok).toBe(false);
	});
});

describe('validator.enum', () => {
	const schema = conf('enum', { enum: ['open', 'done'] });

	it('accepts a listed value and rejects others', () => {
		expect(validator.enum('open', schema).ok).toBe(true);
		expect(validator.enum('nope', schema).ok).toBe(false);
		expect(validator.enum(1, schema).ok).toBe(false);
	});
});

describe('validator.id.index', () => {
	it('accepts an integer and rejects a float', () => {
		expect(validator['id.index'](3, conf('id.index')).ok).toBe(true);
		expect(validator['id.index'](1.5, conf('id.index')).ok).toBe(false);
		expect(validator['id.index']('3', conf('id.index')).ok).toBe(false);
	});
});

describe('validator.id.uuid', () => {
	it('accepts an RFC 4122 UUID and rejects a nil UUID', () => {
		expect(validator['id.uuid']('00000000-0000-4000-8000-000000000000', conf('id.uuid')).ok).toBe(
			true,
		);
		expect(validator['id.uuid']('00000000-0000-0000-0000-000000000000', conf('id.uuid')).ok).toBe(
			false,
		);
		expect(validator['id.uuid'](1, conf('id.uuid')).ok).toBe(false);
	});
});
