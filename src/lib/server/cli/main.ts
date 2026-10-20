import type { Server } from 'node:http';
import type { ViteDevServer } from 'vite';
import { NodeRuntime, NodeServices } from '@effect/platform-node';
import { Host, nipuuCommand, ProcessCwd } from '$lib/server/cli/command';
import { liveHost } from '$lib/server/cli/host';
import { Effect } from 'effect';
import { Command } from 'effect/cli';

export function main(options: {
	readonly argv: readonly string[];
	readonly cwd: string;
	readonly vite: ViteDevServer;
	readonly server: Server;
}): void {
	const program = Effect.scoped(
		Effect.gen(function* () {
			yield* Effect.addFinalizer(() => Effect.promise(() => options.vite.close()));
			yield* Command.runWith(nipuuCommand, { version: '0.0.2' })([...options.argv]);
		}),
	).pipe(
		Effect.provideService(ProcessCwd, { cwd: options.cwd }),
		Effect.provideService(Host, liveHost(options)),
		Effect.provide(NodeServices.layer),
	);

	NodeRuntime.runMain(program, { disableErrorReporting: true });
}
