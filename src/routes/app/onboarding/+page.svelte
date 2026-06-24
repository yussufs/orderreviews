<script lang="ts">
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';
	import {
		Page,
		Card,
		Text,
		TextField,
		Select,
		Switch,
		Button,
		Spinner,
		Badge,
		Icon
	} from '$lib/components';
	import { apiFetch } from '$lib/client/api';
	import { addAppBlockUrl, openAdminLink } from '$lib/admin-links';

	let { data }: { data: PageData } = $props();

	const ONBOARDING_SKIP_KEY = 'or_onboarding_skipped';

	type WidgetStyle = 'order_reviews_grid' | 'order_reviews_carousel';

	interface PlaceResult {
		placeId: string;
		title: string;
		address: string;
		totalScore?: number;
		reviewsCount?: number;
		imageUrl?: string;
	}

	let step = $state(1);
	const totalSteps = 3;
	const progress = $derived((step / totalSteps) * 100);

	function toast(message: string) {
		window.shopify?.toast?.show(message);
	}

	// --- Step 1: search + select ---
	let query = $state('');
	let isSearching = $state(false);
	let results = $state<PlaceResult[]>([]);
	let searchError = $state('');
	let hasSearched = $state(false);
	let selectingId = $state('');

	let importedPlaceId = $state('');
	let importedTitle = $state('');

	async function search() {
		if (query.trim().length < 3) {
			searchError = 'Enter at least 3 characters';
			return;
		}
		isSearching = true;
		searchError = '';
		results = [];
		hasSearched = false;
		try {
			const res = await apiFetch<{ results: PlaceResult[] }>(
				`/app/api/locations/search?q=${encodeURIComponent(query)}`
			);
			results = res.results;
			hasSearched = true;
			if (results.length === 0) searchError = 'No matches. Try adding your city or full address.';
		} catch (err) {
			searchError = err instanceof Error ? err.message : 'Search failed';
		} finally {
			isSearching = false;
		}
	}

	async function selectLocation(place: PlaceResult) {
		selectingId = place.placeId;
		try {
			await apiFetch<{ location: unknown; jobId: string }>('/app/api/locations', {
				method: 'POST',
				body: { placeId: place.placeId }
			});
			importedPlaceId = place.placeId;
			importedTitle = place.title;
			toast('Importing your Google reviews…');
			step = 2;
		} catch (err) {
			toast(err instanceof Error ? err.message : 'Could not add location');
		} finally {
			selectingId = '';
		}
	}

	// --- Step 2: review collection settings ---
	let enabled = $state(true);
	let trigger = $state<'orders/paid' | 'orders/fulfilled'>('orders/fulfilled');
	let delayDays = $state(5);
	let ratingType = $state<'stars' | 'thumbs'>('stars');
	let threshold = $state(4);
	let merchantEmail = $state('');
	let savingCollection = $state(false);

	const triggerOptions = [
		{ value: 'orders/fulfilled', label: 'When the order is fulfilled' },
		{ value: 'orders/paid', label: 'When the order is paid' }
	];
	const ratingTypeOptions = [
		{ value: 'stars', label: 'Star rating (1–5)' },
		{ value: 'thumbs', label: 'Thumbs up / down' }
	];
	const thresholdOptions = [
		{ value: '3', label: '3+' },
		{ value: '4', label: '4+' },
		{ value: '5', label: '5 only' }
	];

	async function saveCollection() {
		savingCollection = true;
		try {
			await apiFetch('/app/api/review-collection', {
				method: 'PUT',
				body: {
					enabled,
					trigger,
					delayDays,
					ratingType,
					threshold,
					placeId: importedPlaceId || null,
					followupEnabled: true,
					followupDelayDays: 3,
					maxFollowups: 1,
					notifyMerchantOnLowRating: true,
					merchantEmail: merchantEmail || null,
					fromName: null,
					subject: null
				}
			});
			step = 3;
		} catch (err) {
			toast(err instanceof Error ? err.message : 'Could not save settings');
		} finally {
			savingCollection = false;
		}
	}

	// --- Step 3: widget ---
	const widgetOptions: { id: WidgetStyle; title: string; image: string }[] = [
		{ id: 'order_reviews_grid', title: 'Grid', image: '/widget-previews/grid.svg' },
		{ id: 'order_reviews_carousel', title: 'Carousel', image: '/widget-previews/carousel.svg' }
	];
	let selectedWidget = $state<WidgetStyle>('order_reviews_grid');
	let savingWidget = $state(false);
	const blockHandle = $derived(
		selectedWidget === 'order_reviews_carousel' ? 'order-reviews-carousel' : 'order-reviews-grid'
	);

	// "Add widget" dropdown: pick which storefront page to place it on (Home first).
	const pageOptions = [
		{ label: 'Home page', value: 'index' },
		{ label: 'Product pages', value: 'product' },
		{ label: 'Collection pages', value: 'collection' },
		{ label: 'Cart page', value: 'cart' },
		{ label: 'Pages', value: 'page' },
		{ label: 'Blog posts', value: 'article' },
		{ label: 'Search results', value: 'search' }
	];
	let showPageSelector = $state(false);
	let actionMenuRef = $state<HTMLElement | null>(null);

	$effect(() => {
		if (!showPageSelector) return;
		function onClick(event: MouseEvent) {
			if (actionMenuRef && !actionMenuRef.contains(event.target as Node)) {
				showPageSelector = false;
			}
		}
		document.addEventListener('click', onClick);
		return () => document.removeEventListener('click', onClick);
	});

	async function openThemeEditor(template: string) {
		// Persist the chosen design first, then deep-link into the theme editor.
		await saveWidget(selectedWidget);
		openAdminLink(
			addAppBlockUrl({ shop: data.shop, apiKey: data.apiKey ?? '', handle: blockHandle, template })
		);
		showPageSelector = false;
	}

	async function saveWidget(styleId: WidgetStyle) {
		selectedWidget = styleId;
		savingWidget = true;
		try {
			await apiFetch('/app/api/widget-settings', {
				method: 'PUT',
				body: { widgetStyle: styleId, locationPlaceId: importedPlaceId || null }
			});
		} catch (err) {
			toast(err instanceof Error ? err.message : 'Could not save widget choice');
		} finally {
			savingWidget = false;
		}
	}

	async function finish() {
		// Persist the current widget choice, then head to the dashboard.
		await saveWidget(selectedWidget);
		toast('You’re all set!');
		goto('/app');
	}

	function skip() {
		localStorage.setItem(ONBOARDING_SKIP_KEY, '1');
		goto('/app');
	}

	function back() {
		if (step > 1) step -= 1;
	}
