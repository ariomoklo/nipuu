<script lang="ts">
	import { INSPECTOR_URL } from '$lib/inspector';
	import Button from '$lib/ui/button/button.svelte';
	import FieldControl from '$lib/ui/input/field-control/field-control.svelte';
	import Label from '$lib/ui/label/label.svelte';
	import { chrome } from '$lib/ui/shared/shell/chrome.style';
	import { editor } from '$lib/ui/shared/shell/editor.style';
	import { textLink } from '$lib/ui/shared/text-link.style';
	import * as stylex from '@stylexjs/stylex';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const editableFields = $derived(data.fields.filter((field) => !field.autoId));
</script>

<svelte:head>
	<title>New {data.name} row</title>
</svelte:head>

<a href="{INSPECTOR_URL}/tables/{data.name}" {...stylex.attrs(textLink.root, chrome.back)}>
	Back to {data.name}
</a>

<h1 {...stylex.attrs(chrome.title)}>New row</h1>
<span {...stylex.attrs(chrome.titleMark)} aria-hidden="true"></span>
<p {...stylex.attrs(chrome.detailMeta)}>{data.name}</p>

{#if form?.errors && form.errors.length > 0}
	<ul {...stylex.attrs(editor.errorList)}>
		{#each form.errors as error (error)}
			<li>{error}</li>
		{/each}
	</ul>
{/if}

<div {...stylex.attrs(editor.root)}>
	<form method="POST" {...stylex.attrs(editor.form)}>
		<div {...stylex.attrs(editor.grid)}>
			{#each editableFields as field (field.name)}
				<Label>
					{field.name}
					<FieldControl
						{field}
						blank={field.type === 'boolean' ? '(default)' : null}
						options={data.relations[field.name]}
					/>
				</Label>
			{/each}
		</div>
		<Button type="submit">Create</Button>
	</form>
</div>
