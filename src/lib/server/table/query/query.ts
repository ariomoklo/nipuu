import type { Row, Schema } from '$lib/server/model/types';
import type { FilterSchema } from '$lib/server/table/filter/filter';
import { clampLimit, clampPage, TABLE_PAGE_DEFAULT } from '$lib/server/table/query/parse';
import { filterValue, projectRow } from '$lib/server/table/row';
import { lookup, type Table } from '$lib/server/table/store/store';
import type { TableQueryPage } from '$lib/types/table';

function rowMatchesSearch(row: Row, schema: Schema, search: string): boolean {
	const q = search.trim();
	if (!q) return true;

	const qLower = q.toLowerCase();
	const asNumber = Number(q);
	const isNumeric = q !== '' && Number.isFinite(asNumber);
	const asBool = q === 'true' ? true : q === 'false' ? false : undefined;

	for (const field of Object.values(schema.fields)) {
		if (field.rel) continue;
		const cell = filterValue(row[field.name], undefined);

		switch (field.type) {
			case 'string':
			case 'id.uuid':
			case 'enum':
				if (typeof cell === 'string' && cell.toLowerCase().includes(qLower)) return true;
				break;
			case 'number':
			case 'id.index':
				if (isNumeric && cell === asNumber) return true;
				break;
			case 'boolean':
				if (asBool !== undefined && cell === asBool) return true;
				break;
		}
	}

	return false;
}

export function query(
	table: Table,
	input: {
		filters?: FilterSchema[];
		search?: string;
		page?: number;
		limit?: number;
	} = {},
): TableQueryPage {
	const filters = input.filters ?? [];
	const search = input.search?.trim() ?? '';
	const page = clampPage(input.page ?? 1);
	const limit = clampLimit(input.limit ?? TABLE_PAGE_DEFAULT);

	const found = lookup(table, 'filter', filters);
	const matched = Array.isArray(found) ? found : [];
	const searched = search
		? matched.filter((row) => rowMatchesSearch(row, table.schema, search))
		: matched;
	const total = searched.length;
	const start = (page - 1) * limit;

	return {
		rows: searched.slice(start, start + limit).map(projectRow),
		total,
		page,
		limit,
	};
}
