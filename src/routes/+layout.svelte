<script lang="ts">
	import '@fontsource-variable/bricolage-grotesque/wght.css';
	import '@fontsource/ibm-plex-mono/400.css';
	import '@fontsource/source-sans-3/400.css';
	import '@fontsource/source-sans-3/600.css';
	import favicon from '$lib/assets/favicon.svg';
	import '$lib/ui/shared/reset.css';

	let { children } = $props();

	$effect(() => {
		if (!import.meta.env.DEV) return;
		void import('virtual:stylex:runtime');
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	{#if import.meta.env.DEV}
		<link rel="stylesheet" href="/virtual:stylex.css" />
	{/if}
</svelte:head>

{@render children()}
