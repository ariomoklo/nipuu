import type { Row, Schema } from '$lib/server/model/types';
import type { LifecycleListener, SetItem } from '$lib/types';

export type TableLifecycle = 'after.seed' | 'update' | 'upsert';

export type Table = {
	schema: Schema;
	seedCount: number;
	rows: Row[];
	pending: Set<Promise<void>>;
	lifecycles: {
		'after.seed': Set<(table: Table) => void>;
		update: Set<(row: Row, index: number) => void>;
		upsert: Set<(row: Row, index: number) => void>;
	};
	destroyRef: Set<() => void>;
};

export function trackDestroy(table: Table, unsub: () => void) {
	table.destroyRef.add(unsub);
}

export function destroy(table: Table) {
	for (const unsub of table.destroyRef) {
		unsub();
	}

	table.destroyRef.clear();

	for (const listeners of Object.values(table.lifecycles)) {
		listeners.clear();
	}

	table.pending.clear();
	table.rows = [];
}

export function on<T extends TableLifecycle>(
	table: Table,
	event: T,
	callback: SetItem<(typeof table.lifecycles)[T]>,
) {
	const fnSet = table.lifecycles[event] as Set<typeof callback>;
	fnSet.add(callback);
	return () => fnSet.delete(callback);
}

export function broadcast<T extends TableLifecycle>(
	table: Table,
	event: T,
	...args: Parameters<SetItem<(typeof table.lifecycles)[T]>>
): Promise<void> {
	let task!: Promise<void>;
	task = Promise.resolve()
		.then(() => {
			for (const callback of table.lifecycles[event]) {
				(callback as LifecycleListener<any[], void>)(...args);
			}
		})
		.catch(() => {})
		.finally(() => table.pending.delete(task));
	table.pending.add(task);
	return task;
}

export function flush(table: Table): Promise<void> {
	return Promise.all(table.pending).then(() => undefined);
}
