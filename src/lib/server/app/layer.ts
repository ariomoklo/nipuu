import { LogStoreLayer } from '$lib/server/logs/service';
import { ModelSchemasLayer, NipuuConfigLayer } from '$lib/server/app/services';
import { makeSeededTableStoreLayer } from '$lib/server/table/store/service';
import { Layer } from 'effect';

export function makeAppLayer(options?: { readonly hold?: boolean }) {
	const tables = makeSeededTableStoreLayer({ hold: options?.hold ?? false });

	return Layer.mergeAll(LogStoreLayer, tables).pipe(
		Layer.provideMerge(ModelSchemasLayer),
		Layer.provideMerge(NipuuConfigLayer),
	);
}

/** Process graph. `hold` publishes the table map for inspector reads. */
export const AppLayer = makeAppLayer({ hold: true });
