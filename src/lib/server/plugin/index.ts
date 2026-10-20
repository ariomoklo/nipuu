import { json, serverError, toPluginContext } from '$lib/server/handlers/respond/respond';
import type { DispatchContext } from '$lib/server/handlers/sources/sources';
import { runAppPromise } from '$lib/server/effect/runtime';
import { callUser, InvalidPlugin } from '$lib/server/user-code';
import type { PluginDefinition } from '$lib/types';
import { Effect } from 'effect';

export const runPluginsEffect = (
	plugins: readonly PluginDefinition[number][] | undefined,
	response: Response,
	context: DispatchContext,
) =>
	Effect.gen(function* () {
		if (!Array.isArray(plugins) || plugins.length === 0) return response;

		let current = response;

		for (const [index, plugin] of plugins.entries()) {
			if (typeof plugin !== 'function') return yield* new InvalidPlugin({ index });

			const mapped = yield* callUser('plugin', index, () =>
				plugin(toPluginContext(context, current)),
			);
			current = mapped instanceof Response ? mapped : json(mapped, current.status);
		}

		return current;
	});

function toPluginResponse(
	plugins: readonly PluginDefinition[number][] | undefined,
	response: Response,
	context: DispatchContext,
) {
	return runPluginsEffect(plugins, response, context).pipe(
		Effect.catchTag('InvalidPlugin', () => Effect.succeed(serverError('Invalid plugin'))),
		Effect.catchTag('UserCodeFailed', () => Effect.succeed(serverError('Plugin failed'))),
	);
}

export function runPluginList(
	plugins: readonly PluginDefinition[number][] | undefined,
	response: Response,
	context: DispatchContext,
): Promise<Response> {
	return runAppPromise(toPluginResponse(plugins, response, context));
}
