import type { Schema } from '$lib/server/model/types';
import { clearSchemas, addSchema } from '$lib/server/table/schema';
import { destroy, type Table } from '$lib/server/table/lifecycle';
import { sortByForeignKey } from '$lib/server/table/order/order';
import { bindRelations, hydrateRelations } from '$lib/server/table/relations/relations';
import { createTable, seed } from '$lib/server/table/store/store';

function registerSchemas(tables: Schema[]) {
	for (const table of tables) {
		for (const field of Object.values(table.fields)) {
			addSchema(`${table.name}.${field.name}`, field);
		}
	}
}

export function loadTables(map: Map<string, Table>, schemas: Schema[], seedCount: number) {
	for (const table of map.values()) {
		destroy(table);
	}

	map.clear();
	clearSchemas();
	registerSchemas(schemas);

	const sorted = sortByForeignKey(schemas);
	for (const schema of sorted) {
		const table = createTable(schema, seedCount);
		map.set(schema.name, table);
		seed(table, map);
	}

	for (const schema of sorted) {
		const table = map.get(schema.name)!;
		bindRelations(table, map);
		hydrateRelations(table, map);
	}
}
