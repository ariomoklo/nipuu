import path from 'node:path';
import { makeAppLayer } from '$lib/server/app/layer';
import { setAppRuntime } from '$lib/server/effect/runtime';
import { unholdTables } from '$lib/server/table/store/holder';
import { TableStore } from '$lib/server/table/store/service';
import { dataPlane } from '$lib/server/http/app';
import { assert, it } from '@effect/vitest';
import { ConfigProvider, Effect, Layer, ManagedRuntime } from 'effect';
import { HttpEffect } from 'effect/http';

const configPath = path.join(process.cwd(), 'src/tests/config.mjs');

it('the effect app serves CRUD, 404, preflight, and CORS', async () => {
	const runtime = ManagedRuntime.make(
		makeAppLayer({ hold: true }).pipe(
			Layer.provide(
				ConfigProvider.layer(
					ConfigProvider.fromUnknown({
						NIPUU_CONFIG: configPath,
						NIPUU_SEED: '2',
					}),
				),
			),
		),
	);
	setAppRuntime(runtime);
	await runtime.runPromise(
		Effect.gen(function* () {
			yield* TableStore;
		}),
	);

	try {
		const handler = HttpEffect.toWebHandler(dataPlane);
		const root = await handler(new Request('http://nipuu.test/'));
		assert.strictEqual(root.status, 200);
		assert.strictEqual(await root.text(), 'Hello!');
		assert.strictEqual(root.headers.get('access-control-allow-origin'), '*');
		assert.strictEqual(
			root.headers.get('access-control-allow-methods'),
			'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD',
		);
		assert.strictEqual(
			root.headers.get('access-control-allow-headers'),
			'Content-Type, Authorization',
		);
		assert.strictEqual(root.headers.get('access-control-max-age'), '86400');

		const users = await handler(new Request('http://nipuu.test/users'));
		assert.strictEqual(users.status, 200);
		const rows = (await users.json()) as unknown[];
		assert.strictEqual(rows.length, 2);

		const missing = await handler(new Request('http://nipuu.test/nope'));
		assert.strictEqual(missing.status, 404);

		const preflight = await handler(
			new Request('http://nipuu.test/users', {
				method: 'OPTIONS',
				headers: { origin: 'http://x', 'access-control-request-method': 'POST' },
			}),
		);
		assert.strictEqual(preflight.status, 204);
		assert.strictEqual(preflight.headers.get('access-control-allow-origin'), '*');
	} finally {
		unholdTables();
		await runtime.dispose();
	}
});
