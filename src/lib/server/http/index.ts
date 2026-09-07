import type { Handle } from '@sveltejs/kit';
import { INSPECTOR_URL } from '$lib/inspector';
import { initRuntime } from '$lib/server/runtime';

const CONTROL_PLANE_PREFIXES = ['/_app', '/node_modules', '/src', '/.svelte-kit', '/__vite'];

export function isControlPlane(pathname: string): boolean {
	if (pathname === INSPECTOR_URL || pathname.startsWith(`${INSPECTOR_URL}/`)) return true;
	if (pathname.startsWith('/@')) return true;
	return CONTROL_PLANE_PREFIXES.some(
		(prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
	);
}

function corsHeaders(): Record<string, string> {
	return {
		'Access-Control-Allow-Origin': '*',
		'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD',
		'Access-Control-Allow-Headers': 'Content-Type, Authorization',
		'Access-Control-Max-Age': '86400'
	};
}

function applyCors(response: Response): Response {
	const headers = new Headers(response.headers);
	for (const [key, value] of Object.entries(corsHeaders())) {
		headers.set(key, value);
	}
	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers
	});
}

export const handleCors: Handle = async ({ event, resolve }) => {
	if (event.request.method === 'OPTIONS') {
		return new Response(null, { status: 204, headers: corsHeaders() });
	}

	const response = await resolve(event);
	return applyCors(response);
};

export const handleControlPlane: Handle = async ({ event, resolve }) => {
	if (isControlPlane(event.url.pathname)) {
		return resolve(event);
	}
	return resolve(event);
};

export const handleDataPlane: Handle = async ({ event, resolve }) => {
	if (isControlPlane(event.url.pathname)) {
		return resolve(event);
	}

	const runtime = await initRuntime();
	return runtime.handle(event);
};
