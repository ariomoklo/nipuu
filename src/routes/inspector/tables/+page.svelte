<script lang="ts">
	import { INSPECTOR_URL } from '$lib/inspector';
	import { chrome } from '$lib/ui/shared/shell/chrome.style';
	import { tables } from '$lib/ui/shared/shell/tables.style';
	import * as stylex from '@stylexjs/stylex';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>Tables</title>
</svelte:head>

<h1 {...stylex.attrs(chrome.title)}>Models</h1>
<span {...stylex.attrs(chrome.titleMark)} aria-hidden="true"></span>

{#if data.tables.length === 0}
	<p {...stylex.attrs(chrome.empty)}>No tables. Seed a MODEL to browse rows.</p>
{:else}
	<ul {...stylex.attrs(tables.list)}>
		{#each data.tables as table (table.name)}
			{@const meta = [
				`${table.rowCount} ${table.rowCount === 1 ? 'row' : 'rows'}`,
				`${table.propertyCount} ${table.propertyCount === 1 ? 'property' : 'properties'}`,
				table.relatedModels.length > 0
					? `Related: ${table.relatedModels.join(', ')}`
					: 'No relationships',
			].join(' ・ ')}
			<li>
				<a href="{INSPECTOR_URL}/tables/{table.name}" {...stylex.attrs(tables.modelCard)}>
					<h2 {...stylex.attrs(tables.name)}>{table.name}</h2>
					<span {...stylex.attrs(tables.meta)}>{meta}</span>
				</a>
			</li>
		{/each}
	</ul>
{/if}
