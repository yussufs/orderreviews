<script lang="ts">
	import type { PageData } from './$types';
	import { Page, Card, Button, Badge, Banner, Text } from '$lib/components';
	import { apiFetch } from '$lib/client/api';

	let { data }: { data: PageData } = $props();

	const isPremium = $derived(data.plan === 'premium');

	let interval = $state<'annual' | 'monthly'>('annual');
	let busy = $state(false);
	let error = $state<string | null>(null);

	const price = $derived(interval === 'annual' ? '$9.99' : '$14.99');
	const priceNote = $derived(
		interval === 'annual'
			? 'per month, billed annually ($119.88/year)'
			: 'per month, billed monthly'
	);

	async function subscribe() {
		busy = true;
		error = null;
		try {
			const { confirmationUrl } = await apiFetch<{ confirmationUrl: string }>('/app/api/billing', {
				method: 'POST',
				body: { interval }
			});
			// Break out of the embedded iframe to Shopify's approval page. App Bridge
			// intercepts open(url, '_top') and drives the top frame; assigning
			// window.top.location directly is blocked cross-origin, which leaves the
			// confirmation page framed and failing with ERR_BLOCKED_BY_RESPONSE.
			window.open(confirmationUrl, '_top');
		} catch (err) {
			error = err instanceof Error ? err.message : 'Could not start checkout';
			busy = false;
		}
	}

	async function cancel() {
		busy = true;
		error = null;
		try {
			await apiFetch('/app/api/billing', { method: 'DELETE' });
			window.location.reload();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Could not cancel subscription';
			busy = false;
		}
	}

	const premiumFeatures = [
		'Unlimited post-order review request emails',
		'Show all your reviews in the storefront widget (no 10-review cap)',
		'Choose exactly which reviews to show or hide',
		'Priority email support'
	];

	const freeFeatures = $derived([
		`${data.usage?.cap ?? 10} review request emails per month`,
		'Up to 10 reviews shown in the widget',
		'No per-review show/hide control'
	]);
</script>

<svelte:head>
	<title>Plan & Pricing</title>
</svelte:head>

<Page title="Plan & pricing" subtitle="Choose the plan that fits your store.">
	{#if error}
		<Banner tone="critical" title="Something went wrong">{error}</Banner>
	{/if}

	<div class="plans">
		<Card>
			<div class="plan">
				<div class="plan-head">
					<Text variant="headingMd">Free</Text>
					{#if !isPremium}<Badge tone="info">Current plan</Badge>{/if}
				</div>
				<div class="price"><span class="amount">$0</span><span class="per">/month</span></div>
				<ul class="features">
					{#each freeFeatures as f (f)}
						<li>{f}</li>
					{/each}
				</ul>
				{#if !isPremium}
					<Text variant="bodySm" tone="subdued">
						You've used {data.usage?.emailsSent ?? 0}/{data.usage?.cap ?? 10} review emails this month.
					</Text>
				{/if}
			</div>
		</Card>

		<Card>
			<div class="plan premium">
				<div class="plan-head">
					<Text variant="headingMd">Premium</Text>
					{#if isPremium}
						<Badge tone="success">Current plan</Badge>
					{:else}
						<Badge tone="caution">7-day free trial</Badge>
					{/if}
				</div>

				{#if !isPremium}
					<div class="toggle" role="group" aria-label="Billing interval">
						<button
							type="button"
							class="toggle-btn"
							class:active={interval === 'annual'}
							onclick={() => (interval = 'annual')}
						>
							Annual · save 33%
						</button>
						<button
							type="button"
							class="toggle-btn"
							class:active={interval === 'monthly'}
							onclick={() => (interval = 'monthly')}
						>
							Monthly
						</button>
					</div>
				{/if}

				<div class="price">
					<span class="amount"
						>{isPremium ? (data.planInterval === 'monthly' ? '$14.99' : '$9.99') : price}</span
					>
					<span class="per">/month</span>
				</div>
				{#if !isPremium}
					<Text variant="bodySm" tone="subdued">{priceNote}</Text>
				{/if}

				<ul class="features">
					{#each premiumFeatures as f (f)}
						<li>{f}</li>
					{/each}
				</ul>

				{#if isPremium}
					<Button variant="secondary" tone="critical" fullWidth loading={busy} onclick={cancel}>
						Cancel subscription
					</Button>
				{:else}
					<Button variant="primary" fullWidth loading={busy} onclick={subscribe}>
						Start 7-day free trial
					</Button>
				{/if}
			</div>
		</Card>
	</div>

	<Text variant="bodySm" tone="subdued">
		Plans are billed securely through Shopify. Starting a plan opens Shopify's approval page, and
		your subscription appears on your regular Shopify invoice. Cancel anytime.
	</Text>
</Page>

<style>
	.plans {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
		gap: 16px;
		margin-bottom: 16px;
	}
	.plan {
		display: flex;
		flex-direction: column;
		gap: 12px;
		padding: 4px;
	}
	.plan-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
	}
	.toggle {
		display: inline-flex;
		background: var(--color-bg-surface-secondary, #f1f1f1);
		border-radius: 8px;
		padding: 3px;
		gap: 3px;
		width: fit-content;
	}
	.toggle-btn {
		border: 0;
		background: transparent;
		padding: 6px 12px;
		border-radius: 6px;
		font-size: 13px;
		font-weight: 600;
		cursor: pointer;
		color: var(--color-text-secondary, #4b5563);
	}
	.toggle-btn.active {
		background: #fff;
		color: var(--color-text, #1a1a1a);
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12);
	}
	.price {
		display: flex;
		align-items: baseline;
		gap: 4px;
	}
	.amount {
		font-size: 28px;
		font-weight: 700;
	}
	.per {
		color: #6b7280;
	}
	.features {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.features li {
		position: relative;
		padding-left: 22px;
		font-size: 14px;
	}
	.features li::before {
		content: '✓';
		position: absolute;
		left: 0;
		color: #16a34a;
		font-weight: 700;
	}
</style>
