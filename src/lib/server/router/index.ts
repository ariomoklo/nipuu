import { Array, Option, pipe } from 'effect';

type Segment = { type: 'static'; value: string } | { type: 'param'; name: string };

// A throw is absence. This lookup stays pure, so it does not need Effect.try.
const decodeSegment = Option.liftThrowable(decodeURIComponent);

function splitPath(path: string): string[] {
	return path.split('/').filter(Boolean);
}

function parsePattern(pattern: string): Segment[] {
	return splitPath(pattern).map((segment) =>
		segment.startsWith(':')
			? { type: 'param', name: segment.slice(1) }
			: { type: 'static', value: segment },
	);
}

function matchSegment(segment: Segment, value: string): Option.Option<Record<string, string>> {
	if (segment.type === 'static') {
		return segment.value === value ? Option.some({}) : Option.none();
	}

	return Option.map(decodeSegment(value), (decoded) => ({ [segment.name]: decoded }));
}

function matchPath(pattern: string, pathname: string): Option.Option<Record<string, string>> {
	const patternSegments = parsePattern(pattern);
	const pathSegments = splitPath(pathname);

	if (patternSegments.length !== pathSegments.length) return Option.none();

	return Array.reduce(
		Array.zip(patternSegments, pathSegments),
		Option.some<Record<string, string>>({}),
		(params, [segment, value]) =>
			Option.zipWith(params, matchSegment(segment, value), (accumulated, entry) => ({
				...accumulated,
				...entry,
			})),
	);
}

function methodHandler(methods: Record<string, unknown>, method: string): Option.Option<unknown> {
	if (!Object.hasOwn(methods, method)) return Option.none();

	return Option.some(methods[method]);
}

export type MatchResult = {
	pattern: string;
	method: string;
	handler: unknown;
	params: Record<string, string>;
};

export function findRoute(
	routes: Record<string, Record<string, unknown>>,
	method: string,
	pathname: string,
): Option.Option<MatchResult> {
	return Array.findFirst(Object.entries(routes), ([pattern, methods]) =>
		pipe(
			matchPath(pattern, pathname),
			Option.flatMap((params) =>
				pipe(
					methodHandler(methods, method),
					Option.map((handler) => ({ pattern, method, handler, params })),
				),
			),
		),
	);
}

export function matchRoute(
	routes: Record<string, Record<string, unknown>>,
	method: string,
	pathname: string,
): MatchResult | null {
	return Option.getOrNull(findRoute(routes, method, pathname));
}
