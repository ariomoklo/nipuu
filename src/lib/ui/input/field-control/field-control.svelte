<script lang="ts">
	import Input from '$lib/ui/input/input/input.svelte';
	import RelationInput from '$lib/ui/input/relation-input/relation-input.svelte';
	import Select from '$lib/ui/input/select/select.svelte';
	import type { TableFieldMeta, TableRelationOption } from '$lib/types/table';

	let {
		field,
		value = '',
		blank = null,
		options = [],
	}: {
		field: TableFieldMeta;
		value?: string;
		blank?: string | null;
		options?: TableRelationOption[];
	} = $props();
</script>

{#if field.rel && options.length > 0}
	<RelationInput name={field.name} {value} {options} placeholder="Search {field.rel.table}" />
{:else if field.type === 'boolean'}
	<Select name={field.name} {value}>
		{#if blank !== null}
			<option value="">{blank}</option>
		{/if}
		<option value="true">true</option>
		<option value="false">false</option>
	</Select>
{:else if field.type === 'enum'}
	<Select name={field.name} {value}>
		{#if blank !== null}
			<option value="">{blank}</option>
		{/if}
		{#each field.enum ?? [] as option (option)}
			<option value={option}>{option}</option>
		{/each}
	</Select>
{:else if field.type === 'number' || field.type === 'id.index'}
	<Input type="number" name={field.name} {value} />
{:else}
	<Input type="text" name={field.name} {value} />
{/if}
