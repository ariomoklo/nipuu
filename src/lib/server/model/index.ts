import type { FieldSchema, ModelDefinition, Schema } from '$lib/server/model/types';
import { compileField, fields, isCompilable } from '$lib/server/model/field/field';

export function generateSchemas(definition: ModelDefinition): Schema[] {
	const t = fields();

	return Object.entries(definition).map(([name, factory]) => {
		const built = factory(t);
		const compiled: Record<string, FieldSchema> = {};

		for (const [fieldName, builder] of Object.entries(built)) {
			if (!isCompilable(builder)) {
				throw new Error(`MODEL.${name}.${fieldName} must be a field builder`);
			}

			compiled[fieldName] = builder[compileField](fieldName);
		}

		return { name, fields: compiled };
	});
}

export * from '$lib/server/model/types';
export { compileField, field, fields } from '$lib/server/model/field/field';
export { validate } from '$lib/server/model/validate/validate';
