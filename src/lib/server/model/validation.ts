import type { FieldSchema, FieldKind } from '$lib/server/model/types';

type Validators = (value: unknown, conf: FieldSchema) => { ok: boolean; message: string };

function isUUID(value: unknown) {
	return (
		typeof value === 'string' &&
		/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
	);
}

function isEnum(value: unknown, conf: FieldSchema) {
	return typeof value === 'string' && conf.enum?.includes(value);
}

export const validators = {
	string: (value: unknown) => ({ ok: typeof value === 'string', message: 'Must be a string' }),
	boolean: (value: unknown) => ({ ok: typeof value === 'boolean', message: 'Must be a boolean' }),
	number: (value: unknown) => ({ ok: typeof value === 'number', message: 'Must be a number' }),
	enum: (value: unknown, conf: FieldSchema) => ({
		ok: isEnum(value, conf),
		message: 'Must be a valid enum value'
	}),
	'id.index': (value: unknown) => ({
		ok: typeof value === 'number' && Number.isInteger(value),
		message: 'Must be an integer'
	}),
	'id.uuid': (value: unknown) => ({ ok: isUUID(value), message: 'Must be a valid UUID' })
} as Record<FieldKind, Validators>;
