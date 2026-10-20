import { assert, it } from '@effect/vitest';
import { Data, Effect, Exit, Option } from 'effect';

class NotFound extends Data.TaggedError('NotFound')<{ readonly id: string }> {}

class FetchFailed extends Data.TaggedError('FetchFailed')<{ readonly message: string }> {}

it.effect('a succeeding effect exits with Success and its value', () =>
	Effect.gen(function* () {
		const exit = yield* Effect.exit(Effect.succeed(42));
		assert.isTrue(Exit.isSuccess(exit));
		assert.deepStrictEqual(Exit.getSuccess(exit), Option.some(42));
	}),
);

it.effect('a failing effect exits with Failure and its tagged error', () =>
	Effect.gen(function* () {
		const exit = yield* Effect.exit(Effect.fail(new NotFound({ id: 'user-1' })));
		assert.isTrue(Exit.isFailure(exit));
		const error = Option.getOrThrow(Exit.findErrorOption(exit));
		assert.instanceOf(error, NotFound);
		assert.strictEqual(error.id, 'user-1');
	}),
);

it.effect('Effect.gen combines three effects', () =>
	Effect.gen(function* () {
		const a = yield* Effect.succeed(1);
		const b = yield* Effect.sync(() => 2);
		const c = yield* Effect.succeed(3);
		assert.strictEqual(a + b + c, 6);
	}),
);

it.effect('Effect.succeed evaluates its argument eagerly; Effect.sync waits until run', () =>
	Effect.gen(function* () {
		let calls = 0;
		const increment = () => ++calls;

		const eager = Effect.succeed(increment());
		assert.strictEqual(calls, 1);

		const lazy = Effect.sync(increment);
		assert.strictEqual(calls, 1);

		yield* lazy;
		assert.strictEqual(calls, 2);

		yield* lazy;
		assert.strictEqual(calls, 3);

		const eagerValue = yield* eager;
		assert.strictEqual(eagerValue, 1);
		assert.strictEqual(calls, 3);
	}),
);

it.effect('Effect.tryPromise turns a rejection into a typed failure', () =>
	Effect.gen(function* () {
		const error = yield* Effect.flip(
			Effect.tryPromise({
				try: () => Promise.reject(new Error('network down')),
				catch: (cause) =>
					new FetchFailed({
						message: cause instanceof Error ? cause.message : 'unknown',
					}),
			}),
		);
		assert.instanceOf(error, FetchFailed);
		assert.strictEqual(error.message, 'network down');
	}),
);
