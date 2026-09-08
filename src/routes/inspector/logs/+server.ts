import { json } from '@sveltejs/kit';
import { listLogs } from '$lib/server/logs';
import { initRuntime } from '$lib/server/runtime';

export async function GET() {
	await initRuntime();
	return json({ logs: listLogs() });
}
