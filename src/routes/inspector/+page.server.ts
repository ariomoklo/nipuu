import { listLogs } from '$lib/server/logs';
import { initRuntime } from '$lib/server/runtime';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	await initRuntime();
	return { logs: listLogs() };
};
