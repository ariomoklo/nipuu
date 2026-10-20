import { NipuuConfig } from '$lib/server/app/services';
import { handleRequestEffect } from '$lib/server/runtime/handle';
import { makeLogStoreLayer, LogStore } from '$lib/server/logs/service';
import { generateSchemas, type ModelDefinition } from '$lib/server/model';
import { makeTableStoreLayer, TableStore } from '$lib/server/table/store/service';
import type { RouteHandler } from '$lib/types';
import { assert, it } from '@effect/vitest';
import { Duration, Effect, Fiber, Layer, Logger, References } from 'effect';
import { TestClock } from 'effect/testing';

const model: ModelDefinition = {
	items: (t) => ({
		id: t.id.index(),
		title: t.string().required(),
	}),
};

function layerFor(route: Record<string, Record<string, RouteHandler>>) {
	return Layer.mergeAll(
		makeLogStoreLayer(20),
		makeTableStoreLayer(),
		Layer.succeed(NipuuConfig, { MODEL: model, ROUTE: route }),
	);
}

it.effect('a delayed route logs a duration taken from the Clock', () =>
	Effect.gen(function* () {
		const fiber = yield* handleRequestEffect(
			new Request('http://nipuu.test/slow'),
			new URL('http://nipuu.test/slow'),
		).pipe(Effect.forkChild);

		yield* TestClock.adjust(Duration.millis(300));
		const response = yield* Fiber.join(fiber);
		assert.strictEqual(yield* Effect.promise(() => response.text()), 'ok');

		const logs = yield* LogStore;
		const entries = yield* logs.list;
		assert.strictEqual(entries[0]?.status, 200);
		assert.strictEqual(entries[0]?.duration, 300);
	}).pipe(
		Effect.provide(
			layerFor({
				'/slow': { GET: { action: 'static', response: 'ok', delay: 300 } },
			}),
		),
	),
);

it.effect('an unmatched path logs a 404', () =>
	Effect.gen(function* () {
		const response = yield* handleRequestEffect(
			new Request('http://nipuu.test/missing'),
			new URL('http://nipuu.test/missing'),
		);
		assert.strictEqual(response.status, 404);

		const logs = yield* LogStore;
		const entries = yield* logs.list;
		assert.strictEqual(entries[0]?.status, 404);
		assert.strictEqual(entries[0]?.path, '/missing');
	}).pipe(Effect.provide(layerFor({ '/': { GET: { action: 'static', response: 'ok' } } }))),
);

it.effect('a throwing response mapper still logs status 500', () =>
	Effect.gen(function* () {
		const tables = yield* TableStore;
		yield* tables.create(generateSchemas(model), 0);

		const response = yield* handleRequestEffect(
			new Request('http://nipuu.test/items'),
			new URL('http://nipuu.test/items'),
		);
		assert.strictEqual(response.status, 500);

		const logs = yield* LogStore;
		const entries = yield* logs.list;
		assert.strictEqual(entries[0]?.status, 500);
	}).pipe(
		Effect.provide(
			layerFor({
				'/items': {
					GET: {
						action: 'search',
						model: 'items',
						response: () => {
							throw new Error('mapper');
						},
					},
				},
			}),
		),
	),
);

it.effect('log annotations include the request id', () => {
	const lines: Array<{ message: unknown; annotations: Record<string, unknown> }> = [];
	const capture = Logger.make((options) => {
		lines.push({
			message: options.message,
			annotations: options.fiber.getRef(References.CurrentLogAnnotations),
		});
	});

	return Effect.gen(function* () {
		yield* handleRequestEffect(new Request('http://nipuu.test/'), new URL('http://nipuu.test/'));
		const logged = lines.find(
			(line) => Array.isArray(line.message) && line.message[0] === 'request',
		);
		assert.ok(logged);
		assert.strictEqual(typeof logged.annotations.requestId, 'string');
		assert.strictEqual(logged.annotations.path, '/');
	}).pipe(
		Effect.provide(layerFor({ '/': { GET: { action: 'static', response: 'ok' } } })),
		Effect.provide(Logger.layer([capture])),
	);
});
