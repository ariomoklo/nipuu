import type { RouteHandler } from '$lib/types';

function delayMs(handler: RouteHandler): number {
	if (typeof handler !== 'object' || handler === null) return 0;
	const value = handler.delay;
	if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return 0;
	return value;
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}

export async function waitDelay(handler: RouteHandler): Promise<void> {
	const ms = delayMs(handler);
	if (ms === 0) return;
	await sleep(ms);
}
