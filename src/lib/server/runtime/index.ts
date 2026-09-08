import { loadConfig, readSeedCount, type ConfigDefinition } from '$lib/server/runtime/config';
import { generateSchemas, type Schema } from '$lib/server/model';
import { createTables } from '$lib/server/table';

const RUNTIME_KEY = Symbol.for('nipuu.runtime');
const RUNTIME_PROMISE_KEY = Symbol.for('nipuu.runtime.promise');

type RuntimeContext = {
	config: ConfigDefinition;
	schemas: Schema[];
};

type GlobalRuntime = typeof globalThis & {
	[RUNTIME_KEY]?: RuntimeContext;
	[RUNTIME_PROMISE_KEY]?: Promise<RuntimeContext>;
};

async function createRuntime(): Promise<RuntimeContext> {
	const config = await loadConfig();
	const schemas = generateSchemas(config.MODEL);
	createTables(schemas, readSeedCount());
	return { config, schemas };
}

function requireRuntime(): RuntimeContext {
	const runtime = (globalThis as GlobalRuntime)[RUNTIME_KEY];
	if (!runtime) {
		throw new Error('Runtime is not initialized');
	}

	return runtime;
}

export async function initRuntime(): Promise<void> {
	const global = globalThis as GlobalRuntime;
	if (global[RUNTIME_KEY]) return;
	if (!global[RUNTIME_PROMISE_KEY]) {
		global[RUNTIME_PROMISE_KEY] = createRuntime().then((runtime) => {
			global[RUNTIME_KEY] = runtime;
			return runtime;
		});
	}

	await global[RUNTIME_PROMISE_KEY];
}

export function getConfig(): ConfigDefinition {
	return requireRuntime().config;
}

export function getSchemas(): Schema[] {
	return requireRuntime().schemas;
}
