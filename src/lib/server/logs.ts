import type { LogEntry } from '$lib/types';

const MAX_LOGS = 200;

export class LogStore {
	#entries: LogEntry[] = [];

	append(entry: LogEntry): void {
		this.#entries.unshift(entry);
		if (this.#entries.length > MAX_LOGS) {
			this.#entries.length = MAX_LOGS;
		}
	}

	list(): LogEntry[] {
		return this.#entries.slice();
	}
}
