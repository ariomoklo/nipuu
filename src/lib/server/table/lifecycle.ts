import type { Row, Schema } from '$lib/server/model/types';
import { Effect, Exit, FiberSet, PubSub, Scope } from 'effect';

export type TableEvent =
	| { readonly _tag: 'Seeded' }
	| { readonly _tag: 'Updated'; readonly row: Row; readonly index: number }
	| { readonly _tag: 'Upserted'; readonly row: Row; readonly index: number };

export type Table = {
	schema: Schema;
	seedCount: number;
	rows: Row[];
	events: PubSub.PubSub<TableEvent>;
	scope: Scope.Closeable;
	fibers: FiberSet.FiberSet<void>;
};

export type TableListener = (event: TableEvent) => Effect.Effect<void, unknown>;

function eventFrom(
	event: 'after.seed' | 'update' | 'upsert',
	args: ReadonlyArray<unknown>,
): TableEvent {
	if (event === 'after.seed') return { _tag: 'Seeded' };
	const row = args[0] as Row;
	const index = args[1] as number;
	return event === 'update' ? { _tag: 'Updated', row, index } : { _tag: 'Upserted', row, index };
}

export const openTable = (schema: Schema, seedCount: number): Effect.Effect<Table> =>
	Effect.gen(function* () {
		const events = yield* PubSub.unbounded<TableEvent>();
		const scope = yield* Scope.make();
		const fibers = yield* FiberSet.make<void>().pipe(Effect.provideService(Scope.Scope, scope));
		return { schema, seedCount, rows: [], events, scope, fibers };
	});

/** One PubSub per table so a subscriber only sees that table's writes. */
export const subscribe = (
	table: Table,
	handler: TableListener,
): Effect.Effect<void, never, Scope.Scope> =>
	Effect.gen(function* () {
		const subscription = yield* PubSub.subscribe(table.events);
		yield* Effect.forkScoped(
			Effect.forever(
				Effect.gen(function* () {
					const event = yield* PubSub.take(subscription);
					yield* FiberSet.run(
						table.fibers,
						Effect.gen(function* () {
							yield* Effect.promise(() => Promise.resolve());
							yield* handler(event);
						}).pipe(Effect.catchCause((cause) => Effect.logWarning('listener failed', cause))),
					);
				}),
			),
		);
	});

export const publish = (table: Table, event: TableEvent): Effect.Effect<void> =>
	Effect.gen(function* () {
		yield* PubSub.publish(table.events, event);
		yield* Effect.yieldNow;
	});

export const flushEffect = (table: Table): Effect.Effect<void> => FiberSet.awaitEmpty(table.fibers);

export const destroyEffect = (table: Table): Effect.Effect<void> =>
	Effect.gen(function* () {
		yield* Scope.close(table.scope, Exit.void);
		table.rows = [];
	});

export function createTable(schema: Schema, seedCount: number): Table {
	return Effect.runSync(openTable(schema, seedCount));
}

export function broadcast(
	table: Table,
	event: 'after.seed' | 'update' | 'upsert',
	...args: ReadonlyArray<unknown>
): Promise<void> {
	return Effect.runPromise(publish(table, eventFrom(event, args)));
}

export function flush(table: Table): Promise<void> {
	return Effect.runPromise(flushEffect(table));
}

export function destroy(table: Table): void {
	Effect.runSync(destroyEffect(table));
}
