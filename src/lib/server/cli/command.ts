import path from 'node:path';
import { existsSync } from 'node:fs';
import { Context, Console, Effect, Scope } from 'effect';
import { Argument, Command, Flag } from 'effect/cli';

export const USAGE = 'Usage: nipuu <config-file> [--port 4210] [--seed 10]';

const config = Argument.String('config');

const port = Flag.Int('port').pipe(
	Flag.withDefault(4210),
	Flag.filter(
		(value) => value > 0,
		(value) => `Port must be positive, got ${value}`,
	),
);

const seed = Flag.Int('seed').pipe(
	Flag.withDefault(10),
	Flag.filter(
		(value) => value >= 0,
		(value) => `Seed must be a non-negative integer, got ${value}`,
	),
);

export type CliInput = {
	readonly config: string;
	readonly port: number;
	readonly seed: number;
};

export class ProcessCwd extends Context.Service<ProcessCwd, { readonly cwd: string }>()(
	'nipuu/ProcessCwd',
) {}

export class Host extends Context.Service<
	Host,
	{
		readonly start: (
			input: CliInput & { readonly configPath: string },
		) => Effect.Effect<void, string, Scope.Scope>;
	}
>()('nipuu/Host') {}

export const nipuuCommand = Command.make('nipuu', { config, port, seed }, (input) =>
	Effect.gen(function* () {
		const { cwd } = yield* ProcessCwd;
		const configPath = path.resolve(cwd, input.config);
		if (!existsSync(configPath)) {
			yield* Console.error(`Config file not found: ${configPath}`);
			yield* Console.error(USAGE);
			return yield* Effect.fail('missing');
		}

		const host = yield* Host;
		yield* host.start({ config: input.config, port: input.port, seed: input.seed, configPath });
	}),
);
