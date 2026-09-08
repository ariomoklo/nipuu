<script lang="ts">
	import { INSPECTOR_URL } from '$lib/inspector';
	import type { LogEntry } from '$lib/types';

	let { data } = $props();
	let polled = $state<LogEntry[] | null>(null);
	let selectedId = $state<string | null>(null);
	const logs = $derived(polled ?? data.logs);

	$effect(() => {
		const timer = setInterval(async () => {
			try {
				const response = await fetch('/_nipuu/logs');
				if (!response.ok) return;
				const payload = (await response.json()) as { logs: LogEntry[] };
				polled = payload.logs;
			} catch {
				// ignore poll errors
			}
		}, 1000);

		return () => clearInterval(timer);
	});

	const selected = $derived(logs.find((entry) => entry.id === selectedId) ?? null);

	function select(id: string) {
		selectedId = id;
	}

	function pretty(value: unknown) {
		return JSON.stringify(value, null, 2);
	}
</script>

<svelte:head>
	<title>Nipuu Inspector</title>
</svelte:head>

<h1>Nipuu Inspector</h1>

<p><a href="{INSPECTOR_URL}/tables">Tables</a></p>

{#if logs.length === 0}
	<p>No requests yet.</p>
{:else}
	<section>
		<h2>Requests</h2>
		<ul>
			{#each logs as entry (entry.id)}
				<li>
					<button type="button" onclick={() => select(entry.id)}>
						{entry.method} {entry.path} — {entry.status} ({entry.duration}ms)
					</button>
				</li>
			{/each}
		</ul>
	</section>
{/if}

{#if selected}
	<section>
		<h2>Detail</h2>
		<p>Status: {selected.status}</p>
		<p>Duration: {selected.duration}ms</p>
		<p>Time: {selected.at}</p>
		<h3>Params</h3>
		<pre>{pretty(selected.params)}</pre>
		<h3>Query</h3>
		<pre>{pretty(selected.queries)}</pre>
		<h3>Request headers</h3>
		<pre>{pretty(selected.requestHeaders)}</pre>
		<h3>Request body</h3>
		<pre>{pretty(selected.requestBody)}</pre>
		<h3>Response headers</h3>
		<pre>{pretty(selected.responseHeaders)}</pre>
		<h3>Response body</h3>
		<pre>{pretty(selected.responseBody)}</pre>
	</section>
{/if}
