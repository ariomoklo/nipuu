import type { Payload, Schema, Store, ValidationResult } from '$lib/server/model/types';
import { validator } from '$lib/server/model/validate/validator';

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
		const valid = validator[field.type](value, field);
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
