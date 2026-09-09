import type { Payload, Row } from '$lib/server/model';
import { filterValue, getTable, getTables, type Table } from '$lib/server/table';
import type { RouteHandlerObject } from '$lib/types';

export function projectRowScalar(row: Row, table: Table): Payload {
	const out: Payload = {};
	for (const [key, item] of Object.entries(row)) {
		const field = table.schema.fields[key];
		out[key] = filterValue(item, field?.rel?.field);
	}

	return out;
}

export function projectStore(): Record<string, Payload[]> {
	const out: Record<string, Payload[]> = {};
	for (const [name, table] of getTables()) {
		out[name] = table.rows.map((row) => projectRowScalar(row, table));
	}

	return out;
}

export function requireTable(handler: RouteHandlerObject): Table | undefined {
	if (typeof handler.model !== 'string') return undefined;
	return getTable(handler.model);
}
