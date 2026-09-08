<script lang="ts">
	import { INSPECTOR_URL } from '$lib/inspector';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>Tables</title>
</svelte:head>

<h1>Tables</h1>

<p><a href={INSPECTOR_URL}>Inspector</a></p>

{#if data.tables.length === 0}
	<p>No tables.</p>
{:else}
	<ul>
		{#each data.tables as name (name)}
			<li><a href="{INSPECTOR_URL}/tables/{name}">{name}</a></li>
		{/each}
	</ul>
{/if}
