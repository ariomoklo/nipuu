import type { Handle } from '@sveltejs/kit';
import { isControlPlane } from '$lib/server/http/control';
import { handleRequest } from '$lib/server/runtime/handle';
import { initRuntime } from '$lib/server/runtime';

export const handleDataPlane: Handle = async ({ event, resolve }) => {
	if (isControlPlane(event.url.pathname)) {
		return resolve(event);
	}

	await initRuntime();
	return handleRequest(event);
};
