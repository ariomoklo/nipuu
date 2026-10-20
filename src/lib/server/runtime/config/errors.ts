import { Data } from 'effect';

export class ConfigPathMissing extends Data.TaggedError('ConfigPathMissing')<{
	readonly message: string;
}> {}

export class ConfigImportFailed extends Data.TaggedError('ConfigImportFailed')<{
	readonly path: string;
	readonly cause: unknown;
}> {}

export class ConfigShapeInvalid extends Data.TaggedError('ConfigShapeInvalid')<{
	readonly path: string;
	readonly missing: 'MODEL' | 'ROUTE';
}> {}

/** `Config.Int` accepts negatives and reports `ConfigError` for junk text. Seed checks stay in our error channel. */
export class SeedInvalid extends Data.TaggedError('SeedInvalid')<{
	readonly value: string;
}> {}

export const CONFIG_PATH_MESSAGE = 'config is not set. Start mock server with: nipuu <config-file>';

export function shapeMessage(path: string): string {
	return `Config must export MODEL and ROUTE: ${path}`;
}

export function seedMessage(value: string): string {
	return `Invalid seed count: ${value}`;
}
