import { error } from '@sveltejs/kit';
import { getLog } from '$lib/server/logs';
import { initRuntime } from '$lib/server/runtime';
import { highlightJson } from '$lib/ui/shared/shiki/highlight';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	await initRuntime();
	const log = getLog(params.id);
	if (!log) error(404, `Unknown request: ${params.id}`);

	const [requestHeaders, requestBody, responseHeaders, responseBody] = await Promise.all([
		highlightJson(log.requestHeaders),
		highlightJson(log.requestBody),
		highlightJson(log.responseHeaders),
		highlightJson(log.responseBody),
	]);

	return {
		log,
		json: {
			requestHeaders,
			requestBody,
			responseHeaders,
			responseBody,
		},
	};
};
