<script lang="ts">
	import type { Snippet } from 'svelte';
	import * as stylex from '@stylexjs/stylex';
	import { navLink } from '$lib/ui/nav-link/nav-link.style';

	let {
		href,
		current = false,
		children,
	}: { href: string; current?: boolean; children?: Snippet } = $props();
</script>

<a
	{href}
	aria-current={current ? 'page' : undefined}
	{...stylex.attrs(navLink.root, current && navLink.current)}
>
	{@render children?.()}
</a>
