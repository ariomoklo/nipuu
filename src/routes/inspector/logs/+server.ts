import { json } from '@sveltejs/kit';
import { listLogs } from '$lib/server/logs';

export async function GET() {
	return json({ logs: listLogs() });
}
