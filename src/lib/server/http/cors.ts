export const CORS_HEADERS: Record<string, string> = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD',
	'Access-Control-Allow-Headers': 'Content-Type, Authorization',
	'Access-Control-Max-Age': '86400',
};

export function setCorsHeaders(headers: { setHeader(name: string, value: string): void }): void {
	for (const [name, value] of Object.entries(CORS_HEADERS)) {
		headers.setHeader(name, value);
	}
}
