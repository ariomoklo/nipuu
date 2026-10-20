import { runPluginsEffect } from '$lib/server/plugin';
import type { DispatchContext } from '$lib/server/handlers/sources/sources';
import { assert, it } from '@effect/vitest';
import { Cause, Effect, Exit } from 'effect';

const context: DispatchContext = {
	method: 'GET',
	path: '/todos/99',
	params: { id: '99' },
	queries: {},
	body: null,
};

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'content-type': 'application/json' },
	});
}

it.effect('three plugins run in index order and each sees the previous response', () =>
	Effect.gen(function* () {
		const seen: string[] = [];
		const plugins = [
			async ({ response }: { response: Response }) => {
				seen.push(await response.clone().text());
				return { step: 'a' };
			},
			async ({ response }: { response: Response }) => {
				seen.push(await response.clone().text());
				return { step: 'b' };
			},
			async ({ response }: { response: Response }) => {
				seen.push(await response.clone().text());
				return { step: 'c' };
			},
		];

		const response = yield* runPluginsEffect(plugins, jsonResponse({ step: 'route' }), context);
		assert.deepStrictEqual(seen, ['{"step":"route"}', '{"step":"a"}', '{"step":"b"}']);
		assert.deepStrictEqual(yield* Effect.promise(() => response.json()), { step: 'c' });
	}),
);

it.effect('a plain return becomes JSON at the incoming status and undefined empties the body', () =>
	Effect.gen(function* () {
		const json = yield* runPluginsEffect(
			[() => ({ wrapped: true })],
			jsonResponse({ id: 1 }, 404),
			context,
		);
		assert.strictEqual(json.status, 404);
		assert.deepStrictEqual(yield* Effect.promise(() => json.json()), { wrapped: true });

		const empty = yield* runPluginsEffect([() => undefined], jsonResponse({ id: 1 }, 201), context);
		assert.strictEqual(empty.status, 201);
		assert.strictEqual(yield* Effect.promise(() => empty.text()), '');
	}),
);

it.effect('a non-function entry fails with InvalidPlugin at that index', () =>
	Effect.gen(function* () {
		const error = yield* Effect.flip(
			runPluginsEffect(
				[() => ({ ok: true }), { not: 'a function' } as never],
				jsonResponse({ id: 1 }),
				context,
			),
		);
		assert.strictEqual(error._tag, 'InvalidPlugin');
		assert.strictEqual(error.index, 1);
	}),
);

it.effect('a sync throw and an async rejection are UserCodeFailed, not defects', () =>
	Effect.gen(function* () {
		const syncThrow = () => {
			throw new Error('boom');
		};
		const asyncReject = async () => {
			throw new Error('later');
		};

		for (const plugin of [syncThrow, asyncReject]) {
			const exit = yield* Effect.exit(runPluginsEffect([plugin], jsonResponse({ id: 1 }), context));
			assert.isTrue(Exit.isFailure(exit) && Cause.hasFails(exit.cause));
			assert.isFalse(Exit.isFailure(exit) && Cause.hasDies(exit.cause));
			if (Exit.isFailure(exit)) {
				const error = Cause.squash(exit.cause) as { _tag?: string; hook?: string };
				assert.strictEqual(error._tag, 'UserCodeFailed');
				assert.strictEqual(error.hook, 'plugin');
			}
		}
	}),
);
