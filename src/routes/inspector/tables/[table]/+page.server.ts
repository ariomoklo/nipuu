import { error, fail, redirect } from '@sveltejs/kit';
import { INSPECTOR_URL } from '$lib/inspector';
import { validate } from '$lib/server/model';
import { initRuntime } from '$lib/server/runtime';
import {
	getTable,
	parseTableQuery,
	payloadFromForm,
	toFieldMeta,
	toStore,
	type TableStore
} from '$lib/server/table';
import type { Actions, PageServerLoad } from './$types';

async function requireTable(name: string): Promise<TableStore> {
	await initRuntime();
	const table = getTable(name);
	if (!table) error(404, `Unknown table: ${name}`);
	return table;
}

export const load: PageServerLoad = async ({ params, url }) => {
	const table = await requireTable(params.table);
	const query = parseTableQuery(table.schema, url.searchParams);
	const result = table.query(query);

	return {
		name: table.schema.name,
		fields: Object.values(table.schema.fields).map(toFieldMeta),
		rows: result.rows,
		total: result.total,
		page: result.page,
		limit: result.limit,
		q: query.search,
		values: query.values,
		operators: query.operators
	};
};

export const actions: Actions = {
	create: async ({ params, request }) => {
		const table = await requireTable(params.table);
		const payload = payloadFromForm(table.schema, await request.formData(), 'create');
		const result = validate([table.schema], toStore(), table.schema.name, payload);
		if (!result.ok) return fail(400, { errors: result.errors, action: 'create' });
		table.insert(result.data);
		redirect(303, `${INSPECTOR_URL}/tables/${table.schema.name}`);
	},

	update: async ({ params, request }) => {
		const table = await requireTable(params.table);
		const form = await request.formData();
		const ids = payloadFromForm(table.schema, form, 'delete');
		if (Object.keys(ids).length === 0) {
			return fail(400, { errors: ['Missing identity fields'], action: 'update' });
		}
		const payload = payloadFromForm(table.schema, form, 'update');
		const result = validate([table.schema], toStore(), table.schema.name, payload, {
			partial: true
		});
		if (!result.ok) return fail(400, { errors: result.errors, action: 'update' });
		const updated = table.update(ids, result.data);
		if (!updated) return fail(404, { errors: ['Row not found'], action: 'update' });
		redirect(303, `${INSPECTOR_URL}/tables/${table.schema.name}`);
	},

	delete: async ({ params, request }) => {
		const table = await requireTable(params.table);
		const ids = payloadFromForm(table.schema, await request.formData(), 'delete');
		if (Object.keys(ids).length === 0) {
			return fail(400, { errors: ['Missing identity fields'], action: 'delete' });
		}
		const removed = table.delete(ids);
		if (!removed) return fail(404, { errors: ['Row not found'], action: 'delete' });
		redirect(303, `${INSPECTOR_URL}/tables/${table.schema.name}`);
	}
};
