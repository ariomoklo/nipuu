import { json } from '@sveltejs/kit';
import { initRuntime } from '$lib/server/runtime';

export async function GET() {
	const runtime = await initRuntime();
	return json({ logs: runtime.logs.list() });
}
