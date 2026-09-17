import { json, serverError, toPluginContext } from '$lib/server/handlers/respond/respond';
import type { DispatchContext } from '$lib/server/handlers/sources/sources';
import { getConfig } from '$lib/server/runtime';

export async function runPlugins(response: Response, context: DispatchContext): Promise<Response> {
	const plugins = getConfig().PLUGIN;
	if (!Array.isArray(plugins) || plugins.length === 0) return response;

	let current = response;
	for (const plugin of plugins) {
		if (typeof plugin !== 'function') return serverError('Invalid plugin');
		const mapped = await plugin(toPluginContext(context, current));
		current = mapped instanceof Response ? mapped : json(mapped, current.status);
	}

	return current;
}
