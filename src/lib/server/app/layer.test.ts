import path from 'node:path';
import { makeAppLayer } from '$lib/server/app/layer';
import { ModelSchemas, ModelSchemasLayer, NipuuConfig } from '$lib/server/app/services';
import { loadConfigEffect } from '$lib/server/runtime/config';
import { findEffect } from '$lib/server/handlers/find/find';
import { generateSchemas, type ModelDefinition } from '$lib/server/model';
import { openTable } from '$lib/server/table/lifecycle';
import { TableStore } from '$lib/server/table/store/service';
import { assert, it } from '@effect/vitest';
import { ConfigProvider, Context, Effect, Layer, ManagedRuntime } from 'effect';

class Probe extends Context.Service<Probe, { readonly ok: boolean }>()('nipuu/Probe') {}

const configPath = path.join(process.cwd(), 'src/tests/config.mjs');
const missingRoute = path.join(
	process.cwd(),
	'src/lib/server/runtime/config/fixtures/no-route.mjs',
);

const withConfig = (file: string) =>
	makeAppLayer({ hold: false }).pipe(
		Layer.provide(
			ConfigProvider.layer(
				ConfigProvider.fromUnknown({
					NIPUU_CONFIG: file,
					NIPUU_SEED: '2',
				}),
			),
		),
	);

it.effect('AppLayer loads the fixture and lists its tables', () =>
	Effect.gen(function* () {
		const tables = yield* TableStore;
		const names = yield* tables.list;
		assert.deepStrictEqual([...names].toSorted(), ['todos', 'users']);
	}).pipe(Effect.provide(withConfig(configPath))),
);

it.effect('a config without ROUTE fails layer construction with ConfigShapeInvalid', () =>
	Effect.gen(function* () {
		const error = yield* Effect.flip(Effect.void.pipe(Effect.provide(withConfig(missingRoute))));
		assert.strictEqual(error._tag, 'ConfigShapeInvalid');
	}),
);

it('NipuuConfig is built once when two services depend on it', async () => {
	let builds = 0;
	const CountingConfig = Layer.effect(
		NipuuConfig,
		Effect.gen(function* () {
			builds += 1;
			return yield* loadConfigEffect;
		}),
	);

	const ProbeLayer = Layer.effect(
		Probe,
		Effect.gen(function* () {
			yield* NipuuConfig;
			const models = yield* ModelSchemas;
			return { ok: models.schemas.length > 0 };
		}),
	);

	const graph = ProbeLayer.pipe(
		Layer.provideMerge(ModelSchemasLayer),
		Layer.provideMerge(CountingConfig),
		Layer.provide(
			ConfigProvider.layer(
				ConfigProvider.fromUnknown({ NIPUU_CONFIG: configPath, NIPUU_SEED: '1' }),
			),
		),
	);

	builds = 0;
	const runtime = ManagedRuntime.make(graph);
	await runtime.runPromise(
		Effect.gen(function* () {
			yield* Probe;
			yield* NipuuConfig;
			yield* ModelSchemas;
		}),
	);
	assert.strictEqual(builds, 1);
	await runtime.dispose();
});

const model: ModelDefinition = {
	todos: (t) => ({
		id: t.id.index(),
		title: t.string().required(),
	}),
};

it.effect('a handler uses the provided TableStore instead of the process store', () =>
	Effect.gen(function* () {
		const schema = generateSchemas(model)[0];
		if (!schema) return yield* Effect.die('missing schema');

		const table = yield* openTable(schema, 0);
		const unused = Effect.die('unused');
		const mock = {
			get: () => Effect.succeed(table),
			list: unused,
			find: () => unused,
			select: () => unused,
			insert: () => unused,
			upsert: () => unused,
			update: () => unused,
			remove: () => unused,
			snapshot: unused,
			create: () => unused,
			reset: unused,
			flush: unused,
		};

		const error = yield* Effect.flip(
			findEffect(
				{
					action: 'find',
					model: 'todos',
					where: { id: { source: 'params', key: 'id', by: 'equal' } },
				},
				{ method: 'GET', path: '/todos/1', params: { id: '1' }, queries: {}, body: null },
			).pipe(Effect.provideService(TableStore, mock)),
		);
		assert.strictEqual(error._tag, 'RowNotFound');
	}),
);
