import { pathToFileURL } from 'node:url';
import type { ModelDefinition } from '$lib/server/model';
import type { RouteHandler } from '$lib/types';

export type ConfigDefinition = {
	MODEL: ModelDefinition;
	ROUTE: Record<string, Record<string, RouteHandler>>;
};

export async function loadConfig(): Promise<ConfigDefinition> {
	const configPath = process.env.NIPUU_CONFIG;
	if (!configPath) {
		throw new Error('NIPUU_CONFIG is not set. Start Nipuu with: nipuu <config-file>');
	}

	const imported = (await import(/* @vite-ignore */ pathToFileURL(configPath).href)) as Partial<ConfigDefinition>;
	if (!imported.MODEL || !imported.ROUTE) {
		throw new Error(`Config must export MODEL and ROUTE: ${configPath}`);
	}

	return { MODEL: imported.MODEL, ROUTE: imported.ROUTE };
}

export function readSeedCount(): number {
	const parsed = Number(process.env.NIPUU_SEED ?? 10);
	if (!Number.isInteger(parsed) || parsed < 0) {
		throw new Error(`Invalid NIPUU_SEED: ${process.env.NIPUU_SEED}`);
	}
	return parsed;
}
