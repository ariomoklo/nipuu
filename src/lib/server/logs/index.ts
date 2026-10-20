import { runAppSync } from '$lib/server/effect/runtime';
import { LogStore } from '$lib/server/logs/service';
import type { LogEntry } from '$lib/types';
import { Effect, Option } from 'effect';

export { LogStore, LogStoreLayer, makeLogStoreLayer } from '$lib/server/logs/service';

export function appendLog(entry: LogEntry): void {
	runAppSync(
		Effect.gen(function* () {
			const logs = yield* LogStore;
			yield* logs.append(entry);
		}),
	);
}

export function listLogs(): LogEntry[] {
	return runAppSync(
		Effect.gen(function* () {
			const logs = yield* LogStore;
			return yield* logs.list;
		}),
	) as LogEntry[];
}

export function getLog(id: string): LogEntry | undefined {
	return runAppSync(
		Effect.gen(function* () {
			const logs = yield* LogStore;
			return Option.getOrUndefined(yield* logs.get(id));
		}),
	);
}
