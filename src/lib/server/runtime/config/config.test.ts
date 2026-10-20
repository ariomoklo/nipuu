import path from 'node:path';
import { assert, it } from '@effect/vitest';
import { ConfigProvider, Effect } from 'effect';
import {
	ConfigImportFailed,
	ConfigPathMissing,
	ConfigShapeInvalid,
	SeedInvalid,
	loadConfigEffect,
	seedCount,
	shapeMessage,
} from '$lib/server/runtime/config';

const validConfig = path.join(process.cwd(), 'src/tests/config.mjs');
const missingRoute = path.join(
	process.cwd(),
	'src/lib/server/runtime/config/fixtures/no-route.mjs',
);
const missingFile = path.join(process.cwd(), 'src/lib/server/runtime/config/fixtures/missing.mjs');

const withEnv = (env: Record<string, string>) =>
	Effect.provide(ConfigProvider.layer(ConfigProvider.fromUnknown(env)));

it.effect('a missing path fails with ConfigPathMissing', () =>
	Effect.gen(function* () {
		const error = yield* Effect.flip(loadConfigEffect.pipe(withEnv({})));
		assert.instanceOf(error, ConfigPathMissing);
		assert.strictEqual(error._tag, 'ConfigPathMissing');
		assert.strictEqual(
			error.message,
			'config is not set. Start mock server with: nipuu <config-file>',
		);
	}),
);

it.effect('a fixture without ROUTE fails with ConfigShapeInvalid naming ROUTE', () =>
	Effect.gen(function* () {
		const error = yield* Effect.flip(
			loadConfigEffect.pipe(withEnv({ NIPUU_CONFIG: missingRoute })),
		);
		assert.instanceOf(error, ConfigShapeInvalid);
		assert.strictEqual(error._tag, 'ConfigShapeInvalid');
		assert.strictEqual(error.missing, 'ROUTE');
		assert.strictEqual(error.path, missingRoute);
		assert.strictEqual(
			shapeMessage(error.path),
			`Config must export MODEL and ROUTE: ${missingRoute}`,
		);
	}),
);

it.effect('a path that does not exist fails with ConfigImportFailed', () =>
	Effect.gen(function* () {
		const error = yield* Effect.flip(loadConfigEffect.pipe(withEnv({ NIPUU_CONFIG: missingFile })));
		assert.instanceOf(error, ConfigImportFailed);
		assert.strictEqual(error._tag, 'ConfigImportFailed');
		assert.strictEqual(error.path, missingFile);
		assert.instanceOf(error.cause, Error);
	}),
);

it.effect('a valid fixture succeeds', () =>
	Effect.gen(function* () {
		const config = yield* loadConfigEffect.pipe(withEnv({ NIPUU_CONFIG: validConfig }));
		assert.strictEqual(typeof config.MODEL, 'object');
		assert.ok(config.ROUTE['/']);
	}),
);

it.effect('seed defaults to 10', () =>
	Effect.gen(function* () {
		assert.strictEqual(yield* seedCount.pipe(withEnv({})), 10);
	}),
);

it.effect('seed "3" gives 3', () =>
	Effect.gen(function* () {
		assert.strictEqual(yield* seedCount.pipe(withEnv({ NIPUU_SEED: '3' })), 3);
	}),
);

it.effect('seed "-1", "1.5", and "abc" fail with SeedInvalid', () =>
	Effect.gen(function* () {
		for (const value of ['-1', '1.5', 'abc']) {
			const error = yield* Effect.flip(seedCount.pipe(withEnv({ NIPUU_SEED: value })));
			assert.instanceOf(error, SeedInvalid);
			assert.strictEqual(error._tag, 'SeedInvalid');
			assert.strictEqual(error.value, value);
		}
	}),
);
