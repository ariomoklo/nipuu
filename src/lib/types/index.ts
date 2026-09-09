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

export type RouteAction = 'static' | 'search' | 'find' | 'upsert' | 'update' | 'delete';

export type RouteSourceName = 'params' | 'queries' | 'body';

export type RouteBy = 'equal' | 'include';

export type RouteFieldRef = {
	source: RouteSourceName;
	key: string;
	by?: RouteBy;
};

export type RouteHandlerObject = {
	action?: RouteAction | string;
	model?: string;
	where?: Record<string, RouteFieldRef>;
	filter?: Record<string, RouteFieldRef>;
	sort?: {
		sortBy?: RouteFieldRef;
		orderBy?: RouteFieldRef;
	};
	pagination?: {
		type?: string;
		start?: RouteFieldRef;
		end?: RouteFieldRef;
		limit?: RouteFieldRef;
	};
	update?: Record<string, RouteFieldRef | ((row: Record<string, unknown>) => unknown)>;
	response?: unknown;
	[key: string]: unknown;
};

export type RouteHandler = string | number | RouteHandlerObject;
