import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { waitDelay } from '$lib/server/handlers/delay/delay';

describe('waitDelay', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('does not wait for shorthand handlers or invalid delay', async () => {
		const pending = Promise.all([
			waitDelay('Hello!'),
			waitDelay(1),
			waitDelay({ action: 'static', response: 'ok' }),
			waitDelay({ action: 'static', response: 'ok', delay: 0 }),
			waitDelay({ action: 'static', response: 'ok', delay: -10 }),
			waitDelay({ action: 'static', response: 'ok', delay: Number.NaN }),
			waitDelay({ action: 'static', response: 'ok', delay: '250' as never }),
		]);

		await pending;
		expect(vi.getTimerCount()).toBe(0);
	});

	it('waits a finite positive delay in milliseconds', async () => {
		let done = false;
		const pending = waitDelay({ action: 'static', response: 'ok', delay: 250 }).then(() => {
			done = true;
		});

		await vi.advanceTimersByTimeAsync(249);
		expect(done).toBe(false);
		await vi.advanceTimersByTimeAsync(1);
		await pending;
		expect(done).toBe(true);
	});
});
