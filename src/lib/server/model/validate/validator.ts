import type { FieldKind, FieldSchema } from '$lib/server/model/types';

type Validator = (value: unknown, conf: FieldSchema) => { ok: boolean; message: string };

function isUuidString(value: unknown) {
	return (
		typeof value === 'string' &&
		/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
	);
}

function isString(value: unknown) {
	return { ok: typeof value === 'string', message: 'Must be a string' };
}

function isBoolean(value: unknown) {
	return { ok: typeof value === 'boolean', message: 'Must be a boolean' };
}

function isNumber(value: unknown) {
	return { ok: typeof value === 'number', message: 'Must be a number' };
}

function isEnumValue(value: unknown, conf: FieldSchema) {
	return {
		ok: typeof value === 'string' && Boolean(conf.enum?.includes(value)),
		message: 'Must be a valid enum value',
	};
}

function isIndexId(value: unknown) {
	return {
		ok: typeof value === 'number' && Number.isInteger(value),
		message: 'Must be an integer',
	};
}

function isUuid(value: unknown) {
	return { ok: isUuidString(value), message: 'Must be a valid UUID' };
}

export const validator: Record<FieldKind, Validator> = {
	string: isString,
	boolean: isBoolean,
	number: isNumber,
	enum: isEnumValue,
	'id.index': isIndexId,
	'id.uuid': isUuid,
};
