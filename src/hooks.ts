import type { Reroute } from '@sveltejs/kit';
import { rewriteInspectorPath } from '$lib/inspector';

export const reroute: Reroute = ({ url }) => rewriteInspectorPath(url.pathname);
