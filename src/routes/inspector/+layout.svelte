<script lang="ts">
	import { page } from '$app/state';
	import { INSPECTOR_URL } from '$lib/inspector';
	import NavLink from '$lib/ui/nav-link/nav-link.svelte';
	import { chrome } from '$lib/ui/shared/shell/chrome.style';
	import * as stylex from '@stylexjs/stylex';

	let { children } = $props();

	const logsCurrent = $derived(
		page.url.pathname === INSPECTOR_URL ||
			page.url.pathname === `${INSPECTOR_URL}/` ||
			page.url.pathname.startsWith(`${INSPECTOR_URL}/requests`),
	);
	const tablesCurrent = $derived(page.url.pathname.startsWith(`${INSPECTOR_URL}/tables`));
</script>

<div {...stylex.attrs(chrome.frame)}>
	<header {...stylex.attrs(chrome.header)}>
		<nav {...stylex.attrs(chrome.nav)}>
			<NavLink href={INSPECTOR_URL} current={logsCurrent}>Requests</NavLink>
			<NavLink href={`${INSPECTOR_URL}/tables`} current={tablesCurrent}>Models</NavLink>
		</nav>
	</header>
	{@render children()}
</div>
