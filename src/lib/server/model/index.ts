import type {
	FieldSchema,
	Schema,
	FactoryContext,
	FieldKind,
	ModelDefinition,
	TableFieldBuilder,
	Payload,
	Store,
	ValidationResult,
	FieldBuilder
} from '$lib/server/model/types';
import { validators } from '$lib/server/model/validation';
import schemaStore from '$lib/server/table/schema';

export * from '$lib/server/model/types';
export const compileField: unique symbol = Symbol('nipuu.compileField');

export class Field implements FieldBuilder {
	#type: FieldKind;
	#required = false;
	#hasDefault = false;
	#defaultValue: unknown;
	#factory?: (ctx: FactoryContext) => unknown;
	#rel?: { table: string; field: string; omit: string[] };

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

	rel(table: string, options: { field: string; omit?: string[] }): this {
		this.#rel = { table, field: options.field, omit: options.omit ?? [] };
		return this;
	}

	[compileField](name: string): FieldSchema {
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

	static builder(): TableFieldBuilder {
		return {
			string: () => new Field('string'),
			boolean: () => new Field('boolean'),
			number: () => new Field('number'),
			id: {
				index: () => new Field('id.index'),
				uuid: () => new Field('id.uuid')
			}
		};
	}
}

export function generateSchemas(definition: ModelDefinition): Schema[] {
	const t = Field.builder();

	return Object.entries(definition).map(([name, factory]) => {
		const built = factory(t);
		const fields: Record<string, FieldSchema> = {};

		for (const [fieldName, builder] of Object.entries(built)) {
			if (!(builder instanceof Field)) {
				throw new Error(`MODEL.${name}.${fieldName} must be a field builder`);
			}

			fields[fieldName] = builder[compileField](fieldName);
			schemaStore.add(`${name}.${fieldName}`, fields[fieldName]);
		}

		return { name, fields };
	});
}

export function validate(
	tables: Schema[],
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

	const body = payload as Payload;
	const errors: string[] = [];
	const data: Payload = {};
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
		const valid = validators[field.type](value, field);
		if (!valid.ok) {
			const message = valid.message.startsWith('Must')
				? `${field.name} ${valid.message[0].toLowerCase()}${valid.message.slice(1)}`
				: valid.message;
			errors.push(message);
			continue;
		}

		if (field.rel && value != null) {
			const related = store[field.rel.table] ?? [];
			const exists = related.some((row) => row[field.rel!.field]?.value === value);
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
