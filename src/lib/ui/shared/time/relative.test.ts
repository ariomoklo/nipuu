import { relativeTime } from '$lib/ui/shared/time/relative';
import { describe, expect, it } from 'vitest';

const AT = '2026-09-15T08:06:58.076Z';
const NOW = Date.parse(AT);

describe('relativeTime', () => {
	it('says just now for a few seconds', () => {
		expect(relativeTime(AT, NOW + 2_000)).toBe('just now');
	});

	it('formats minutes ago', () => {
		expect(relativeTime(AT, NOW + 120_000)).toBe('2 minutes ago');
	});

	it('returns the original string when the date is invalid', () => {
		expect(relativeTime('not-a-date', NOW)).toBe('not-a-date');
	});
});
