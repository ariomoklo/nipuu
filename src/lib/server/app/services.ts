import { generateSchemas, type Schema } from '$lib/server/model';
import { loadConfigEffect, type ConfigDefinition } from '$lib/server/runtime/config';
import { Context, Effect, Layer } from 'effect';

export class NipuuConfig extends Context.Service<NipuuConfig, ConfigDefinition>()(
	'nipuu/NipuuConfig',
) {}

export class ModelSchemas extends Context.Service<
	ModelSchemas,
	{ readonly schemas: readonly Schema[] }
>()('nipuu/ModelSchemas') {}

export const NipuuConfigLayer = Layer.effect(NipuuConfig, loadConfigEffect);

export const ModelSchemasLayer = Layer.effect(
	ModelSchemas,
	Effect.gen(function* () {
		const config = yield* NipuuConfig;
		return { schemas: generateSchemas(config.MODEL) };
	}),
);
