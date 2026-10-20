import { Effect, Layer, ManagedRuntime } from 'effect';

const RUNTIME_KEY = Symbol.for('nipuu.effect.runtime');

const AppLayer = Layer.empty;

type AppRuntime = ManagedRuntime.ManagedRuntime<
	Layer.Success<typeof AppLayer>,
	Layer.Error<typeof AppLayer>
>;

type GlobalEffectRuntime = typeof globalThis & {
	[RUNTIME_KEY]?: AppRuntime;
};

function appRuntime(): AppRuntime {
	const global = globalThis as GlobalEffectRuntime;
	if (!global[RUNTIME_KEY]) {
		global[RUNTIME_KEY] = ManagedRuntime.make(AppLayer);
	}

	return global[RUNTIME_KEY];
}

export { AppLayer };

export function getAppRuntime(): AppRuntime {
	return appRuntime();
}

export function runAppSync<A, E>(effect: Effect.Effect<A, E, Layer.Success<typeof AppLayer>>): A {
	return appRuntime().runSync(effect);
}

export function runAppPromise<A, E>(
	effect: Effect.Effect<A, E, Layer.Success<typeof AppLayer>>,
): Promise<A> {
	return appRuntime().runPromise(effect);
}
