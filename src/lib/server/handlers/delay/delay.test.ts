import { delayFor } from '$lib/server/handlers/delay/delay';
import type { RouteHandler } from '$lib/types';
import { assert, it } from '@effect/vitest';
import { Duration, Effect, Fiber, Ref } from 'effect';
import { TestClock } from 'effect/testing';

function staticHandler(delay?: unknown): RouteHandler {
	return { action: 'static', response: 'ok', delay } as RouteHandler;
}

it.effect('a 500 ms delay is unfinished at 499 ms and finished at 500 ms', () =>
	Effect.gen(function* () {
		const done = yield* Ref.make(false);
		const fiber = yield* delayFor(staticHandler(500)).pipe(
			Effect.andThen(Ref.set(done, true)),
			Effect.forkChild,
		);

		yield* TestClock.adjust(Duration.millis(499));
		assert.isFalse(yield* Ref.get(done));

		yield* TestClock.adjust(Duration.millis(1));
		yield* Fiber.join(fiber);
		assert.isTrue(yield* Ref.get(done));
	}),
);

it.effect('invalid delays finish without advancing the clock', () =>
	Effect.gen(function* () {
		yield* delayFor('Hello!');
		yield* delayFor('ok');
		yield* delayFor(1);
		yield* delayFor(42);
		yield* delayFor(staticHandler());
		yield* delayFor(staticHandler(0));
		yield* delayFor(staticHandler(-10));
		yield* delayFor(staticHandler(Number.NaN));
		yield* delayFor(staticHandler(Number.POSITIVE_INFINITY));
		yield* delayFor(staticHandler('250'));
	}),
);
