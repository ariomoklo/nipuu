import { error, fail, redirect } from '@sveltejs/kit';
import { INSPECTOR_URL } from '$lib/inspector';
import { validate } from '$lib/server/model';
import { initRuntime } from '$lib/server/runtime';
import {
	coerceFieldValue,
	find,
	getTable,
	getTables,
	payloadFromForm,
	relationOptions,
	resolveRelationLabels,
	toFieldMeta,
	toStore,
	update,
	type Table
} from '$lib/server/table';
import type { TableFieldMeta } from '$lib/types/table';
import type { Actions, PageServerLoad } from './$types';

async function requireTable(name: string): Promise<Table> {
	await initRuntime();
	const table = getTable(name);
	if (!table) error(404, `Unknown table: ${name}`);
	return table;
}

/** Identity condition from the query string, e.g. `?id=7`. */
function identityFromQuery(
	fields: TableFieldMeta[],
	params: URLSearchParams
): Record<string, unknown> {
	const cond: Record<string, unknown> = {};
	for (const field of fields) {
		if (!field.identity) continue;

		const raw = params.get(field.name);
		if (raw == null) continue;

		const value = coerceFieldValue(field.type, raw);
		if (value === undefined) continue;
		cond[field.name] = value;
	}

	return cond;
}

export const load: PageServerLoad = async ({ params, url }) => {
	const table = await requireTable(params.table);
	const fields = Object.values(table.schema.fields).map(toFieldMeta);
	const cond = identityFromQuery(fields, url.searchParams);
	if (Object.keys(cond).length === 0) error(400, 'Missing identity fields');

	const row = find(table, cond);
	if (!row) error(404, 'Row not found');

	return { name: table.schema.name, fields, row, relations: relationOptions(table, getTables()) };
};

export const actions: Actions = {
	default: async ({ params, request }) => {
		const table = await requireTable(params.table);
		const form = await request.formData();
		const ids = payloadFromForm(table.schema, form, 'delete');
		if (Object.keys(ids).length === 0) {
			return fail(400, { errors: ['Missing identity fields'] });
		}

		resolveRelationLabels(form, relationOptions(table, getTables()));
		const payload = payloadFromForm(table.schema, form, 'update');
		const result = validate([table.schema], toStore(), table.schema.name, payload, {
			partial: true
		});
		if (!result.ok) return fail(400, { errors: result.errors });

		const updated = update(table, ids, result.data);
		if (!updated) return fail(404, { errors: ['Row not found'] });
		redirect(303, `${INSPECTOR_URL}/tables/${table.schema.name}`);
	}
};
