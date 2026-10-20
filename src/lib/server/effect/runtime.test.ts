import { getAppRuntime, runAppPromise, runAppSync } from '$lib/server/effect/runtime';
import { assert, it } from '@effect/vitest';
import { Effect } from 'effect';

it('runs two effects through the same runtime instance', async () => {
	const runtime = getAppRuntime();
	assert.strictEqual(runAppSync(Effect.succeed(1)), 1);
	assert.strictEqual(await runAppPromise(Effect.succeed(2)), 2);
	assert.strictEqual(getAppRuntime(), runtime);
});
