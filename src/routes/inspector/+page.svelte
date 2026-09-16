<script lang="ts">
	import { INSPECTOR_URL } from '$lib/inspector';
	import type { LogEntry } from '$lib/types';
	import { statusTone } from '$lib/ui/shared/http/status';
	import { chrome } from '$lib/ui/shared/shell/chrome.style';
	import { logs as logStyles } from '$lib/ui/shared/shell/logs.style';
	import * as stylex from '@stylexjs/stylex';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let polled = $state.raw<LogEntry[] | null>(null);
	const logs = $derived(polled ?? data.logs);

	$effect(() => {
		const timer = setInterval(async () => {
			try {
				const response = await fetch(`${INSPECTOR_URL}/logs`);
				if (!response.ok) return;
				const payload = (await response.json()) as { logs: LogEntry[] };
				polled = payload.logs;
			} catch {
				// ignore poll errors
			}
		}, 1000);

		return () => clearInterval(timer);
	});
</script>

<svelte:head>
	<title>Nipuu Inspector</title>
</svelte:head>

<h1 {...stylex.attrs(chrome.title)}>Requests</h1>
<span {...stylex.attrs(chrome.titleMark)} aria-hidden="true"></span>

{#if logs.length === 0}
	<p {...stylex.attrs(chrome.empty)}>No requests yet. Call a mock route to see it here.</p>
{:else}
	<ul {...stylex.attrs(logStyles.list)}>
		{#each logs as entry (entry.id)}
			{@const tone = statusTone(entry.status)}
			<li>
				<a href="{INSPECTOR_URL}/requests/{entry.id}" {...stylex.attrs(logStyles.row)}>
					<span {...stylex.attrs(logStyles.method)}>{entry.method}</span>
					<span {...stylex.attrs(logStyles.path)}>{entry.path}</span>
					<span
						title="HTTP status"
						{...stylex.attrs(
							logStyles.status,
							tone === 'ok' && logStyles.statusOk,
							tone === 'neutral' && logStyles.statusNeutral,
							tone === 'error' && logStyles.statusError
						)}>{entry.status}</span
					>
					<span title="Time to respond" {...stylex.attrs(logStyles.meta)}>{entry.duration}ms</span>
				</a>
			</li>
		{/each}
	</ul>
{/if}
