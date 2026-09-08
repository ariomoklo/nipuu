import { describe, expect, it } from 'vitest';
import { compileField, field, fields, isCompilable } from '$lib/server/model/field/field';

describe('field', () => {
	it('compiles type, name, and optional flags', () => {
		const compiled = field('string')[compileField]('title');
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
		const builder = field('id.uuid')
			.required()
			.default('unused')
			.factory(factory)
			.rel('users', { field: 'id' });

		expect(isCompilable(builder)).toBe(true);
		if (!isCompilable(builder)) return;

		const compiled = builder[compileField]('owner');
		expect(compiled.name).toBe('owner');
		expect(compiled.type).toBe('id.uuid');
		expect(compiled.required).toBe(true);
		expect(compiled.hasDefault).toBe(true);
		expect(compiled.defaultValue).toBe('unused');
		expect(compiled.factory).toBe(factory);
		expect(compiled.rel).toEqual({ table: 'users', field: 'id', omit: [] });
	});
});

describe('fields', () => {
	it('returns builders for each field kind', () => {
		const t = fields();
		expect(isCompilable(t.string())).toBe(true);
		expect(isCompilable(t.boolean())).toBe(true);
		expect(isCompilable(t.id.index())).toBe(true);
		expect(isCompilable(t.id.uuid())).toBe(true);
	});
});
