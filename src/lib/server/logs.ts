import type { LogEntry } from '$lib/types';

const MAX_LOGS = 200;
const LOGS_KEY = Symbol.for('nipuu.logs');

type GlobalLogs = typeof globalThis & {
	[LOGS_KEY]?: LogEntry[];
};

function entries(): LogEntry[] {
	const global = globalThis as GlobalLogs;
	if (!global[LOGS_KEY]) global[LOGS_KEY] = [];
	return global[LOGS_KEY];
}

export function appendLog(entry: LogEntry): void {
	const logs = entries();
	logs.unshift(entry);
	if (logs.length > MAX_LOGS) {
		logs.length = MAX_LOGS;
	}
}

export function listLogs(): LogEntry[] {
	return entries().slice();
}

export function getLog(id: string): LogEntry | undefined {
	return entries().find((entry) => entry.id === id);
}
