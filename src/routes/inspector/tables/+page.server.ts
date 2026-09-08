import { initRuntime } from '$lib/server/runtime';
import { listTables } from '$lib/server/table';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	await initRuntime();
	return { tables: listTables() };
};
