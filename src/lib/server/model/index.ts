export type FieldKind = 'string' | 'boolean' | 'index' | 'uuid';

export type FactoryContext = { index: number };

export type CompiledField = {
	name: string;
	type: FieldKind;
	required: boolean;
	hasDefault: boolean;
	defaultValue: unknown;
	factory?: (ctx: FactoryContext) => unknown;
	rel?: { table: string; field: string };
};

export type CompiledTable = {
	name: string;
	fields: Record<string, CompiledField>;
};

export type Row = Record<string, unknown>;
export type Store = Record<string, Row[]>;

export const compileField: unique symbol = Symbol('nipuu.compileField');

export type Field = {
	required(): Field;
	default(value: unknown): Field;
	factory(fn: (ctx: FactoryContext) => unknown): Field;
	rel(table: string, field: string): Field;
};

export class FieldBuilder implements Field {
	#type: FieldKind;
	#required = false;
	#hasDefault = false;
	#defaultValue: unknown;
	#factory?: (ctx: FactoryContext) => unknown;
	#rel?: { table: string; field: string };

	constructor(type: FieldKind) {
		this.#type = type;
	}

	required(): this {
		this.#required = true;
		return this;
	}

	default(value: unknown): this {
		this.#hasDefault = true;
		this.#defaultValue = value;
		return this;
	}

	factory(fn: (ctx: FactoryContext) => unknown): this {
		this.#factory = fn;
		return this;
	}

	rel(table: string, field: string): this {
		this.#rel = { table, field };
		return this;
	}

	[compileField](name: string): CompiledField {
		return {
			name,
			type: this.#type,
			required: this.#required,
			hasDefault: this.#hasDefault,
			defaultValue: this.#defaultValue,
			factory: this.#factory,
			rel: this.#rel
		};
	}
}

export type ModelT = {
	string: () => Field;
	boolean: () => Field;
	id: {
		index: () => Field;
		uuid: () => Field;
	};
};

export type ModelDefinition = Record<string, (t: ModelT) => Record<string, Field>>;

export function createT(): ModelT {
	return {
		string: () => new FieldBuilder('string'),
		boolean: () => new FieldBuilder('boolean'),
		id: {
			index: () => new FieldBuilder('index'),
			uuid: () => new FieldBuilder('uuid')
		}
	};
}

export function compileModel(definition: ModelDefinition): CompiledTable[] {
	const t = createT();
	return Object.entries(definition).map(([name, factory]) => {
		const built = factory(t);
		const fields: Record<string, CompiledField> = {};
		for (const [fieldName, builder] of Object.entries(built)) {
			if (!(builder instanceof FieldBuilder)) {
				throw new Error(`MODEL.${name}.${fieldName} must be a field builder`);
			}
			fields[fieldName] = builder[compileField](fieldName);
		}
		return { name, fields };
	});
}

export function sortTablesByFk(tables: CompiledTable[]): CompiledTable[] {
	const byName = new Map(tables.map((table) => [table.name, table]));
	const deps = new Map<string, string[]>();

	for (const table of tables) {
		const related = new Set<string>();
		for (const field of Object.values(table.fields)) {
			if (field.rel) related.add(field.rel.table);
		}
		deps.set(table.name, [...related]);
	}

	const sorted: CompiledTable[] = [];
	const visiting = new Set<string>();
	const visited = new Set<string>();

	const visit = (name: string) => {
		if (visited.has(name)) return;
		if (visiting.has(name)) {
			throw new Error(`Circular relation involving table "${name}"`);
		}
		visiting.add(name);
		for (const dep of deps.get(name) ?? []) visit(dep);
		visiting.delete(name);
		visited.add(name);
		const table = byName.get(name);
		if (table) sorted.push(table);
	};

	for (const table of tables) visit(table.name);
	return sorted;
}

function seedFieldValue(field: CompiledField, index: number, store: Store): unknown {
	if (field.rel) {
		const related = store[field.rel.table] ?? [];
		if (related.length === 0) {
			throw new Error(
				`Cannot seed ${field.name}: related table "${field.rel.table}" has no rows`
			);
		}
		const row = related[Math.floor(Math.random() * related.length)];
		return row[field.rel.field];
	}

	if (field.type === 'index') return index;
	if (field.type === 'uuid') return crypto.randomUUID();
	if (field.factory) return field.factory({ index });
	if (field.hasDefault) return field.defaultValue;
	if (field.type === 'boolean') return false;
	if (field.type === 'string') return '';
	return null;
}

export function seedStore(tables: CompiledTable[], count: number): Store {
	const store: Store = {};
	for (const table of sortTablesByFk(tables)) {
		const rows: Row[] = [];
		for (let index = 1; index <= count; index += 1) {
			const row: Row = {};
			for (const field of Object.values(table.fields)) {
				row[field.name] = seedFieldValue(field, index, store);
			}
			rows.push(row);
		}
		store[table.name] = rows;
	}
	return store;
}

export type ValidationResult =
	| { ok: true; data: Row }
	| { ok: false; errors: string[] };

function typeError(field: CompiledField, value: unknown): string | null {
	if (field.type === 'string' || field.type === 'uuid') {
		return typeof value === 'string' ? null : `${field.name} must be a string`;
	}
	if (field.type === 'boolean') {
		return typeof value === 'boolean' ? null : `${field.name} must be a boolean`;
	}
	if (field.type === 'index') {
		return typeof value === 'number' && Number.isInteger(value)
			? null
			: `${field.name} must be an integer`;
	}
	return null;
}

export function validate(
	tables: CompiledTable[],
	store: Store,
	tableName: string,
	payload: unknown,
	options: { partial?: boolean } = {}
): ValidationResult {
	const table = tables.find((item) => item.name === tableName);
	if (!table) {
		return { ok: false, errors: [`Unknown table: ${tableName}`] };
	}

	if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
		return { ok: false, errors: ['Body must be an object'] };
	}

	const body = payload as Row;
	const errors: string[] = [];
	const data: Row = {};
	const partial = options.partial === true;

	for (const field of Object.values(table.fields)) {
		const present = Object.hasOwn(body, field.name);
		if (!present) {
			if (partial) continue;
			if (field.hasDefault) {
				data[field.name] = field.defaultValue;
				continue;
			}
			if (field.required) {
				errors.push(`${field.name} is required`);
			}
			continue;
		}

		const value = body[field.name];
		const mismatch = typeError(field, value);
		if (mismatch) errors.push(mismatch);

		if (field.rel && value != null) {
			const related = store[field.rel.table] ?? [];
			const exists = related.some((row) => row[field.rel!.field] === value);
			if (!exists) {
				errors.push(
					`${field.name} does not reference an existing ${field.rel.table}.${field.rel.field}`
				);
			}
		}

		data[field.name] = value;
	}

	return errors.length > 0 ? { ok: false, errors } : { ok: true, data };
}
