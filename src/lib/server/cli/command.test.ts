import path from 'node:path';
import { Host, nipuuCommand, ProcessCwd, USAGE } from '$lib/server/cli/command';
import { assert, it } from '@effect/vitest';
import { NodeServices } from '@effect/platform-node';
import { Effect, Exit, Layer } from 'effect';
import { Command } from 'effect/cli';
import { TestConsole } from 'effect/testing';

const configPath = path.join(process.cwd(), 'src/tests/config.mjs');

function run(argv: string[], cwd = process.cwd()) {
	const seen: Array<{ port: number; seed: number; configPath: string }> = [];
	const host = Layer.succeed(Host, {
		start: (input) =>
			Effect.sync(() => {
				seen.push({ port: input.port, seed: input.seed, configPath: input.configPath });
			}),
	});

	const program = Effect.scoped(
		Command.runWith(nipuuCommand, { version: '0.0.2' })(argv).pipe(
			Effect.provide(host),
			Effect.provideService(ProcessCwd, { cwd }),
			Effect.provide(NodeServices.layer),
		),
	);

	return { program, seen };
}

it.effect('parses the config path, port, and seed', () =>
	Effect.gen(function* () {
		const { program, seen } = run(['--port', '4300', '--seed', '3', configPath]);
		yield* program;
		assert.strictEqual(seen.length, 1);
		assert.strictEqual(seen[0]?.port, 4300);
		assert.strictEqual(seen[0]?.seed, 3);
		assert.strictEqual(seen[0]?.configPath, configPath);
	}).pipe(Effect.provide(TestConsole.layer)),
);

it.effect('uses the default port and seed', () =>
	Effect.gen(function* () {
		const { program, seen } = run([configPath]);
		yield* program;
		assert.strictEqual(seen[0]?.port, 4210);
		assert.strictEqual(seen[0]?.seed, 10);
	}).pipe(Effect.provide(TestConsole.layer)),
);

it.effect('a missing config prints the path and usage, then fails', () =>
	Effect.gen(function* () {
		const missing = path.join(process.cwd(), 'missing-config.mjs');
		const { program } = run([missing]);
		const exit = yield* Effect.exit(program);
		assert.isTrue(Exit.isFailure(exit));
		const lines = (yield* TestConsole.errorLines).map(String);
		assert.deepStrictEqual(lines, [`Config file not found: ${missing}`, USAGE]);
	}).pipe(Effect.provide(TestConsole.layer)),
);

it.effect('a non-positive port fails before the host starts', () =>
	Effect.gen(function* () {
		const { program, seen } = run(['--port', '0', configPath]);
		const exit = yield* Effect.exit(program);
		assert.isTrue(Exit.isFailure(exit));
		assert.strictEqual(seen.length, 0);
	}).pipe(Effect.provide(TestConsole.layer)),
);

it.effect('a negative seed fails before the host starts', () =>
	Effect.gen(function* () {
		const { program, seen } = run(['--seed', '-1', configPath]);
		const exit = yield* Effect.exit(program);
		assert.isTrue(Exit.isFailure(exit));
		assert.strictEqual(seen.length, 0);
	}).pipe(Effect.provide(TestConsole.layer)),
);

it.effect('--help and -h succeed', () =>
	Effect.gen(function* () {
		const help = yield* Effect.exit(run(['--help']).program);
		const short = yield* Effect.exit(run(['-h']).program);
		assert.isTrue(Exit.isSuccess(help));
		assert.isTrue(Exit.isSuccess(short));
	}).pipe(Effect.provide(TestConsole.layer)),
);
