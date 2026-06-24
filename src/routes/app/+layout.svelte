<script lang="ts">
	import type { LayoutData } from './$types';
	import type { Snippet } from 'svelte';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import '$lib/styles/shopify.css';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	onMount(() => {
		// Hide App Bridge's loading indicator - pages handle their own loading states
		window.shopify?.loading?.(false);

		// Handle App Bridge navigation events for SvelteKit
		const handleNavigate = (event: Event) => {
			const target = event.target as HTMLElement;
			const href = target.getAttribute('href');
			if (href && href.startsWith('/')) {
				event.preventDefault();
				goto(href);
			}
		};

		document.addEventListener('shopify:navigate', handleNavigate);

		return () => {
			document.removeEventListener('shopify:navigate', handleNavigate);
		};
	});
</script>

<svelte:head>
	<meta name="shopify-api-key" content={data.apiKey} />
	<script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>
</svelte:head>

<s-app-nav>
	<s-link href="/app" rel="home">Home</s-link>
	<s-link href="/app/reviews">Reviews</s-link>
	<s-link href="/app/locations">Locations</s-link>
	<s-link href="/app/widget">Widget</s-link>
	<s-link href="/app/review-collection">Review collection</s-link>
	<s-link href="/app/feedback">Feedback</s-link>
</s-app-nav>

<div class="app-frame">
	{@render children()}
</div>
