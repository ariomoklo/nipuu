<script lang="ts">
	import { INSPECTOR_URL } from '$lib/inspector';
	import Button from '$lib/ui/button/button.svelte';
	import FieldControl from '$lib/ui/input/field-control/field-control.svelte';
	import Label from '$lib/ui/label/label.svelte';
	import { fieldValue } from '$lib/ui/shared/row/value';
	import { chrome } from '$lib/ui/shared/shell/chrome.style';
	import { editor } from '$lib/ui/shared/shell/editor.style';
	import { textLink } from '$lib/ui/shared/text-link.style';
	import * as stylex from '@stylexjs/stylex';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const identityFields = $derived(data.fields.filter((field) => field.identity));
	const editableFields = $derived(data.fields.filter((field) => !field.autoId));
	const rowLabel = $derived(identityFields.map((field) => fieldValue(data.row, field)).join(' '));
</script>

<svelte:head>
	<title>Edit {data.name} row</title>
</svelte:head>

<a href="{INSPECTOR_URL}/tables/{data.name}" {...stylex.attrs(textLink.root, chrome.back)}>
	Back to {data.name}
</a>

<h1 {...stylex.attrs(chrome.title)}>Edit row</h1>
<span {...stylex.attrs(chrome.titleMark)} aria-hidden="true"></span>
<p {...stylex.attrs(chrome.detailMeta)}>{data.name} ・ {rowLabel}</p>

{#if form?.errors && form.errors.length > 0}
	<ul {...stylex.attrs(editor.errorList)}>
		{#each form.errors as error (error)}
			<li>{error}</li>
		{/each}
	</ul>
{/if}

<div {...stylex.attrs(editor.root)}>
	<form method="POST" {...stylex.attrs(editor.form)}>
		{#each identityFields as field (field.name)}
			<input type="hidden" name={field.name} value={fieldValue(data.row, field)} />
		{/each}
		<div {...stylex.attrs(editor.grid)}>
			{#each editableFields as field (field.name)}
				<Label>
					{field.name}
					<FieldControl
						{field}
						value={fieldValue(data.row, field)}
						options={data.relations[field.name]}
					/>
				</Label>
			{/each}
		</div>
		<Button type="submit">Save</Button>
	</form>
</div>
