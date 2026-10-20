import { listLogs } from '$lib/server/logs';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return { logs: listLogs() };
};
