<script lang="ts">
	import { INSPECTOR_URL } from '$lib/inspector';
	import CodeBlock from '$lib/ui/code-block/code-block.svelte';
	import ParamTabs from '$lib/ui/param-tabs/param-tabs.svelte';
	import { statusTone } from '$lib/ui/shared/http/status';
	import { chrome } from '$lib/ui/shared/shell/chrome.style';
	import { detail } from '$lib/ui/shared/shell/detail.style';
	import { logs as logStyles } from '$lib/ui/shared/shell/logs.style';
	import { textLink } from '$lib/ui/shared/text-link.style';
	import { relativeTime } from '$lib/ui/shared/time/relative';
	import * as stylex from '@stylexjs/stylex';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const log = $derived(data.log);
	const tone = $derived(statusTone(log.status));

	let now = $state<number | null>(null);
	const when = $derived(now === null ? log.at : relativeTime(log.at, now));

	$effect(() => {
		now = Date.now();
		const timer = setInterval(() => {
			now = Date.now();
		}, 15_000);

		return () => clearInterval(timer);
	});
</script>

<svelte:head>
	<title>{log.method} {log.path}</title>
</svelte:head>

<a href={INSPECTOR_URL} {...stylex.attrs(textLink.root, chrome.back)}>Back to previous</a>

<h1 {...stylex.attrs(chrome.title)}>
	{log.method}
	<span {...stylex.attrs(detail.titlePath)}> {log.path}</span>
</h1>
<span {...stylex.attrs(chrome.titleMark)} aria-hidden="true"></span>
<p {...stylex.attrs(chrome.detailMeta)}>
	<span
		title="HTTP status"
		aria-label="HTTP status {log.status}"
		{...stylex.attrs(
			detail.hint,
			tone === 'ok' && logStyles.statusOk,
			tone === 'neutral' && logStyles.statusNeutral,
			tone === 'error' && logStyles.statusError
		)}>{log.status}</span
	>
	·
	<span title="Time to respond" aria-label="Time to respond {log.duration} milliseconds" {...stylex.attrs(detail.hint)}
		>{log.duration}ms</span
	>
	·
	<span title="Requested at {log.at}" aria-label="Requested at {log.at}" {...stylex.attrs(detail.hint)}>{when}</span>
</p>

<div {...stylex.attrs(chrome.section)}>
	{#key log.id}
		<ParamTabs params={log.params} query={log.queries} />
	{/key}
</div>
<div {...stylex.attrs(chrome.section)}>
	<CodeBlock title="Request headers" block={data.json.requestHeaders} />
</div>
<div {...stylex.attrs(chrome.section)}>
	<CodeBlock title="Request body" block={data.json.requestBody} />
</div>
<div {...stylex.attrs(chrome.section)}>
	<CodeBlock title="Response headers" block={data.json.responseHeaders} />
</div>
<div {...stylex.attrs(chrome.section)}>
	<CodeBlock title="Response body" block={data.json.responseBody} />
</div>
