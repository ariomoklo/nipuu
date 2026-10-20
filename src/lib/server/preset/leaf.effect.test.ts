import { applyPresetLeafEffect } from '$lib/server/preset';
import type { DispatchContext } from '$lib/server/handlers/sources/sources';
import { assert, it } from '@effect/vitest';
import { Cause, Effect, Exit } from 'effect';

const context: DispatchContext = {
	method: 'GET',
	path: '/todos/99',
	params: {},
	queries: {},
	body: null,
};

it.effect('a throwing preset leaf fails with UserCodeFailed for the preset hook', () =>
	Effect.gen(function* () {
		const exit = yield* Effect.exit(
			applyPresetLeafEffect(
				() => {
					throw new Error('preset boom');
				},
				{ error: 'Not Found' },
				context,
				404,
			),
		);

		assert.isTrue(Exit.isFailure(exit) && Cause.hasFails(exit.cause));
		assert.isFalse(Exit.isFailure(exit) && Cause.hasDies(exit.cause));
		if (Exit.isFailure(exit)) {
			const error = Cause.squash(exit.cause) as { hook?: string };
			assert.strictEqual(error.hook, 'preset');
		}
	}),
);
