<script lang="ts">
	import type { LayoutData } from './$types';
	import type { Snippet } from 'svelte';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { Banner, Button } from '$lib/components';
	import '$lib/styles/shopify.css';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	const isFree = $derived(data.plan === 'free');
	const overLimit = $derived(isFree && data.usage?.overLimit);
	// Hold the informational Free-plan banner until the merchant has onboarded
	// (connected a location) so it doesn't greet a brand-new / mid-setup shop.
	const showFreeBanner = $derived(isFree && data.hasLocation);

	function upgrade() {
		goto('/app/pricing');
	}

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
	<s-link href="/app/feedback">Feedback</s-link>
	<s-link href="/app/widget">Widget</s-link>
	<s-link href="/app/settings">Settings</s-link>
	<s-link href="/app/support">Support</s-link>
	<s-link href="/app/pricing">{isFree ? 'Upgrade' : 'Plan'}</s-link>
	{#if data.dev}
		<s-link href="/app/debug">Debug</s-link>
	{/if}
</s-app-nav>

<div class="app-frame">
	{#if overLimit}
		<div class="plan-banner">
			<Banner title="You've hit your free review request limit" tone="critical">
				Your store has sent all {data.usage.cap} free post-order review emails this month. New requests
				are paused until next month — upgrade to Premium to keep collecting reviews.
				{#snippet actions()}
					<Button variant="primary" onclick={upgrade}>Upgrade to Premium</Button>
				{/snippet}
			</Banner>
		</div>
	{:else if showFreeBanner}
		<div class="plan-banner">
			<Banner title="You're on the Free plan" tone="info">
				Free includes {data.usage.cap} review request emails/month and up to 10 displayed reviews. You've
				used {data.usage.emailsSent}/{data.usage.cap} this month.
				{#snippet actions()}
					<Button variant="primary" onclick={upgrade}>See Premium</Button>
				{/snippet}
			</Banner>
		</div>
	{/if}
	{@render children()}
</div>

<style>
	/* Match the inset/centering of `.page` (max-width 1000px, side padding) so the
	   banner lines up with page content instead of running full-bleed. */
	.plan-banner {
		max-width: 1000px;
		margin: 0 auto;
		padding: var(--space-400) var(--space-400) 0;
	}
</style>
