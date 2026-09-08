import type { FieldSchema } from '$lib/server/model/types';

const SCHEMA_KEY = Symbol.for('nipuu.schema');

type GlobalSchema = typeof globalThis & {
	[SCHEMA_KEY]?: Map<string, FieldSchema>;
};

function schemas(): Map<string, FieldSchema> {
	const global = globalThis as GlobalSchema;
	if (!global[SCHEMA_KEY]) global[SCHEMA_KEY] = new Map();
	return global[SCHEMA_KEY];
}

/** get schema by key. <table>.<field> */
export function getSchema(key: string): FieldSchema | undefined {
	return schemas().get(key);
}

/** add schema to store. <table>.<field> */
export function addSchema(key: string, schema: FieldSchema): void {
	schemas().set(key, schema);
}

export function clearSchemas(): void {
	schemas().clear();
}
