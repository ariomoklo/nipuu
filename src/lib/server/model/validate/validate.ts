import type { Payload, Schema, Store, ValidationResult } from '$lib/server/model/types';
import { payloadSchema, shapeMessages } from '$lib/server/model/validate/schema';
import { Cause, Data, Effect, Exit, Schema as S } from 'effect';

export class ValidationFailed extends Data.TaggedError('ValidationFailed')<{
	readonly errors: ReadonlyArray<string>;
}> {}

function isRecord(value: unknown): value is Payload {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function relationMiss(
	fieldName: string,
	table: Schema,
	store: Store,
	value: unknown,
): string | undefined {
	const field = table.fields[fieldName];
	if (!field?.rel || value == null) return undefined;

	const related = store[field.rel.table] ?? [];
	const exists = related.some((row) => row[field.rel!.field]?.value === value);
	if (exists) return undefined;

	return `${field.name} does not reference an existing ${field.rel.table}.${field.rel.field}`;
}

function collect(
	table: Schema,
	store: Store,
	body: Payload,
	partial: boolean,
	decoded: Payload | undefined,
	shape: Map<string, string>,
): { errors: string[]; data: Payload } {
	const errors: string[] = [];
	const data: Payload = {};

	for (const field of Object.values(table.fields)) {
		const shapeError = shape.get(field.name);
		if (shapeError) {
			errors.push(shapeError);
			continue;
		}

		const present = Object.hasOwn(body, field.name);
		if (!present) {
			if (!partial && field.hasDefault) data[field.name] = field.defaultValue;
			continue;
		}

		const value = decoded ? decoded[field.name] : body[field.name];
		const relation = relationMiss(field.name, table, store, value);
		if (relation) {
			errors.push(relation);
			continue;
		}

		if (present || Object.hasOwn(data, field.name)) data[field.name] = value;
	}

	return { errors, data };
}

export function validateEffect(
	tables: ReadonlyArray<Schema>,
	store: Store,
	tableName: string,
	payload: unknown,
	options: { partial?: boolean } = {},
): Effect.Effect<Payload, ValidationFailed> {
	const table = tables.find((item) => item.name === tableName);
	if (!table) {
		return Effect.fail(new ValidationFailed({ errors: [`Unknown table: ${tableName}`] }));
	}

	if (!isRecord(payload)) {
		return Effect.fail(new ValidationFailed({ errors: ['Body must be an object'] }));
	}

	const partial = options.partial === true;
	const schema = payloadSchema(table, partial);

	return Effect.gen(function* () {
		const exit = yield* Effect.exit(S.decodeUnknownEffect(schema)(payload, { errors: 'all' }));
		const shape = new Map<string, string>();
		let decoded: Payload | undefined;

		if (Exit.isFailure(exit)) {
			const error = Cause.squash(exit.cause);
			if (S.isSchemaError(error)) {
				for (const [name, message] of shapeMessages(error.issue, table)) {
					shape.set(name, message);
				}
			}
		} else {
			decoded = exit.value as Payload;
		}

		const { errors, data } = collect(table, store, payload, partial, decoded, shape);
		if (errors.length > 0) return yield* new ValidationFailed({ errors });

		return data;
	});
}

export function validate(
	tables: Schema[],
	store: Store,
	tableName: string,
	payload: unknown,
	options: { partial?: boolean } = {},
): ValidationResult {
	const exit = Effect.runSync(
		Effect.exit(validateEffect(tables, store, tableName, payload, options)),
	);
	if (Exit.isFailure(exit)) {
		const error = Cause.squash(exit.cause);
		const errors = error instanceof ValidationFailed ? error.errors : ['Body must be an object'];
		return { ok: false, errors: [...errors] };
	}

	return { ok: true, data: exit.value };
}
