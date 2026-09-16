import { getSchemas, initRuntime } from '$lib/server/runtime';
import { getTable } from '$lib/server/table';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	await initRuntime();

	const schemas = getSchemas();
	return {
		tables: schemas.map((schema) => {
			const relatedModels = new Set<string>();

			for (const field of Object.values(schema.fields)) {
				if (field.rel) relatedModels.add(field.rel.table);
			}

			for (const candidate of schemas) {
				if (
					candidate.name !== schema.name &&
					Object.values(candidate.fields).some((field) => field.rel?.table === schema.name)
				) {
					relatedModels.add(candidate.name);
				}
			}

			return {
				name: schema.name,
				rowCount: getTable(schema.name)?.rows.length ?? 0,
				propertyCount: Object.keys(schema.fields).length,
				relatedModels: [...relatedModels],
			};
		}),
	};
};
