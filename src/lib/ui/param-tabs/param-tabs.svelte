<script lang="ts">
	import { paramTabs } from '$lib/ui/param-tabs/param-tabs.style';
	import { table as tableStyles } from '$lib/ui/table/table.style';
	import * as stylex from '@stylexjs/stylex';

	type Tab = 'params' | 'query';

	let { params, query }: { params: Record<string, string>; query: Record<string, string> } =
		$props();

	const paramRows = $derived(Object.entries(params));
	const queryRows = $derived(Object.entries(query));
	let picked = $state<Tab | null>(null);
	const tab = $derived(
		picked ?? (paramRows.length === 0 && queryRows.length > 0 ? 'query' : 'params'),
	);

	const rows = $derived(tab === 'params' ? paramRows : queryRows);
	const empty = $derived(
		tab === 'params' ? 'No path params on this request.' : 'No query on this request.',
	);

	function select(next: Tab) {
		picked = next;
	}
</script>

<div {...stylex.attrs(paramTabs.frame)}>
	<div role="tablist" aria-label="Request params" {...stylex.attrs(paramTabs.tablist)}>
		<button
			type="button"
			role="tab"
			id="param-tab-params"
			aria-controls="param-panel"
			aria-selected={tab === 'params'}
			onclick={() => select('params')}
			{...stylex.attrs(paramTabs.tab, tab === 'params' && paramTabs.tabCurrent)}
		>
			Params
		</button>
		<button
			type="button"
			role="tab"
			id="param-tab-query"
			aria-controls="param-panel"
			aria-selected={tab === 'query'}
			onclick={() => select('query')}
			{...stylex.attrs(paramTabs.tab, tab === 'query' && paramTabs.tabCurrent)}
		>
			Query
		</button>
	</div>
	<div
		role="tabpanel"
		id="param-panel"
		aria-labelledby="param-tab-{tab}"
		{...stylex.attrs(paramTabs.panel)}
	>
		{#if rows.length === 0}
			<p {...stylex.attrs(paramTabs.empty)}>{empty}</p>
		{:else}
			<table {...stylex.attrs(tableStyles.root, paramTabs.table)}>
				<thead>
					<tr>
						<th {...stylex.attrs(paramTabs.th, paramTabs.keyCol)}>Key</th>
						<th {...stylex.attrs(paramTabs.th)}>Value</th>
					</tr>
				</thead>
				<tbody>
					{#each rows as [key, value] (key)}
						<tr>
							<td {...stylex.attrs(paramTabs.td, paramTabs.key)}>{key}</td>
							<td {...stylex.attrs(paramTabs.td)}>{value}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</div>
</div>
