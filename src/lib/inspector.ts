/** Public inspector URL. File routes live under /inspector because SvelteKit treats `_` folders as private. */
export const INSPECTOR_URL = '/_nipuu';
export const INSPECTOR_ROUTE = '/inspector';

export function rewriteInspectorPath(pathname: string): string | undefined {
	if (pathname === INSPECTOR_URL || pathname.startsWith(`${INSPECTOR_URL}/`)) {
		return INSPECTOR_ROUTE + pathname.slice(INSPECTOR_URL.length);
	}
}
