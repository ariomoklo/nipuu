type Segment = { type: 'static'; value: string } | { type: 'param'; name: string };

function parsePattern(pattern: string): Segment[] {
	if (pattern === '/') return [];
	return pattern
		.split('/')
		.filter(Boolean)
		.map((segment) =>
			segment.startsWith(':')
				? { type: 'param', name: segment.slice(1) }
				: { type: 'static', value: segment },
		);
}

function matchPath(pattern: string, pathname: string): Record<string, string> | null {
	const pathSegments = pathname === '/' ? [] : pathname.split('/').filter(Boolean);
	const patternSegments = parsePattern(pattern);

	if (pathSegments.length !== patternSegments.length) return null;

	const params: Record<string, string> = {};
	for (let i = 0; i < patternSegments.length; i += 1) {
		const expected = patternSegments[i];
		const actual = pathSegments[i];
		if (expected.type === 'static') {
			if (expected.value !== actual) return null;
		} else {
			params[expected.name] = decodeURIComponent(actual);
		}
	}

	return params;
}

export type MatchResult = {
	pattern: string;
	method: string;
	handler: unknown;
	params: Record<string, string>;
};

export function matchRoute(
	routes: Record<string, Record<string, unknown>>,
	method: string,
	pathname: string,
): MatchResult | null {
	for (const [pattern, methods] of Object.entries(routes)) {
		const params = matchPath(pattern, pathname);
		if (!params) continue;
		if (!Object.hasOwn(methods, method)) continue;
		return {
			pattern,
			method,
			handler: methods[method],
			params,
		};
	}

	return null;
}
