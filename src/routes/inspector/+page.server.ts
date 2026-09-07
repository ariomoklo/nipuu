import { initRuntime } from '$lib/server/runtime';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const runtime = await initRuntime();
	return { logs: runtime.logs.list() };
};
