import { Data, Effect } from 'effect';

export class UserCodeFailed extends Data.TaggedError('UserCodeFailed')<{
	readonly hook: 'plugin' | 'preset';
	readonly index: number;
	readonly cause: unknown;
}> {}

export class InvalidPlugin extends Data.TaggedError('InvalidPlugin')<{
	readonly index: number;
}> {}

export function callUser<A>(
	hook: 'plugin' | 'preset',
	index: number,
	run: () => A | Promise<A>,
): Effect.Effect<A, UserCodeFailed> {
	return Effect.tryPromise({
		try: () => Promise.resolve().then(run),
		catch: (cause) => new UserCodeFailed({ hook, index, cause }),
	}).pipe(Effect.tapError((error) => Effect.logError(`${error.hook} failed`, error.cause)));
}
