<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	import * as stylex from '@stylexjs/stylex';
	import { input } from '$lib/ui/input/input/input.style';

	let { ...rest }: HTMLInputAttributes = $props();
</script>

<input {...rest} {...stylex.attrs(input.root)} />
