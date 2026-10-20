import { getAppRuntime } from '$lib/server/effect/runtime';
import { CORS_HEADERS } from '$lib/server/http/cors';
import { handleRequestEffect } from '$lib/server/runtime/handle';
import { Effect } from 'effect';
import { HttpServerRequest, HttpServerResponse } from 'effect/http';

export const dataPlane = Effect.gen(function* () {
	const incoming = yield* HttpServerRequest.HttpServerRequest;
	if (incoming.method === 'OPTIONS') {
		return HttpServerResponse.empty({ status: 204, headers: CORS_HEADERS });
	}

	const web = yield* HttpServerRequest.toWeb(incoming);
	const response = yield* Effect.promise(() =>
		getAppRuntime().runPromise(handleRequestEffect(web, new URL(web.url))),
	);

	return HttpServerResponse.setHeaders(HttpServerResponse.fromWeb(response), CORS_HEADERS);
});
