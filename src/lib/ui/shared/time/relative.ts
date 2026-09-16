const UNITS = [
	[60, 'second'],
	[60, 'minute'],
	[24, 'hour'],
	[7, 'day'],
	[4.34524, 'week'],
	[12, 'month'],
	[Number.POSITIVE_INFINITY, 'year']
] as const;

const FORMAT = new Intl.RelativeTimeFormat('en', { numeric: 'always' });

export function relativeTime(iso: string, now: number): string {
	const then = Date.parse(iso);
	if (Number.isNaN(then)) return iso;

	let duration = (then - now) / 1000;
	if (Math.abs(duration) < 5) return 'just now';

	for (const [amount, unit] of UNITS) {
		if (Math.abs(duration) < amount) {
			return FORMAT.format(Math.round(duration), unit);
		}

		duration /= amount;
	}

	return iso;
}
