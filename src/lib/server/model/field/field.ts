import type {
	FactoryContext,
	FieldBuilder,
	FieldKind,
	FieldSchema,
	TableFieldBuilder,
} from '$lib/server/model/types';

type FieldState = {
	required: boolean;
	hasDefault: boolean;
	defaultValue: unknown;
	factory?: (ctx: FactoryContext) => unknown;
	rel?: { table: string; field: string; omit: string[] };
};

const unset: FieldState = {
	required: false,
	hasDefault: false,
	defaultValue: undefined,
	factory: undefined,
	rel: undefined,
};

export const compileField: unique symbol = Symbol('nipuu.compileField');

export type CompilableField = FieldBuilder & {
	[compileField]: (name: string) => FieldSchema;
};

export function field(type: FieldKind, state: FieldState = unset): CompilableField {
	const next = (patch: Partial<FieldState>): CompilableField => field(type, { ...state, ...patch });

	return {
		required: () => next({ required: true }),
		default: (value) => next({ hasDefault: true, defaultValue: value }),
		factory: (fn) => next({ factory: fn }),
		rel: (table, options) =>
			next({ rel: { table, field: options.field, omit: options.omit ?? [] } }),
		[compileField]: (name) => ({
			name,
			type,
			required: state.required,
			hasDefault: state.hasDefault,
			defaultValue: state.defaultValue,
			factory: state.factory,
			rel: state.rel,
		}),
	};
}

export function fields(): TableFieldBuilder {
	return {
		string: () => field('string'),
		boolean: () => field('boolean'),
		number: () => field('number'),
		id: {
			index: () => field('id.index'),
			uuid: () => field('id.uuid'),
		},
	};
}

export function isCompilable(value: FieldBuilder): value is CompilableField {
	return typeof (value as CompilableField)[compileField] === 'function';
}
