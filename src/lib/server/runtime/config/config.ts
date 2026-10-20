import { pathToFileURL } from 'node:url';
import type { ModelDefinition } from '$lib/server/model';
import {
	CONFIG_PATH_MESSAGE,
	ConfigImportFailed,
	ConfigPathMissing,
	ConfigShapeInvalid,
	SeedInvalid,
} from '$lib/server/runtime/config/errors';
import type { PluginDefinition, PresetDefinition, RouteHandler } from '$lib/types';
import { Config, Effect, Option } from 'effect';

export type ConfigDefinition = {
	MODEL: ModelDefinition;
	ROUTE: Record<string, Record<string, RouteHandler>>;
	PRESET?: PresetDefinition;
	PLUGIN?: PluginDefinition;
};

type ImportedConfig = Partial<ConfigDefinition>;

const configPathValue = Config.String('NIPUU_CONFIG').pipe(
	Config.option,
	Effect.mapError(() => new ConfigPathMissing({ message: CONFIG_PATH_MESSAGE })),
);

export const configPath: Config.Config<string> = Config.String('NIPUU_CONFIG');

const seedRaw = Config.String('NIPUU_SEED').pipe(
	Config.withDefault('10'),
	Effect.mapError(() => new SeedInvalid({ value: '' })),
);

/** Non-negative integer. Missing `NIPUU_SEED` is 10. Negatives, fractions, and junk fail as `SeedInvalid`. */
export const seedCount: Effect.Effect<number, SeedInvalid> = Effect.gen(function* () {
	const raw = yield* seedRaw;
	const parsed = Number(raw);
	if (!Number.isInteger(parsed) || parsed < 0) {
		return yield* new SeedInvalid({ value: raw });
	}

	return parsed;
});

/** TCP port for the CLI. `Config.Port` is 1 through 65535. */
export const listenPort: Config.Config<number> = Config.Port('NIPUU_PORT').pipe(
	Config.withDefault(4210),
);

function readShape(path: string, imported: ImportedConfig) {
	if (!imported.MODEL) {
		return Effect.fail(new ConfigShapeInvalid({ path, missing: 'MODEL' }));
	}

	if (!imported.ROUTE) {
		return Effect.fail(new ConfigShapeInvalid({ path, missing: 'ROUTE' }));
	}

	const config: ConfigDefinition = {
		MODEL: imported.MODEL,
		ROUTE: imported.ROUTE,
		PRESET: imported.PRESET,
		PLUGIN: imported.PLUGIN,
	};

	return Effect.succeed(config);
}

export const loadConfigEffect: Effect.Effect<
	ConfigDefinition,
	ConfigPathMissing | ConfigImportFailed | ConfigShapeInvalid
> = Effect.gen(function* () {
	const path = yield* configPathValue;
	if (Option.isNone(path)) {
		return yield* new ConfigPathMissing({ message: CONFIG_PATH_MESSAGE });
	}

	const href = pathToFileURL(path.value).href;
	const imported = yield* Effect.tryPromise({
		try: () => import(/* @vite-ignore */ href) as Promise<ImportedConfig>,
		catch: (cause) => new ConfigImportFailed({ path: path.value, cause }),
	});

	return yield* readShape(path.value, imported);
});
