import type { Handle } from '@sveltejs/kit';
import { INSPECTOR_URL } from '$lib/inspector';

const CONTROL_PLANE_PREFIXES = ['/_app', '/node_modules', '/src', '/.svelte-kit', '/__vite'];

export function isControlPlane(pathname: string): boolean {
	if (pathname === INSPECTOR_URL || pathname.startsWith(`${INSPECTOR_URL}/`)) return true;
	if (pathname.startsWith('/@')) return true;
	return CONTROL_PLANE_PREFIXES.some(
		(prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
	);
}

export const handleControlPlane: Handle = async ({ event, resolve }) => {
	if (isControlPlane(event.url.pathname)) {
		return resolve(event);
	}

	return resolve(event);
};
