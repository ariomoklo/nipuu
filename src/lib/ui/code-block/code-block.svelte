<script lang="ts">
	import Button from '$lib/ui/button/button.svelte';
	import type { HighlightBlock } from '$lib/ui/shared/shiki/highlight';
	import { code } from '$lib/ui/code-block/code-block.style';
	import * as stylex from '@stylexjs/stylex';

	let { block, title }: { block: HighlightBlock; title: string } = $props();
	const source = $derived(block.source);
	const lines = $derived(block.lines);
	const digits = $derived(String(lines.length).length);

	let copied = $state(false);
	let timer: ReturnType<typeof setTimeout> | undefined;

	$effect(() => {
		return () => clearTimeout(timer);
	});

	async function copy() {
		try {
			await navigator.clipboard.writeText(source);
			copied = true;
			clearTimeout(timer);
			timer = setTimeout(() => {
				copied = false;
			}, 1500);
		} catch {
			copied = false;
		}
	}
</script>

<div {...stylex.attrs(code.frame)}>
	<div {...stylex.attrs(code.header)}>
		<h2 {...stylex.attrs(code.title)}>{title}</h2>
		<Button type="button" variant="ghost" onclick={copy} aria-live="polite">
			{copied ? 'Copied' : 'Copy'}
		</Button>
	</div>
	<div {...stylex.attrs(code.body)}>
		{#each lines as line, index (`${index}:${line.map((token) => token.text).join('')}`)}
			<span {...stylex.attrs(code.gutter)} aria-hidden="true">{String(index + 1).padStart(digits, ' ')}</span>
			<pre {...stylex.attrs(code.line)}>{#each line as token, tokenIndex (`${tokenIndex}:${token.text}`)}<span
					style:--shiki-light={token.light}
					style:--shiki-dark={token.dark}
					{...stylex.attrs(code.token)}>{token.text}</span
				>{/each}</pre>
		{/each}
	</div>
</div>
