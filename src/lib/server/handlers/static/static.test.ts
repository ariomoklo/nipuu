import { describe, expect, it } from 'vitest';
import { dispatch } from '$lib/server/handlers';
import { staticAction } from '$lib/server/handlers/static/static';

const empty = { method: 'GET', path: '/', params: {}, queries: {}, body: null };

describe('staticAction', () => {
	it('returns text/plain for primitives', async () => {
		const stringRes = staticAction({ action: 'static', response: 'Hello!' });
		expect(stringRes.status).toBe(200);
		expect(stringRes.headers.get('content-type')).toBe('text/plain; charset=utf-8');
		expect(await stringRes.text()).toBe('Hello!');

		const numberRes = staticAction({ action: 'static', response: 42 });
		expect(await numberRes.text()).toBe('42');

		const boolRes = staticAction({ action: 'static', response: true });
		expect(await boolRes.text()).toBe('true');

		const bigintRes = staticAction({ action: 'static', response: 1n });
		expect(await bigintRes.text()).toBe('1');
	});

	it('returns JSON for records, arrays, and null', async () => {
		const objectRes = staticAction({ action: 'static', response: { ok: true } });
		expect(objectRes.headers.get('content-type')).toBe('application/json');
		expect(await objectRes.json()).toEqual({ ok: true });

		const arrayRes = staticAction({ action: 'static', response: [1, 2] });
		expect(await arrayRes.json()).toEqual([1, 2]);

		const nullRes = staticAction({ action: 'static', response: null });
		expect(await nullRes.json()).toBeNull();
	});

	it('returns 500 for functions and missing response', async () => {
		const fnRes = staticAction({ action: 'static', response: () => 'nope' });
		expect(fnRes.status).toBe(500);
		expect(await fnRes.json()).toEqual({ error: 'Invalid static response' });

		const missing = staticAction({ action: 'static' });
		expect(missing.status).toBe(500);
		expect(await missing.json()).toEqual({ error: 'Invalid static response' });
	});
});

describe('dispatch static shorthand', () => {
	it('returns text/plain for string and number handlers', async () => {
		const hello = dispatch('Hello!', empty);
		expect(hello.headers.get('content-type')).toBe('text/plain; charset=utf-8');
		expect(await hello.text()).toBe('Hello!');

		const numberRes = dispatch(7, empty);
		expect(await numberRes.text()).toBe('7');
	});
});
