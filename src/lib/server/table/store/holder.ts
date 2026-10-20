import type { Table } from '$lib/server/table/lifecycle';
import { Effect, SynchronizedRef } from 'effect';

let held: SynchronizedRef.SynchronizedRef<Map<string, Table>> | undefined;
let boot = () => {};

export function registerTableBoot(start: () => void): void {
	boot = start;
}

export function holdTables(ref: SynchronizedRef.SynchronizedRef<Map<string, Table>>): void {
	held = ref;
}

export function unholdTables(): void {
	held = undefined;
}

export function readHeldTables(): Map<string, Table> {
	if (!held) boot();
	if (!held) {
		throw new Error('Table store is not running');
	}

	return Effect.runSync(SynchronizedRef.get(held));
}
