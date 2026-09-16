import { error, fail, redirect } from '@sveltejs/kit';
import { INSPECTOR_URL } from '$lib/inspector';
import { initRuntime } from '$lib/server/runtime';
import {
	deleteRow,
	getTable,
	getTables,
	parseTableQuery,
	payloadFromForm,
	query,
	relationOptions,
	toFieldMeta,
	type Table,
} from '$lib/server/table';
import type { Actions, PageServerLoad } from './$types';

async function requireTable(name: string): Promise<Table> {
	await initRuntime();
	const table = getTable(name);
	if (!table) error(404, `Unknown table: ${name}`);
	return table;
}

export const load: PageServerLoad = async ({ params, url }) => {
	const table = await requireTable(params.table);
	const parsed = parseTableQuery(table.schema, url.searchParams);
	const result = query(table, parsed);

	return {
		name: table.schema.name,
		fields: Object.values(table.schema.fields).map(toFieldMeta),
		rows: result.rows,
		total: result.total,
		page: result.page,
		limit: result.limit,
		q: parsed.search,
		values: parsed.values,
		operators: parsed.operators,
		relations: relationOptions(table, getTables()),
	};
};

export const actions: Actions = {
	delete: async ({ params, request }) => {
		const table = await requireTable(params.table);
		const ids = payloadFromForm(table.schema, await request.formData(), 'delete');
		if (Object.keys(ids).length === 0) {
			return fail(400, { errors: ['Missing identity fields'], action: 'delete' });
		}

		const removed = deleteRow(table, ids);
		if (!removed) return fail(404, { errors: ['Row not found'], action: 'delete' });
		redirect(303, `${INSPECTOR_URL}/tables/${table.schema.name}`);
	},
};
