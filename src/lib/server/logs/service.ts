import type { LogEntry } from '$lib/types';
import { Context, Effect, Layer, Option, Ref } from 'effect';

export class LogStore extends Context.Service<
	LogStore,
	{
		readonly append: (entry: LogEntry) => Effect.Effect<void>;
		readonly list: Effect.Effect<ReadonlyArray<LogEntry>>;
		readonly get: (id: string) => Effect.Effect<Option.Option<LogEntry>>;
	}
>()('nipuu/LogStore') {}

export const makeLogStoreLayer = (max: number) =>
	Layer.effect(
		LogStore,
		Effect.gen(function* () {
			const entries = yield* Ref.make<ReadonlyArray<LogEntry>>([]);
			return {
				append: (entry) => Ref.update(entries, (list) => [entry, ...list].slice(0, max)),
				list: Ref.get(entries).pipe(Effect.map((list) => list.slice())),
				get: (id) =>
					Ref.get(entries).pipe(
						Effect.map((list) => Option.fromNullishOr(list.find((entry) => entry.id === id))),
					),
			};
		}),
	);

export const LogStoreLayer = makeLogStoreLayer(200);
