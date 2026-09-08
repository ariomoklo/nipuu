<script lang="ts">
	import { INSPECTOR_URL } from '$lib/inspector';
	import type { TableFieldMeta } from '$lib/types/table';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const pageCount = $derived(Math.max(1, Math.ceil(data.total / data.limit)));

	function cellText(value: unknown): string {
		if (value == null) return '';
		if (typeof value === 'object') return JSON.stringify(value);
		return String(value);
	}

	function fieldValue(row: Record<string, unknown>, field: TableFieldMeta): string {
		const cell = row[field.name];
		if (field.rel && cell !== null && typeof cell === 'object') {
			const related = (cell as Record<string, unknown>)[field.rel.field];
			if (typeof related === 'boolean') return related ? 'true' : 'false';
			if (related == null) return '';
			return String(related);
		}
		if (typeof cell === 'boolean') return cell ? 'true' : 'false';
		if (cell == null) return '';
		return String(cell);
	}

	function rowKey(row: Record<string, unknown>): string {
		const identity = data.fields.filter((field) => field.identity);
		if (identity.length === 0) return JSON.stringify(row);
		return identity.map((field) => fieldValue(row, field)).join('|');
	}

	function pageHref(page: number): string {
		const params = new URLSearchParams();
		params.set('q', data.q);
		params.set('limit', String(data.limit));
		params.set('page', String(page));
		for (const [key, value] of Object.entries(data.values)) {
			params.set(key, value);
		}
		for (const [key, value] of Object.entries(data.operators)) {
			params.set(`${key}.by`, value);
		}
		return `${INSPECTOR_URL}/tables/${data.name}?${params}`;
	}
</script>

<svelte:head>
	<title>{data.name}</title>
</svelte:head>

<h1>{data.name}</h1>

<p>
	<a href={INSPECTOR_URL}>Inspector</a>
	<a href="{INSPECTOR_URL}/tables">Tables</a>
</p>

{#if form?.errors && form.errors.length > 0}
	<ul>
		{#each form.errors as error (error)}
			<li>{error}</li>
		{/each}
	</ul>
{/if}

<form method="GET">
	<p>
		<label>
			Query
			<input name="q" value={data.q} />
		</label>
	</p>
	<input type="hidden" name="limit" value={String(data.limit)} />
	{#each data.fields as field (field.name)}
		<p>
			<label>
				{field.name}
				<select name={`${field.name}.by`} value={data.operators[field.name] ?? 'eq'}>
					{#each field.operators as operator (operator)}
						<option value={operator}>{operator}</option>
					{/each}
				</select>
			</label>
			{#if field.type === 'boolean'}
				<select name={field.name} value={data.values[field.name] ?? ''}>
					<option value="">(any)</option>
					<option value="true">true</option>
					<option value="false">false</option>
				</select>
			{:else if field.type === 'enum'}
				<select name={field.name} value={data.values[field.name] ?? ''}>
					<option value=""></option>
					{#each field.enum ?? [] as option (option)}
						<option value={option}>{option}</option>
					{/each}
				</select>
			{:else if field.type === 'number' || field.type === 'id.index'}
				<input type="number" name={field.name} value={data.values[field.name] ?? ''} />
			{:else}
				<input type="text" name={field.name} value={data.values[field.name] ?? ''} />
			{/if}
		</p>
	{/each}
	<button type="submit">Apply</button>
</form>

<p>
	{#if data.page > 1}
		<a href={pageHref(data.page - 1)}>Previous</a>
	{/if}
	Page {data.page} of {pageCount} ({data.total} rows)
	{#if data.page * data.limit < data.total}
		<a href={pageHref(data.page + 1)}>Next</a>
	{/if}
</p>

<table>
	<thead>
		<tr>
			{#each data.fields as field (field.name)}
				<th>{field.name}</th>
			{/each}
			<th>Actions</th>
		</tr>
	</thead>
	<tbody>
		{#each data.rows as row (rowKey(row))}
			<tr>
				{#each data.fields as field (field.name)}
					<td>{cellText(row[field.name])}</td>
				{/each}
				<td>
					<form method="POST" action="?/update">
						{#each data.fields as field (field.name)}
							{#if field.identity}
								<input type="hidden" name={field.name} value={fieldValue(row, field)} />
							{/if}
						{/each}
						{#each data.fields as field (field.name)}
							{#if !field.autoId}
								<label>
									{field.name}
									{#if field.type === 'boolean'}
										<select name={field.name} value={fieldValue(row, field)}>
											<option value="true">true</option>
											<option value="false">false</option>
										</select>
									{:else if field.type === 'enum'}
										<select name={field.name} value={fieldValue(row, field)}>
											{#each field.enum ?? [] as option (option)}
												<option value={option}>{option}</option>
											{/each}
										</select>
									{:else if field.type === 'number' || field.type === 'id.index'}
										<input type="number" name={field.name} value={fieldValue(row, field)} />
									{:else}
										<input type="text" name={field.name} value={fieldValue(row, field)} />
									{/if}
								</label>
							{/if}
						{/each}
						<button type="submit">Save</button>
					</form>
					<form method="POST" action="?/delete">
						{#each data.fields as field (field.name)}
							{#if field.identity}
								<input type="hidden" name={field.name} value={fieldValue(row, field)} />
							{/if}
						{/each}
						<button type="submit">Delete</button>
					</form>
				</td>
			</tr>
		{/each}
	</tbody>
</table>

<form method="POST" action="?/create">
	{#each data.fields as field (field.name)}
		{#if !field.autoId}
			<p>
				<label>
					{field.name}
					{#if field.type === 'boolean'}
						<select name={field.name} value="">
							<option value="">(default)</option>
							<option value="true">true</option>
							<option value="false">false</option>
						</select>
					{:else if field.type === 'enum'}
						<select name={field.name}>
							{#each field.enum ?? [] as option (option)}
								<option value={option}>{option}</option>
							{/each}
						</select>
					{:else if field.type === 'number' || field.type === 'id.index'}
						<input type="number" name={field.name} />
					{:else}
						<input type="text" name={field.name} />
					{/if}
				</label>
			</p>
		{/if}
	{/each}
	<button type="submit">Create</button>
</form>
