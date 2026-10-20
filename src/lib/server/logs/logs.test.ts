import { assert, it } from '@effect/vitest';
import { Effect, Option } from 'effect';
import { LogStore, makeLogStoreLayer } from '$lib/server/logs';
import type { LogEntry } from '$lib/types';

function entry(id: string): LogEntry {
	return {
		id,
		requestId: id,
		at: '2026-01-01T00:00:00.000Z',
		method: 'GET',
		path: `/${id}`,
		params: {},
		queries: {},
		requestHeaders: {},
		requestBody: null,
		status: 200,
		responseHeaders: {},
		responseBody: null,
		duration: 1,
	};
}

it.effect('lists entries newest first', () =>
	Effect.gen(function* () {
		const logs = yield* LogStore;
		yield* logs.append(entry('1'));
		yield* logs.append(entry('2'));
		yield* logs.append(entry('3'));
		const ids = (yield* logs.list).map((item) => item.id);
		assert.deepStrictEqual(ids, ['3', '2', '1']);
	}).pipe(Effect.provide(makeLogStoreLayer(200))),
);

it.effect('a cap of 2 keeps the newest two', () =>
	Effect.gen(function* () {
		const logs = yield* LogStore;
		yield* logs.append(entry('1'));
		yield* logs.append(entry('2'));
		yield* logs.append(entry('3'));
		const ids = (yield* logs.list).map((item) => item.id);
		assert.deepStrictEqual(ids, ['3', '2']);
	}).pipe(Effect.provide(makeLogStoreLayer(2))),
);

it.effect('get hits and misses', () =>
	Effect.gen(function* () {
		const logs = yield* LogStore;
		yield* logs.append(entry('a'));
		assert.isTrue(Option.isSome(yield* logs.get('a')));
		assert.isTrue(Option.isNone(yield* logs.get('missing')));
	}).pipe(Effect.provide(makeLogStoreLayer(10))),
);

it.effect('list returns a copy', () =>
	Effect.gen(function* () {
		const logs = yield* LogStore;
		yield* logs.append(entry('1'));
		const first = yield* logs.list;
		(first as LogEntry[]).push(entry('extra'));
		assert.strictEqual((yield* logs.list).length, 1);
	}).pipe(Effect.provide(makeLogStoreLayer(10))),
);

it.effect('parallel tests do not share entries', () =>
	Effect.gen(function* () {
		const logs = yield* LogStore;
		yield* logs.append(entry('only-this-test'));
		assert.strictEqual((yield* logs.list).length, 1);
	}).pipe(Effect.provide(makeLogStoreLayer(10))),
);
