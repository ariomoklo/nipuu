import { runAppPromise } from '$lib/server/effect/runtime';
import type { RouteHandler } from '$lib/types';
import { Duration, Effect } from 'effect';

function delayDuration(handler: RouteHandler): Duration.Duration {
	if (typeof handler !== 'object' || handler === null) return Duration.zero;

	const value = handler.delay;
	// Infinity is a valid Duration. The contract treats it as no wait.
	if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return Duration.zero;

	return Duration.millis(value);
}

export function delayFor(handler: RouteHandler): Effect.Effect<void> {
	return Effect.sleep(delayDuration(handler));
}

export function waitDelay(handler: RouteHandler): Promise<void> {
	return runAppPromise(delayFor(handler));
}
