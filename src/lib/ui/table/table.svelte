<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLTableAttributes } from 'svelte/elements';
	import * as stylex from '@stylexjs/stylex';
	import { table } from '$lib/ui/table/table.style';

	let { children, ...rest }: HTMLTableAttributes & { children?: Snippet } = $props();
</script>

<table {...rest} {...stylex.attrs(table.root)}>
	{@render children?.()}
</table>
