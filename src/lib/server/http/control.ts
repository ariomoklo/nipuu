import { INSPECTOR_URL } from '$lib/inspector';

const CONTROL_PLANE_PREFIXES = ['/_app', '/node_modules', '/src', '/.svelte-kit', '/__vite'];

export function isControlPlane(pathname: string): boolean {
	if (pathname === INSPECTOR_URL || pathname.startsWith(`${INSPECTOR_URL}/`)) return true;
	if (pathname.startsWith('/@')) return true;
	// StyleX serves `/virtual:stylex.css` and `/virtual:stylex.js` from Vite.
	// The colon means these are not a slash-delimited prefix.
	if (pathname.startsWith('/virtual:stylex')) return true;
	return CONTROL_PLANE_PREFIXES.some(
		(prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
	);
}
