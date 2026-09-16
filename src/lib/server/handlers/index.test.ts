import { describe, expect, it } from 'vitest';
import { dispatch } from '$lib/server/handlers';

describe('dispatch', () => {
	it('returns 400 for an unknown action', async () => {
		const res = dispatch(
			{ action: 'nope', model: 'todos' },
			{ params: {}, queries: {}, body: null },
		);
		expect(res.status).toBe(400);
		expect(await res.json()).toEqual({ error: 'Unknown action' });
	});
});
