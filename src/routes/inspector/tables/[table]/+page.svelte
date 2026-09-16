<script lang="ts">
	import { goto } from '$app/navigation';
	import { INSPECTOR_URL } from '$lib/inspector';
	import Button from '$lib/ui/button/button.svelte';
	import Icon from '$lib/ui/icon/icon.svelte';
	import FieldControl from '$lib/ui/input/field-control/field-control.svelte';
	import Input from '$lib/ui/input/input/input.svelte';
	import Select from '$lib/ui/input/select/select.svelte';
	import Label from '$lib/ui/label/label.svelte';
	import { iconButton } from '$lib/ui/shared/icon-button.style';
	import { cellText, cellTitle, fieldValue, rowIdentity } from '$lib/ui/shared/row/value';
	import { browser } from '$lib/ui/shared/shell/browser.style';
	import { chrome } from '$lib/ui/shared/shell/chrome.style';
	import { editor } from '$lib/ui/shared/shell/editor.style';
	import { sheet as sheetStyles } from '$lib/ui/shared/sheet.style';
	import { textLink } from '$lib/ui/shared/text-link.style';
	import { table as tableStyles } from '$lib/ui/table/table.style';
	import Table from '$lib/ui/table/table.svelte';
	import * as stylex from '@stylexjs/stylex';
	import { untrack } from 'svelte';
	import type { PageProps } from './$types';

	const SEARCH_DELAY = 250;

	let { data, form }: PageProps = $props();

	// Draft term: search navigations are replaced, so the field owns the value.
	let search = $state(untrack(() => data.q));
	let sheet: HTMLDialogElement;
	let trigger: HTMLButtonElement;
	let timer: ReturnType<typeof setTimeout> | undefined;

	const pageCount = $derived(Math.max(1, Math.ceil(data.total / data.limit)));
	const identityFields = $derived(data.fields.filter((field) => field.identity));
	const activeFilters = $derived(Object.keys(data.values).length);

	$effect(() => () => clearTimeout(timer));

	function rowKey(row: Record<string, unknown>): string {
		if (identityFields.length === 0) return JSON.stringify(row);
		return identityFields.map((field) => fieldValue(row, field)).join('|');
	}

	function editHref(row: Record<string, unknown>): string {
		const params = new URLSearchParams(rowIdentity(row, data.fields));
		return `${INSPECTOR_URL}/tables/${data.name}/edit?${params}`;
	}

	/** Current filters and page size, so search and pagination keep them. */
	function tableHref(term: string, page = 1): string {
		const params = new URLSearchParams();
		if (term) params.set('q', term);
		params.set('limit', String(data.limit));
		if (page > 1) params.set('page', String(page));
		for (const [key, value] of Object.entries(data.values)) {
			params.set(key, value);
		}

		for (const [key, value] of Object.entries(data.operators)) {
			params.set(`${key}.by`, value);
		}

		return `${INSPECTOR_URL}/tables/${data.name}?${params}`;
	}

	function onSearch(event: Event & { currentTarget: HTMLInputElement }) {
		search = event.currentTarget.value;
		clearTimeout(timer);
		timer = setTimeout(() => {
			void goto(tableHref(search), { keepFocus: true, noScroll: true, replaceState: true });
		}, SEARCH_DELAY);
	}

	/** Submit the sheet without the empty fields a native GET would carry. */
	function onFilter(event: SubmitEvent & { currentTarget: HTMLFormElement }) {
		event.preventDefault();
		clearTimeout(timer);

		const fields = new FormData(event.currentTarget);
		const params = new URLSearchParams();
		for (const [key, value] of fields) {
			if (typeof value !== 'string' || value === '') continue;
			if (key.endsWith('.by') && !fields.get(key.slice(0, -'.by'.length))) continue;
			params.set(key, value);
		}

		sheet.close();
		void goto(`${INSPECTOR_URL}/tables/${data.name}?${params}`, { noScroll: true });
	}
</script>

<svelte:head>
	<title>{data.name}</title>
</svelte:head>

<h1 {...stylex.attrs(chrome.title)}>{data.name}</h1>
<span {...stylex.attrs(chrome.titleMark)} aria-hidden="true"></span>
<p {...stylex.attrs(chrome.detailMeta)}>
	{data.total} {data.total === 1 ? 'row' : 'rows'} ・ {data.fields.length} properties ・ Page {data.page}
	of {pageCount}
</p>

