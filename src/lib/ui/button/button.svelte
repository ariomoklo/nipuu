<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import * as stylex from '@stylexjs/stylex';
	import { button } from '$lib/ui/button/button.style';

	type Variant = 'primary' | 'ghost' | 'destructive';

	let {
		variant = 'primary',
		children,
		...rest
	}: HTMLButtonAttributes & { variant?: Variant; children?: Snippet } = $props();
</script>

<button {...rest} {...stylex.attrs(button.base, button[variant])}>
	{@render children?.()}
</button>
