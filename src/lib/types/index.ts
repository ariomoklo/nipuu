export type LogEntry = {
	id: string;
	requestId: string;
	at: string;
	method: string;
	path: string;
	params: Record<string, string>;
	queries: Record<string, string>;
	requestHeaders: Record<string, string>;
	requestBody: unknown;
	status: number;
	responseHeaders: Record<string, string>;
	responseBody: unknown;
	duration: number;
};

export type LifecycleListener<I extends any[], O> = (...args: I) => O;
export type LifecycleEvents<T extends string> = Record<T, Set<LifecycleListener<any[], void>>>
export type SetItem<T> = T extends Set<infer I> ? I : never;

export type RouteAction = 'search' | 'find' | 'upsert' | 'update' | 'delete';

export type RouteHandlerObject = {
	action?: string;
	model?: string;
	[key: string]: unknown;
};

export type RouteHandler = string | number | RouteHandlerObject;