{#if form?.errors && form.errors.length > 0}
	<ul {...stylex.attrs(editor.errorList)}>
		{#each form.errors as error (error)}
			<li>{error}</li>
		{/each}
	</ul>
{/if}

<div {...stylex.attrs(browser.toolbar)}>
	<form method="GET" onsubmit={() => clearTimeout(timer)} {...stylex.attrs(browser.searchForm)}>
		<Input
			name="q"
			value={search}
			oninput={onSearch}
			placeholder="Search rows"
			aria-label="Search rows"
		/>
		{#each Object.entries(data.values) as [key, value] (key)}
			<input type="hidden" name={key} {value} />
		{/each}
		{#each Object.entries(data.operators) as [key, value] (key)}
			<input type="hidden" name="{key}.by" {value} />
		{/each}
		<input type="hidden" name="limit" value={String(data.limit)} />
	</form>
	<button
		type="button"
		bind:this={trigger}
		onclick={() => sheet.showModal()}
		aria-haspopup="dialog"
		aria-label={activeFilters > 0 ? `Filter, ${activeFilters} active` : 'Filter'}
		title="Filter"
		{...stylex.attrs(iconButton.base, activeFilters > 0 && iconButton.active)}
	>
		<Icon name="funnel" size={18} />
	</button>
</div>

<div {...stylex.attrs(chrome.section)}>
	<Table>
		<thead>
			<tr>
				{#each data.fields as field (field.name)}
					<th {...stylex.attrs(tableStyles.th)}>{field.name}</th>
				{/each}
				<th {...stylex.attrs(tableStyles.th, browser.cellActions)}>Actions</th>
			</tr>
		</thead>
		<tbody>
			{#each data.rows as row (rowKey(row))}
				{@const label = identityFields.map((field) => fieldValue(row, field)).join(' ')}
				<tr>
					{#each data.fields as field (field.name)}
						{@const text = cellText(row, field)}
						<td
							{...stylex.attrs(
								tableStyles.td,
								field.identity && browser.cellStrong,
								text === '—' && browser.cellEmpty
							)}
						>
							<span {...stylex.attrs(browser.cellText)} title={cellTitle(row, field)}>{text}</span>
						</td>
					{/each}
					<td {...stylex.attrs(tableStyles.td, browser.cellActions)}>
						<div {...stylex.attrs(browser.rowActions)}>
							<a
								href={editHref(row)}
								title="Edit"
								aria-label={`Edit ${label}`}
								{...stylex.attrs(iconButton.base)}
							>
								<Icon name="pencil" />
							</a>
							<form method="POST" action="?/delete">
								{#each identityFields as field (field.name)}
									<input type="hidden" name={field.name} value={fieldValue(row, field)} />
								{/each}
								<button
									type="submit"
									title="Delete"
									aria-label={`Delete ${label}`}
									{...stylex.attrs(iconButton.base, iconButton.danger)}
								>
									<Icon name="trash" />
								</button>
							</form>
						</div>
					</td>
				</tr>
			{:else}
				<tr>
					<td colspan={data.fields.length + 1} {...stylex.attrs(tableStyles.td, browser.cellEmpty)}>
						No rows match this filter. Widen the filter or add a row.
					</td>
				</tr>
			{/each}
		</tbody>
		<tfoot>
			<tr>
				<td colspan={data.fields.length + 1} {...stylex.attrs(tableStyles.td, browser.newRowCell)}>
					<a href="{INSPECTOR_URL}/tables/{data.name}/new" {...stylex.attrs(browser.newRow)}>
						<Icon name="plus" />
						New row
					</a>
				</td>
			</tr>
		</tfoot>
	</Table>
</div>

{#if pageCount > 1}
	<nav aria-label="Pagination" {...stylex.attrs(browser.pager)}>
		{#if data.page > 1}
			<a href={tableHref(search, data.page - 1)} {...stylex.attrs(textLink.root)}>Previous</a>
		{/if}
		{#if data.page * data.limit < data.total}
			<a href={tableHref(search, data.page + 1)} {...stylex.attrs(textLink.root)}>Next</a>
		{/if}
	</nav>
{/if}

<dialog
	bind:this={sheet}
	onclose={() => trigger.focus()}
	onclick={(event) => {
		if (event.target === sheet) sheet.close();
	}}
	{...stylex.attrs(sheetStyles.root)}
>
	<form method="GET" onsubmit={onFilter} {...stylex.attrs(sheetStyles.form)}>
		<div {...stylex.attrs(sheetStyles.header)}>
			<h2 {...stylex.attrs(sheetStyles.title)}>Filter</h2>
			<button
				type="button"
				onclick={() => sheet.close()}
				aria-label="Close filter"
				title="Close"
				{...stylex.attrs(iconButton.base)}
			>
				<Icon name="close" size={18} />
			</button>
		</div>
		<div {...stylex.attrs(sheetStyles.body)}>
			<div {...stylex.attrs(browser.filterGrid)}>
				{#each data.fields as field (field.name)}
					<Label>
						{field.name}
						<div {...stylex.attrs(browser.filterPair)}>
							<Select
								name={`${field.name}.by`}
								value={data.operators[field.name] ?? 'eq'}
								aria-label={`${field.name} comparison`}
							>
								{#each field.operators as operator (operator)}
									<option value={operator}>{operator}</option>
								{/each}
							</Select>
							<FieldControl
								{field}
								value={data.values[field.name] ?? ''}
								blank={field.type === 'boolean' ? '(any)' : ''}
								options={data.relations[field.name]}
							/>
						</div>
					</Label>
				{/each}
			</div>
		</div>
		<div {...stylex.attrs(sheetStyles.footer)}>
			<input type="hidden" name="q" value={search} />
			<input type="hidden" name="limit" value={String(data.limit)} />
			<Button type="submit">Apply</Button>
		</div>
	</form>
</dialog>
