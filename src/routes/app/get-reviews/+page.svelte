<script lang="ts">
	import { onMount } from 'svelte';
	import QRCode from 'qrcode';
	import { Page, Card, Button, Banner, Badge, Text, Spinner, Icon } from '$lib/components';
	import { apiFetch } from '$lib/client/api';

	interface Location {
		placeId: string;
		title: string;
	}
	interface CollectionSettings {
		enabled: boolean;
		placeId: string | null;
	}

	let locations = $state<Location[]>([]);
	let settings = $state<CollectionSettings | null>(null);
	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let qrDataUrl = $state('');

	onMount(async () => {
		try {
			const [locData, settingsData] = await Promise.all([
				apiFetch<{ locations: Location[] }>('/app/api/locations'),
				apiFetch<{ settings: CollectionSettings }>('/app/api/review-collection')
			]);
			locations = locData.locations;
			settings = settingsData.settings;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load';
		} finally {
			isLoading = false;
		}
	});

	const placeId = $derived(settings?.placeId || locations[0]?.placeId || '');
	const reviewLink = $derived(
		placeId ? `https://search.google.com/local/writereview?placeid=${placeId}` : ''
	);

	// Regenerate the QR whenever the review link changes (client-only).
	$effect(() => {
		if (!reviewLink) {
			qrDataUrl = '';
			return;
		}
		QRCode.toDataURL(reviewLink, { width: 240, margin: 1 })
			.then((url) => (qrDataUrl = url))
			.catch(() => (qrDataUrl = ''));
	});

	function toast(message: string) {
		window.shopify?.toast?.show(message);
	}

	async function copyLink() {
		try {
			await navigator.clipboard.writeText(reviewLink);
			toast('Review link copied');
		} catch {
			toast('Could not copy — select and copy manually');
		}
	}
</script>

<svelte:head>
	<title>Get more reviews</title>
</svelte:head>

<Page title="Get more reviews" backAction={{ url: '/app/reviews', label: 'Reviews' }}>
	{#if error}
		<Banner tone="critical" title="Something went wrong">{error}</Banner>
	{/if}

	{#if isLoading}
		<Card><div class="centered"><Spinner /></div></Card>
	{:else}
		<!-- Email after orders -->
		<section id="email">
			<Card title="Email customers after an order">
				{#snippet actions()}
					<Badge tone={settings?.enabled ? 'success' : 'default'}>
						{settings?.enabled ? 'On' : 'Off'}
					</Badge>
				{/snippet}
				<Text tone="subdued">
					Automatically email customers after they order, asking for a rating. Happy customers are
					sent to Google; unhappy ones reach you privately.
				</Text>
				<div class="row">
					<Button variant="primary" href="/app/review-collection">Configure email requests</Button>
				</div>
			</Card>
		</section>

		<!-- Share a link -->
		<section id="link">
			<Card title="Share a review link">
				{#if reviewLink}
					<Text tone="subdued">
						Send this link in messages, emails, receipts or social posts. It opens your Google
						review form directly.
					</Text>
					<div class="link-row">
						<input class="link-input" type="text" readonly value={reviewLink} />
						<Button variant="primary" onclick={copyLink}>
							{#snippet icon()}<Icon name="link" size="small" />{/snippet}
							Copy
						</Button>
					</div>
				{:else}
					<Text tone="subdued">Connect a Google business first to get your review link.</Text>
					<div class="row">
						<Button variant="primary" href="/app/locations">Go to Locations</Button>
					</div>
				{/if}
			</Card>
		</section>

		<!-- QR code -->
		<section id="qr">
			<Card title="QR code">
				{#if reviewLink}
					<Text tone="subdued">
						Print it on packaging, receipts or in-store signage. Scanning opens your Google review
						form.
					</Text>
					{#if qrDataUrl}
						<div class="qr-box">
							<img class="qr-img" src={qrDataUrl} alt="Review QR code" />
							<a class="qr-download" href={qrDataUrl} download="review-qr.png">
								<Button variant="secondary">
									{#snippet icon()}<Icon name="download" size="small" />{/snippet}
									Download PNG
								</Button>
							</a>
						</div>
					{:else}
						<div class="centered"><Spinner /></div>
					{/if}
				{:else}
					<Text tone="subdued">Connect a Google business first to generate a QR code.</Text>
				{/if}
			</Card>
		</section>
	{/if}
</Page>

<style>
	.centered {
		display: flex;
		justify-content: center;
		padding: var(--space-600);
	}
	.row {
		margin-top: var(--space-400);
	}
	.link-row {
		display: flex;
		gap: var(--space-300);
		margin-top: var(--space-400);
		align-items: stretch;
		flex-wrap: wrap;
	}
	.link-input {
		flex: 1;
		min-width: 240px;
		padding: 0 var(--space-300);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md, 8px);
		font: inherit;
		background: var(--color-bg-surface-secondary, #f6f6f7);
		color: var(--color-text, #1a1a1a);
	}
	.qr-box {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: var(--space-300);
		margin-top: var(--space-400);
	}
	.qr-img {
		width: 200px;
		height: 200px;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md, 10px);
		background: #fff;
	}
	.qr-download {
		text-decoration: none;
	}
	section {
		scroll-margin-top: var(--space-500);
	}
</style>
