import type { Handle } from '@sveltejs/kit';

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
