import type { Server } from 'node:http';
import type { ViteDevServer } from 'vite';
import { AppLayer } from '$lib/server/app/layer';
import { NipuuConfig } from '$lib/server/app/services';
import type { CliInput } from '$lib/server/cli/command';
import { setAppRuntime } from '$lib/server/effect/runtime';
import { isControlPlane } from '$lib/server/http/control';
import { setCorsHeaders } from '$lib/server/http/cors';
import { dataPlane } from '$lib/server/http/app';
import {
	ConfigImportFailed,
	ConfigPathMissing,
	ConfigShapeInvalid,
	SeedInvalid,
	seedMessage,
	shapeMessage,
} from '$lib/server/runtime/config/errors';
import { TableStore } from '$lib/server/table/store/service';
import { NodeHttpServer } from '@effect/platform-node';
import { Cause, ConfigProvider, Console, Data, Effect, Exit, Layer, ManagedRuntime } from 'effect';

class PortInUse extends Data.TaggedError('PortInUse')<{ readonly port: number }> {}

function pathnameOf(url: string | undefined): string {
	const raw = url ?? '/';
	const query = raw.indexOf('?');
	return query === -1 ? raw : raw.slice(0, query);
}

function bootMessage(error: unknown): string {
	if (error instanceof ConfigImportFailed) {
		if (error.cause instanceof Error) return error.cause.stack ?? error.cause.message;
		return String(error.cause);
	}

	if (error instanceof ConfigShapeInvalid) return shapeMessage(error.path);
	if (error instanceof ConfigPathMissing) return error.message;
	if (error instanceof SeedInvalid) return seedMessage(error.value);
	if (error instanceof Error) return error.stack ?? error.message;
	return String(error);
}

const listen = (server: Server, port: number) =>
	Effect.callback<void, PortInUse | Error>((resume) => {
		const onError = (error: NodeJS.ErrnoException) => {
			server.off('error', onError);
			server.off('listening', onListening);
			if (error.code === 'EADDRINUSE') {
				resume(Effect.fail(new PortInUse({ port })));
				return;
			}

			resume(Effect.fail(error));
		};

		const onListening = () => {
			server.off('error', onError);
			server.off('listening', onListening);
			resume(Effect.void);
		};

		server.on('error', onError);
		server.on('listening', onListening);
		server.listen(port);
	});

const closeServer = (server: Server) =>
	Effect.callback<void>((resume) => {
		if (!server.listening) {
			resume(Effect.void);
			return;
		}

		server.close(() => resume(Effect.void));
	});

export function liveHost(options: { readonly vite: ViteDevServer; readonly server: Server }) {
	return {
		start: (input: CliInput & { readonly configPath: string }) =>
			Effect.gen(function* () {
				const provider = ConfigProvider.fromUnknown({
					NIPUU_CONFIG: input.configPath,
					NIPUU_PORT: String(input.port),
					NIPUU_SEED: String(input.seed),
				});
				const runtime = yield* Effect.acquireRelease(
					Effect.sync(() =>
						ManagedRuntime.make(AppLayer.pipe(Layer.provide(ConfigProvider.layer(provider)))),
					),
					(managed) => managed.disposeEffect,
				);
				const booted = yield* Effect.exit(
					Effect.promise(() =>
						runtime.runPromise(
							Effect.gen(function* () {
								yield* NipuuConfig;
								yield* TableStore;
							}),
						),
					),
				);

				if (Exit.isFailure(booted)) {
					yield* Console.error(bootMessage(Cause.squash(booted.cause)));
					return yield* Effect.fail('config');
				}

				setAppRuntime(runtime);

				const scope = yield* Effect.scope;
				const effectHandler = yield* NodeHttpServer.makeHandler(dataPlane, { scope });
				options.server.on('request', (request, response) => {
					if (request.method === 'OPTIONS') {
						setCorsHeaders(response);
						response.statusCode = 204;
						response.end();
						return;
					}

					setCorsHeaders(response);
					if (isControlPlane(pathnameOf(request.url))) {
						options.vite.middlewares(request, response, () => {
							if (!response.writableEnded) {
								response.statusCode = 404;
								response.end();
							}
						});
						return;
					}

					effectHandler(request, response);
				});

				const listened = yield* Effect.exit(listen(options.server, input.port));
				if (Exit.isFailure(listened)) {
					const error = Cause.squash(listened.cause);
					const message =
						error instanceof PortInUse
							? `Port ${error.port} is already in use`
							: error instanceof Error
								? error.message
								: 'Failed to listen';
					yield* Console.error(message);
					return yield* Effect.fail('listen');
				}

				yield* Effect.addFinalizer(() => closeServer(options.server));
				yield* Console.log(`\nnipuu · config{ ${input.configPath} } · seed{ ${input.seed} }`);
				yield* Console.log('nipuu available at:\n');
				yield* Console.log(`  http://localhost:${input.port}/`);
				yield* Effect.never;
			}),
	};
}
