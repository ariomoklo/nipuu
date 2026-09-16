import { error, fail, redirect } from '@sveltejs/kit';
import { INSPECTOR_URL } from '$lib/inspector';
import { validate } from '$lib/server/model';
import { initRuntime } from '$lib/server/runtime';
import {
	getTable,
	getTables,
	insert,
	payloadFromForm,
	relationOptions,
	resolveRelationLabels,
	toFieldMeta,
	toStore,
	type Table
} from '$lib/server/table';
import type { Actions, PageServerLoad } from './$types';

async function requireTable(name: string): Promise<Table> {
	await initRuntime();
	const table = getTable(name);
	if (!table) error(404, `Unknown table: ${name}`);
	return table;
}

export const load: PageServerLoad = async ({ params }) => {
	const table = await requireTable(params.table);
	return {
		name: table.schema.name,
		fields: Object.values(table.schema.fields).map(toFieldMeta),
		relations: relationOptions(table, getTables())
	};
};

export const actions: Actions = {
	default: async ({ params, request }) => {
		const table = await requireTable(params.table);
		const form = await request.formData();
		resolveRelationLabels(form, relationOptions(table, getTables()));

		const payload = payloadFromForm(table.schema, form, 'create');
		const result = validate([table.schema], toStore(), table.schema.name, payload);
		if (!result.ok) return fail(400, { errors: result.errors });
		insert(table, result.data);
		redirect(303, `${INSPECTOR_URL}/tables/${table.schema.name}`);
	}
};
