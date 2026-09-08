export type FieldKind = 'string' | 'boolean' | 'number' | 'enum' | 'id.index' | 'id.uuid';

export type FactoryContext = { index: number };

export type FieldSchema = {
	name: string;
	type: FieldKind;
	enum?: string[];
	required: boolean;
	hasDefault: boolean;
	defaultValue: unknown;
	factory?: (ctx: FactoryContext) => unknown;
	rel?: { table: string; field: string; omit: string[] };
};

export type Schema = {
	name: string;
	fields: Record<string, FieldSchema>;
};

export type FieldItem = {
	/** model definition schema key, e.g. 'todos.id' */
	schema: string;
	value: unknown;
	hasRelation: boolean;
};

export type RelationValue = {
	index: number;
	row: Row;
};

export type Row = Record<string, FieldItem>;
export type Payload = Record<string, unknown>;
export type Store = Record<string, Row[]>;

export type FieldBuilder = {
	required(): FieldBuilder;
	default(value: unknown): FieldBuilder;
	factory(fn: (ctx: FactoryContext) => unknown): FieldBuilder;
	rel(table: string, options: { field: string; omit?: string[] }): FieldBuilder;
};

export type TableFieldBuilder = {
	string: () => FieldBuilder;
	boolean: () => FieldBuilder;
	number: () => FieldBuilder;
	id: {
		index: () => FieldBuilder;
		uuid: () => FieldBuilder;
	};
};

export type ModelDefinition = Record<string, (t: TableFieldBuilder) => Record<string, FieldBuilder>>;

export type ValidationResult =
	| { ok: true; data: Payload }
	| { ok: false; errors: string[] };
