import { ModelSchemas } from '$lib/server/app/services';
import { runAppSync } from '$lib/server/effect/runtime';
import { getTable } from '$lib/server/table';
import { Effect } from 'effect';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const schemas = runAppSync(
		Effect.gen(function* () {
			const models = yield* ModelSchemas;
			return models.schemas;
		}),
	);
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
