import { findRoute, matchRoute } from '$lib/server/router';
import { assert, it } from '@effect/vitest';
import { Option } from 'effect';

it('matches a static path', () => {
	assert.deepStrictEqual(
		findRoute({ '/health': { GET: 'ok' } }, 'GET', '/health'),
		Option.some({ pattern: '/health', method: 'GET', handler: 'ok', params: {} }),
	);
});

it('matches a param', () => {
	assert.deepStrictEqual(
		findRoute({ '/users/:id': { GET: 'user' } }, 'GET', '/users/7'),
		Option.some({
			pattern: '/users/:id',
			method: 'GET',
			handler: 'user',
			params: { id: '7' },
		}),
	);
});

it('matches every param on a longer pattern', () => {
	assert.deepStrictEqual(
		findRoute({ '/users/:id/posts/:postId': { GET: 'post' } }, 'GET', '/users/7/posts/3'),
		Option.some({
			pattern: '/users/:id/posts/:postId',
			method: 'GET',
			handler: 'post',
			params: { id: '7', postId: '3' },
		}),
	);
});

it('decodes a percent-encoded param', () => {
	assert.deepStrictEqual(
		findRoute({ '/users/:id': { GET: 'user' } }, 'GET', '/users/a%20b'),
		Option.some({
			pattern: '/users/:id',
			method: 'GET',
			handler: 'user',
			params: { id: 'a b' },
		}),
	);
});

it('returns None when the path length does not match', () => {
	const routes = { '/users/:id': { GET: 'user' } };
	assert.deepStrictEqual(findRoute(routes, 'GET', '/users'), Option.none());
	assert.deepStrictEqual(findRoute(routes, 'GET', '/users/7/extra'), Option.none());
});

it('returns None when a static segment differs', () => {
	assert.deepStrictEqual(
		findRoute({ '/users/:id': { GET: 'user' } }, 'GET', '/posts/7'),
		Option.none(),
	);
});

it('returns None when the method is missing', () => {
	assert.deepStrictEqual(
		findRoute({ '/users/:id': { GET: 'user' } }, 'POST', '/users/7'),
		Option.none(),
	);
});

it('skips a path match whose method is missing and uses the next route', () => {
	const routes = {
		'/users/:id': { POST: 'create' },
		'/users/me': { GET: 'me' },
	};
	assert.deepStrictEqual(
		findRoute(routes, 'GET', '/users/me'),
		Option.some({ pattern: '/users/me', method: 'GET', handler: 'me', params: {} }),
	);
});

it('matches the root path', () => {
	assert.deepStrictEqual(
		findRoute({ '/': { GET: 'home' } }, 'GET', '/'),
		Option.some({ pattern: '/', method: 'GET', handler: 'home', params: {} }),
	);
});

it('uses the first route when two patterns match', () => {
	const routes = {
		'/users/:id': { GET: 'by-id' },
		'/users/me': { GET: 'me' },
	};
	assert.deepStrictEqual(
		findRoute(routes, 'GET', '/users/me'),
		Option.some({
			pattern: '/users/:id',
			method: 'GET',
			handler: 'by-id',
			params: { id: 'me' },
		}),
	);
});

it('returns None when a param is malformed percent-encoding', () => {
	assert.deepStrictEqual(
		findRoute({ '/users/:id': { GET: 'user' } }, 'GET', '/users/%E0%A4%A'),
		Option.none(),
	);
});

it('matchRoute returns the match or null', () => {
	const routes = { '/health': { GET: 'ok' } };
	assert.deepStrictEqual(matchRoute(routes, 'GET', '/health'), {
		pattern: '/health',
		method: 'GET',
		handler: 'ok',
		params: {},
	});
	assert.strictEqual(matchRoute(routes, 'GET', '/missing'), null);
	assert.strictEqual(matchRoute({ '/users/:id': { GET: 'user' } }, 'GET', '/users/%E0%A4%A'), null);
});
