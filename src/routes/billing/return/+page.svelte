<script lang="ts">
	import type { PageData } from './$types';
	import { onMount } from 'svelte';

	let { data }: { data: PageData } = $props();

	onMount(() => {
		// We're in the top frame here — send the merchant back into the embedded app.
		window.top!.location.href = data.appUrl;
	});
</script>

<svelte:head>
	<title>Finalizing your subscription…</title>
</svelte:head>

<div class="wrap">
	<p>Finalizing your subscription…</p>
	<p class="muted">
		If you're not redirected, <a href={data.appUrl}>return to the app</a>.
	</p>
</div>

<style>
	.wrap {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 8px;
		min-height: 60vh;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		color: #1a1a1a;
	}
	.muted {
		color: #6b7280;
		font-size: 14px;
	}
</style>