</script>

<svelte:head>
	<title>Get started</title>
</svelte:head>

<Page title="Get started">
	{#snippet primaryAction()}
		<Button variant="plain" onclick={skip}>Skip setup</Button>
	{/snippet}

	<!-- Step indicator -->
	<div class="steps-indicator">
		{#each ['Connect business', 'Review emails', 'Add widget'] as label, i (label)}
			<div class="step-pill" class:active={step === i + 1} class:done={step > i + 1}>
				<span class="step-num">{step > i + 1 ? '✓' : i + 1}</span>
				<span>{label}</span>
			</div>
		{/each}
	</div>
	<div class="progress-track"><div class="progress-fill" style="width:{progress}%"></div></div>

	{#if step === 1}
		<Card title="Find your Google business">
			<Text tone="subdued">
				Search for your business by name and city (or full address), then select it to import your
				Google reviews.
			</Text>
			<form
				class="search-form"
				onsubmit={(e) => {
					e.preventDefault();
					search();
				}}
			>
				<div class="search-input">
					<TextField
						type="search"
						label="Search for your business"
						labelHidden
						name="search"
						placeholder="e.g. Joe's Coffee, Austin TX"
						value={query}
						oninput={(e) => (query = (e.target as HTMLInputElement).value)}
					/>
				</div>
				<Button type="submit" variant="primary" loading={isSearching}>Search</Button>
			</form>
			{#if searchError}
				<Text tone="critical">{searchError}</Text>
			{/if}
		</Card>

		{#if isSearching}
			<div class="centered"><Spinner size="large" /></div>
		{:else if results.length > 0}
			<Card title="Search results">
				<ul class="results">
					{#each results as r (r.placeId)}
						<li>
							{#if r.imageUrl}
								<img src={r.imageUrl} alt={r.title} class="thumb" />
							{:else}
								<div class="thumb placeholder"><Icon name="image" tone="subdued" /></div>
							{/if}
							<div class="result-info">
								<Text variant="bodyMd">{r.title}</Text>
								<Text tone="subdued" variant="bodySm">{r.address}</Text>
								{#if r.totalScore}
									<Badge tone="success">{r.totalScore}★ · {r.reviewsCount ?? 0} reviews</Badge>
								{/if}
							</div>
							<Button
								variant="primary"
								loading={selectingId === r.placeId}
								onclick={() => selectLocation(r)}
							>
								Select
							</Button>
						</li>
					{/each}
				</ul>
			</Card>
		{/if}
	{:else if step === 2}
		<Card title="When should we ask customers for a review?">
			<Switch
				label="Email customers after their order"
				name="enabled"
				checked={enabled}
				onchange={(e) => (enabled = (e.target as HTMLInputElement).checked)}
			/>
			<Select
				label="Send the email…"
				name="trigger"
				value={trigger}
				options={triggerOptions}
				onchange={(e) =>
					(trigger = (e.target as HTMLSelectElement).value as 'orders/paid' | 'orders/fulfilled')}
			/>
			<TextField
				label="Delay (days after the trigger)"
				name="delayDays"
				type="number"
				value={String(delayDays)}
				oninput={(e) => (delayDays = Number((e.target as HTMLInputElement).value))}
			/>
			<Select
				label="Ask for"
				name="ratingType"
				value={ratingType}
				options={ratingTypeOptions}
				onchange={(e) => (ratingType = (e.target as HTMLSelectElement).value as 'stars' | 'thumbs')}
			/>
			<Select
				label="Send to Google when the rating is"
				name="threshold"
				value={String(threshold)}
				options={thresholdOptions}
				onchange={(e) => (threshold = Number((e.target as HTMLSelectElement).value))}
			/>
			<TextField
				label="Email me low-rating feedback at (optional)"
				name="merchantEmail"
				type="email"
				value={merchantEmail}
				oninput={(e) => (merchantEmail = (e.target as HTMLInputElement).value)}
				helpText="Below-threshold ratings go to a private form instead of Google."
			/>
			<div class="actions">
				<Button variant="secondary" onclick={back}>Back</Button>
				<Button variant="primary" loading={savingCollection} onclick={saveCollection}>
					Continue
				</Button>
			</div>
		</Card>
	{:else}
		<Card title="Choose your review widget">
			<Text tone="subdued">Pick a design. You can fine-tune colors and placement later.</Text>
			<div class="widget-options">
				{#each widgetOptions as w (w.id)}
					<button
						type="button"
						class="widget-option"
						class:selected={selectedWidget === w.id}
						onclick={() => saveWidget(w.id)}
					>
						<img src={w.image} alt={w.title} class="widget-thumb" />
						<Text variant="bodyMd">{w.title}</Text>
					</button>
				{/each}
			</div>
			<!-- Add-widget dropdown: choose which page to place it on (Home default) -->
			<div class="action-menu-wrapper" bind:this={actionMenuRef}>
				<Button
					variant="primary"
					fullWidth
					loading={savingWidget}
					onclick={() => (showPageSelector = !showPageSelector)}
				>
					Add widget to storefront
					<svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18" class="chevron">
						<path
							fill-rule="evenodd"
							d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
							clip-rule="evenodd"
						/>
					</svg>
				</Button>
				{#if showPageSelector}
					<div class="action-menu-dropdown">
						{#each pageOptions as opt (opt.value)}
							<button
								type="button"
								class="action-menu-item"
								onclick={() => openThemeEditor(opt.value)}
							>
								{opt.label}
							</button>
						{/each}
					</div>
				{/if}
			</div>

			<div class="actions">
				<Button variant="secondary" onclick={back}>Back</Button>
				<Button variant="plain" onclick={finish}>Finish — I'll place it later</Button>
			</div>
		</Card>
	{/if}
</Page>

<style>
	.steps-indicator {
		display: flex;
		gap: var(--space-300);
		margin-bottom: var(--space-300);
		flex-wrap: wrap;
	}
	.step-pill {
		display: flex;
		align-items: center;
		gap: var(--space-200);
		color: var(--color-text-subdued, #6b7280);
		font-size: 0.9rem;
	}
	.step-pill.active {
		color: var(--color-text, #1a1a1a);
		font-weight: 600;
	}
	.step-num {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 22px;
		height: 22px;
		border-radius: 50%;
		border: 2px solid var(--color-border);
		font-size: 0.75rem;
	}
	.step-pill.active .step-num {
		border-color: var(--color-bg-fill-info, #1a73e8);
		color: var(--color-bg-fill-info, #1a73e8);
	}
	.step-pill.done .step-num {
		background: var(--color-bg-fill-success, #16a34a);
		border-color: var(--color-bg-fill-success, #16a34a);
		color: #fff;
	}
	.progress-track {
		height: 6px;
		background: var(--color-bg-surface-secondary, #f1f1f1);
		border-radius: 3px;
		overflow: hidden;
		margin-bottom: var(--space-400);
	}
	.progress-fill {
		height: 100%;
		background: var(--color-bg-fill-info, #1a73e8);
		transition: width 0.3s ease;
	}
	.search-form {
		display: flex;
		gap: var(--space-300);
		align-items: flex-start;
		margin-top: var(--space-300);
	}
	.search-input {
		flex: 1;
	}
	.centered {
		display: flex;
		justify-content: center;
		padding: var(--space-700);
	}
	.results {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-300);
	}
	.results li {
		display: flex;
		align-items: center;
		gap: var(--space-300);
	}
	.thumb {
		width: 48px;
		height: 48px;
		border-radius: var(--radius-sm, 8px);
		object-fit: cover;
		flex-shrink: 0;
	}
	.thumb.placeholder {
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-bg-surface-secondary, #f1f1f1);
	}
	.result-info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.actions {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-300);
		margin-top: var(--space-400);
	}
	.action-menu-wrapper {
		position: relative;
		margin-top: var(--space-500);
	}
	.chevron {
		margin-left: var(--space-100);
		vertical-align: middle;
	}
	.action-menu-dropdown {
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		margin-top: var(--space-100);
		padding: var(--space-100) 0;
		background: var(--color-bg-surface, #fff);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg, 12px);
		box-shadow: var(--shadow-lg, 0 8px 24px rgba(0, 0, 0, 0.12));
		z-index: 100;
	}
	.action-menu-item {
		display: block;
		width: 100%;
		padding: var(--space-200) var(--space-400);
		border: none;
		background: transparent;
		font: inherit;
		text-align: left;
		cursor: pointer;
		color: var(--color-text, #1a1a1a);
	}
	.action-menu-item:hover {
		background: var(--color-bg-surface-hover, #f6f6f7);
	}
	.widget-options {
		display: flex;
		gap: var(--space-400);
		margin: var(--space-400) 0;
		flex-wrap: wrap;
	}
	.widget-option {
		flex: 0 0 150px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-200);
		padding: var(--space-200);
		border: 2px solid var(--color-border);
		border-radius: var(--radius-lg, 12px);
		background: var(--color-bg-surface, #fff);
		cursor: pointer;
		transition: border-color 0.15s ease;
	}
	.widget-option.selected {
		border-color: var(--color-bg-fill-info, #1a73e8);
	}
	.widget-thumb {
		width: 100%;
		border-radius: var(--radius-sm, 8px);
		border: 1px solid var(--color-border);
	}
</style>
