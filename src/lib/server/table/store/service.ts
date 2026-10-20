import { ModelSchemas, NipuuConfig } from '$lib/server/app/services';
import type { Payload, Schema, Store } from '$lib/server/model/types';
import type { Row } from '$lib/server/model/types';
import { seedCount } from '$lib/server/runtime/config';
import { flushEffect, type Table } from '$lib/server/table/lifecycle';
import { loadTables } from '$lib/server/table/load';
import { holdTables } from '$lib/server/table/store/holder';
import { deleteRow, find, insert, select, update, upsert } from '$lib/server/table/store/store';
import type { FilterSchema } from '$lib/server/table/filter/filter';
import { Context, Data, Effect, Layer, SynchronizedRef } from 'effect';

export class TableNotFound extends Data.TaggedError('TableNotFound')<{
	readonly table: string;
}> {}

export class RowNotFound extends Data.TaggedError('RowNotFound')<{
	readonly table: string;
	readonly where: unknown;
}> {}

type Where = Record<string, unknown> | FilterSchema[];

export class TableStore extends Context.Service<
	TableStore,
	{
		readonly get: (name: string) => Effect.Effect<Table, TableNotFound>;
		readonly list: Effect.Effect<ReadonlyArray<string>>;
		readonly find: (
			name: string,
			where: Where,
		) => Effect.Effect<Payload, TableNotFound | RowNotFound>;
		readonly select: (
			name: string,
			filters?: FilterSchema[],
		) => Effect.Effect<Payload[], TableNotFound>;
		readonly insert: (name: string, payload: Payload) => Effect.Effect<Row, TableNotFound>;
		readonly upsert: (name: string, payload: Payload) => Effect.Effect<Row, TableNotFound>;
		readonly update: (
			name: string,
			where: Where,
			patch: Payload,
		) => Effect.Effect<Row, TableNotFound | RowNotFound>;
		readonly remove: (
			name: string,
			where: Where,
		) => Effect.Effect<Row, TableNotFound | RowNotFound>;
		readonly snapshot: Effect.Effect<Store>;
		readonly create: (schemas: ReadonlyArray<Schema>, seedCount: number) => Effect.Effect<void>;
		readonly reset: Effect.Effect<void>;
		readonly flush: Effect.Effect<void>;
	}
>()('nipuu/TableStore') {}

function snapshotOf(map: Map<string, Table>): Store {
	const store: Store = {};
	for (const [name, table] of map) store[name] = table.rows;
	return store;
}

function makeTableStore(ref: SynchronizedRef.SynchronizedRef<Map<string, Table>>) {
	const read = (name: string, map: Map<string, Table>) => {
		const table = map.get(name);
		return table ? Effect.succeed(table) : Effect.fail(new TableNotFound({ table: name }));
	};

	const miss = (name: string, where: Where) => new RowNotFound({ table: name, where });

	return {
		get: (name: string) => SynchronizedRef.get(ref).pipe(Effect.flatMap((map) => read(name, map))),
		list: SynchronizedRef.get(ref).pipe(Effect.map((map) => [...map.keys()])),
		find: (name: string, where: Where) =>
			SynchronizedRef.get(ref).pipe(
				Effect.flatMap((map) =>
					Effect.gen(function* () {
						const table = yield* read(name, map);
						const row = find(table, where);
						if (!row) return yield* miss(name, where);
						return row;
					}),
				),
			),
		select: (name: string, filters: FilterSchema[] = []) =>
			SynchronizedRef.get(ref).pipe(
				Effect.flatMap((map) =>
					Effect.gen(function* () {
						const table = yield* read(name, map);
						return select(table, filters);
					}),
				),
			),
		insert: (name: string, payload: Payload) =>
			SynchronizedRef.modifyEffect(ref, (map) =>
				Effect.gen(function* () {
					const table = yield* read(name, map);
					return [insert(table, payload, map), map] as const;
				}),
			),
		upsert: (name: string, payload: Payload) =>
			SynchronizedRef.modifyEffect(ref, (map) =>
				Effect.gen(function* () {
					const table = yield* read(name, map);
					return [upsert(table, payload, map), map] as const;
				}),
			),
		update: (name: string, where: Where, patch: Payload) =>
			SynchronizedRef.modifyEffect(ref, (map) =>
				Effect.gen(function* () {
					const table = yield* read(name, map);
					const row = update(table, where, patch, map);
					if (!row) return yield* miss(name, where);
					return [row, map] as const;
				}),
			),
		remove: (name: string, where: Where) =>
			SynchronizedRef.modifyEffect(ref, (map) =>
				Effect.gen(function* () {
					const table = yield* read(name, map);
					const row = deleteRow(table, where);
					if (!row) return yield* miss(name, where);
					return [row, map] as const;
				}),
			),
		snapshot: SynchronizedRef.get(ref).pipe(Effect.map(snapshotOf)),
		create: (schemas: ReadonlyArray<Schema>, count: number) =>
			SynchronizedRef.updateEffect(ref, (map) =>
				Effect.sync(() => {
					loadTables(map, [...schemas], count);
					return map;
				}),
			),
		reset: SynchronizedRef.updateEffect(ref, (map) =>
			Effect.sync(() => {
				loadTables(map, [], 0);
				return map;
			}),
		),
		flush: SynchronizedRef.get(ref).pipe(
			Effect.flatMap((map) =>
				Effect.forEach(map.values(), (table) => flushEffect(table), { concurrency: 1 }),
			),
		),
	};
}

export const makeTableStoreLayer = (options?: { readonly hold?: boolean }) =>
	Layer.effect(
		TableStore,
		Effect.gen(function* () {
			const ref = yield* SynchronizedRef.make(new Map<string, Table>());
			if (options?.hold) holdTables(ref);
			return makeTableStore(ref);
		}),
	);

export const TableStoreLayer = makeTableStoreLayer({ hold: true });

/** Builds tables from `NipuuConfig` and `ModelSchemas`, then seeds them. */
export const makeSeededTableStoreLayer = (options?: { readonly hold?: boolean }) =>
	Layer.effect(
		TableStore,
		Effect.gen(function* () {
			yield* NipuuConfig;
			const { schemas } = yield* ModelSchemas;
			const count = yield* seedCount;
			const ref = yield* SynchronizedRef.make(new Map<string, Table>());
			if (options?.hold) holdTables(ref);
			const store = makeTableStore(ref);
			yield* store.create(schemas, count);
			return store;
		}),
	);
