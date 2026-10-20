import { LogStoreLayer } from '$lib/server/logs/service';
import { registerTableBoot } from '$lib/server/table/store/holder';
import { TableStore, TableStoreLayer } from '$lib/server/table/store/service';
import { Effect, Layer, ManagedRuntime } from 'effect';

const CoreLayer = Layer.mergeAll(LogStoreLayer, TableStoreLayer);

type AnyRuntime = ManagedRuntime.ManagedRuntime<any, any>;

const HOT_KEY = 'nipuuRuntime';

function hotSlot(): Record<string, unknown> | undefined {
	const meta = import.meta as ImportMeta & { hot?: { data: Record<string, unknown> } };
	return meta.hot?.data;
}

let current = hotSlot()?.[HOT_KEY] as AnyRuntime | undefined;

function appRuntime(): AnyRuntime {
	if (!current) {
		current = ManagedRuntime.make(CoreLayer);
		const slot = hotSlot();
		if (slot) slot[HOT_KEY] = current;
	}

	return current;
}

export function setAppRuntime(runtime: AnyRuntime): void {
	current = runtime;
	const slot = hotSlot();
	if (slot) slot[HOT_KEY] = runtime;
}

export function getAppRuntime(): AnyRuntime {
	return appRuntime();
}

export function runAppSync<A, E>(effect: Effect.Effect<A, E, any>): A {
	return appRuntime().runSync(effect);
}

export function runAppPromise<A, E>(effect: Effect.Effect<A, E, any>): Promise<A> {
	return appRuntime().runPromise(effect);
}

registerTableBoot(() => {
	runAppSync(
		Effect.gen(function* () {
			yield* TableStore;
		}),
	);
});
