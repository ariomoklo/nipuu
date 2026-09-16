<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLSelectAttributes } from 'svelte/elements';
	import * as stylex from '@stylexjs/stylex';
	import Icon from '$lib/ui/icon/icon.svelte';
	import { select } from '$lib/ui/input/select/select.style';
	import { field } from '$lib/ui/shared/field.style';

	let { children, ...rest }: HTMLSelectAttributes & { children?: Snippet } = $props();
</script>

<span {...stylex.attrs(field.root)}>
	<select {...rest} {...stylex.attrs(select.root)}>
		{@render children?.()}
	</select>
	<span aria-hidden="true" {...stylex.attrs(field.marker)}>
		<Icon name="chevronDown" />
	</span>
</span>
