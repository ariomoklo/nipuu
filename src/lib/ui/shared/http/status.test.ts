import { statusTone } from '$lib/ui/shared/http/status';
import { describe, expect, it } from 'vitest';

describe('statusTone', () => {
	it('marks 2xx as ok', () => {
		expect(statusTone(200)).toBe('ok');
		expect(statusTone(201)).toBe('ok');
	});

	it('marks 4xx and 5xx as error', () => {
		expect(statusTone(404)).toBe('error');
		expect(statusTone(500)).toBe('error');
	});

	it('marks 1xx and 3xx as neutral', () => {
		expect(statusTone(101)).toBe('neutral');
		expect(statusTone(301)).toBe('neutral');
	});
});
