import { validationError } from '$lib/server/handlers';
import { validate, type Store, type Schema } from '$lib/server/model';
import type { RouteHandler } from '$lib/types';

export function validateMutating(
	tables: Schema[],
	store: Store,
	method: string,
	handler: RouteHandler,
	body: unknown
): Response | null {
	if (method !== 'POST' && method !== 'PUT') return null;
	if (typeof handler !== 'object' || handler === null) return null;
	if (typeof handler.model !== 'string') return null;

	const payload = method === 'PUT' && body == null ? {} : body;
	const result = validate(tables, store, handler.model, payload, { partial: method === 'PUT' });
	if (!result.ok) return validationError(result.errors);
	return null;
}

export async function readBody(request: Request): Promise<unknown> {
	const raw = await request.text();
	if (!raw) return null;
	try {
		return JSON.parse(raw);
	} catch {
		return raw;
	}
}

export async function peekBody(response: Response): Promise<unknown> {
	const clone = response.clone();
	const raw = await clone.text();
	if (!raw) return null;
	const contentType = response.headers.get('content-type') ?? '';
	if (contentType.includes('application/json')) {
		try {
			return JSON.parse(raw);
		} catch {
			return raw;
		}
	}
	return raw;
}
