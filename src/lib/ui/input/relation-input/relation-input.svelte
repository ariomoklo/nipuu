<script lang="ts">
	import { untrack } from 'svelte';
	import * as stylex from '@stylexjs/stylex';
	import Icon from '$lib/ui/icon/icon.svelte';
	import { input } from '$lib/ui/input/input/input.style';
	import { combobox } from '$lib/ui/input/relation-input/relation-input.style';
	import { field } from '$lib/ui/shared/field.style';
	import type { TableRelationOption } from '$lib/types/table';

	let {
		name,
		value = '',
		options,
		placeholder,
	}: {
		name: string;
		value?: string;
		options: TableRelationOption[];
		placeholder?: string;
	} = $props();

	const listId = $props.id();

	function textFor(current: string) {
		const option = options.find((candidate) => candidate.value === current);
		return option?.label ?? current;
	}

	let root: HTMLElement;
	let control: HTMLInputElement;
	let list = $state<HTMLElement>();
	let text = $state(untrack(() => textFor(value)));
	let open = $state(false);
	let narrowing = $state(false);
	let wanted = $state(0);

	const matches = $derived.by(() => {
		const search = text.trim().toLowerCase();
		if (!narrowing || search === '') return options;
		return options.filter(
			(option) =>
				option.value.toLowerCase().includes(search) ||
				(option.label?.toLowerCase().includes(search) ?? false),
		);
	});

	const active = $derived(Math.min(wanted, matches.length - 1));

	/** The visible input may hold a label, so the field posts the value behind it. */
	const posted = $derived.by(() => {
		const search = text.trim().toLowerCase();
		const exact = options.find(
			(option) => option.value.toLowerCase() === search || option.label?.toLowerCase() === search,
		);
		return exact?.value ?? text;
	});

	// The list scrolls, so keep the option the keyboard is on in view.
	$effect(() => {
		if (!open) return;
		list?.children[active]?.scrollIntoView({ block: 'nearest' });
	});

	function show(narrow: boolean) {
		open = true;
		narrowing = narrow;
		const current = options.findIndex((option) => option.value === posted);
		wanted = narrow || current < 0 ? 0 : current;
	}

	function choose(option: TableRelationOption) {
		text = option.label ?? option.value;
		open = false;
		narrowing = false;
		control.focus();
	}

	function toggle() {
		if (open) {
			open = false;
			return;
		}

		show(false);
		control.focus();
	}

	/** The surrounding `<label>` would forward a click on an option back to the input. */
	function onpick(event: MouseEvent, option: TableRelationOption) {
		event.stopPropagation();
		choose(option);
	}

	function onkeydown(event: KeyboardEvent) {
		if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
			event.preventDefault();
			if (!open) return show(false);
			wanted = Math.min(
				Math.max(active + (event.key === 'ArrowDown' ? 1 : -1), 0),
				matches.length - 1,
			);
			return;
		}

		if (event.key === 'Enter' && open && matches[active]) {
			event.preventDefault();
			choose(matches[active]);
			return;
		}

		// Closing the list must not also close the filter sheet around it.
		if (event.key === 'Escape' && open) {
			event.preventDefault();
			event.stopPropagation();
			open = false;
		}
	}

	function onfocusout(event: FocusEvent) {
		const next = event.relatedTarget;
		if (next instanceof Node && root.contains(next)) return;
		open = false;
		narrowing = false;
	}
</script>

<span bind:this={root} {onfocusout} {...stylex.attrs(field.root)}>
	<input type="hidden" {name} value={posted} />
	<input
		bind:this={control}
		bind:value={text}
		type="text"
		role="combobox"
		aria-expanded={open && matches.length > 0}
		aria-controls={listId}
		aria-autocomplete="list"
		aria-activedescendant={open && matches[active] ? `${listId}-${active}` : undefined}
		autocomplete="off"
		spellcheck="false"
		{placeholder}
		oninput={() => show(true)}
		onclick={() => show(false)}
		{onkeydown}
		{...stylex.attrs(input.root, combobox.input)}
	/>
	<button
		type="button"
		tabindex="-1"
		aria-hidden="true"
		onclick={toggle}
		{...stylex.attrs(field.marker, field.toggle)}
	>
		<Icon name="chevronDown" />
	</button>
	{#if open}
		{#if matches.length > 0}
			<ul
				bind:this={list}
				id={listId}
				role="listbox"
				onmousedown={(event) => event.preventDefault()}
				{...stylex.attrs(combobox.listbox)}
			>
				{#each matches as option, index (option.value)}
					<li
						id="{listId}-{index}"
						role="option"
						aria-selected={index === active}
						title={option.value}
						onclick={(event) => onpick(event, option)}
						{...stylex.attrs(combobox.option, index === active && combobox.optionActive)}
					>
						<span {...stylex.attrs(combobox.optionLabel)}>{option.label ?? option.value}</span>
						{#if option.label}
							<span {...stylex.attrs(combobox.optionValue)}>{option.value}</span>
						{/if}
					</li>
				{/each}
			</ul>
		{:else}
			<p {...stylex.attrs(combobox.listbox, combobox.empty)}>No match</p>
		{/if}
	{/if}
</span>
