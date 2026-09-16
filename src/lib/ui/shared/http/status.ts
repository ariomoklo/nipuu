export type StatusTone = 'ok' | 'neutral' | 'error';

export function statusTone(status: number): StatusTone {
	if (status >= 200 && status < 300) return 'ok';
	if (status >= 400) return 'error';
	return 'neutral';
}
