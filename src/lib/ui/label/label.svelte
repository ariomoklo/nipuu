<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLLabelAttributes } from 'svelte/elements';
	import * as stylex from '@stylexjs/stylex';
	import { label } from '$lib/ui/label/label.style';

	let { children, ...rest }: HTMLLabelAttributes & { children?: Snippet } = $props();
</script>

<label {...rest} {...stylex.attrs(label.root)}>
	{@render children?.()}
</label>
