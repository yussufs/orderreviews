<script lang="ts">
	import { onMount } from 'svelte';
	import type { PageData } from './$types';
	import {
		Page,
		Card,
		Button,
		Banner,
		Text,
		Spinner,
		Divider,
		AdminLink,
		CollectReviewsCard
	} from '$lib/components';
	import { apiFetch } from '$lib/client/api';
	import { addAppBlockUrl, activateAppEmbedUrl, openAdminLink } from '$lib/admin-links';
	import { SMART_ACTIONS } from '$lib/smart-actions';

	let { data }: { data: PageData } = $props();

	type WidgetStyle = 'order_reviews_grid' | 'order_reviews_carousel';

	interface Location {
		placeId: string;
		title: string;
	}
	interface WidgetSettingsRow {
		widgetStyle: WidgetStyle;
	}

	let locations = $state<Location[]>([]);
	let widgetStyle = $state<WidgetStyle>('order_reviews_grid');
	let isLoading = $state(true);
	let isSaving = $state(false);
	let error = $state<string | null>(null);

	onMount(async () => {
		try {
			const [locData, settingsData] = await Promise.all([
				apiFetch<{ locations: Location[] }>('/app/api/locations'),
				apiFetch<{ settings: WidgetSettingsRow | null }>('/app/api/widget-settings')
			]);
			locations = locData.locations;
			if (settingsData.settings) widgetStyle = settingsData.settings.widgetStyle;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load widget settings';
		} finally {
			isLoading = false;
		}
	});

	async function persist(style: WidgetStyle) {
		isSaving = true;
		try {
			await apiFetch('/app/api/widget-settings', {
				method: 'PUT',
				body: { widgetStyle: style }
			});
		} catch (err) {
			error = err instanceof Error ? err.message : 'Save failed';
		} finally {
			isSaving = false;
		}
	}

	async function selectWidget(style: WidgetStyle) {
		widgetStyle = style;
		await persist(style);
		window.shopify?.toast?.show('Widget design saved');
	}

	const widgetOptions: { id: WidgetStyle; title: string; image: string }[] = [
		{ id: 'order_reviews_grid', title: 'Grid', image: '/widget-previews/grid.svg' },
		{ id: 'order_reviews_carousel', title: 'Carousel', image: '/widget-previews/carousel.svg' }
	];

	const blockHandle = $derived(
		widgetStyle === 'order_reviews_carousel' ? 'order-reviews-carousel' : 'order-reviews-grid'
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
		await persist(widgetStyle);
		openAdminLink(
			addAppBlockUrl({ shop: data.shop, apiKey: data.apiKey ?? '', handle: blockHandle, template })
		);
		showPageSelector = false;
	}

	const activateEmbedUrl = $derived(
		activateAppEmbedUrl({ shop: data.shop, apiKey: data.apiKey ?? '', handle: 'order-reviews-embed' })
	);
</script>

<svelte:head>
	<title>Widget</title>
</svelte:head>

<Page title="Review widget">
	{#snippet secondaryActions()}
		<Button variant="secondary" href="/app/reviews">Hide / unhide reviews</Button>
	{/snippet}

	{#if error}
		<Banner tone="critical" title="Something went wrong">{error}</Banner>
	{/if}

	{#if isLoading}
		<Card><div class="centered"><Spinner /></div></Card>
	{:else if locations.length === 0}
		<Card title="Connect a location first">
			<Text tone="subdued">
				You need to import a Google business before you can configure the widget.
			</Text>
			<div class="row">
				<Button variant="primary" href="/app/locations">Go to Locations</Button>
			</div>
		</Card>
	{:else}
		<Card title="Design">
			<div class="widget-options">
				{#each widgetOptions as w (w.id)}
					<button
						type="button"
						class="widget-option"
						class:selected={widgetStyle === w.id}
						onclick={() => selectWidget(w.id)}
					>
						<img src={w.image} alt={w.title} class="widget-thumb" />
						<Text variant="bodyMd">{w.title}</Text>
					</button>
				{/each}
			</div>

			<Divider />

			<Text tone="subdued">
				Add the {widgetStyle === 'order_reviews_carousel' ? 'Carousel' : 'Grid'} to a storefront page.
			</Text>

			<!-- Add-widget dropdown: choose which page to place it on (Home default) -->
			<div class="action-menu-wrapper" bind:this={actionMenuRef}>
				<Button
					variant="primary"
					loading={isSaving}
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

			<Text tone="subdued" variant="bodySm">
				Or activate the <AdminLink href={activateEmbedUrl}>global app embed</AdminLink> to show it across
				your whole storefront.
			</Text>
		</Card>

		<CollectReviewsCard title="Smart actions" items={SMART_ACTIONS} columns={2} />
	{/if}
</Page>

<style>
	.row {
		margin-top: var(--space-400);
	}
	.centered {
		display: flex;
		justify-content: center;
		padding: var(--space-600);
	}
	.widget-options {
		display: flex;
		gap: var(--space-400);
		margin-bottom: var(--space-400);
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
	.action-menu-wrapper {
		position: relative;
		display: inline-block;
		margin: var(--space-300) 0;
	}
	.chevron {
		margin-left: var(--space-100);
		vertical-align: middle;
	}
	.action-menu-dropdown {
		position: absolute;
		top: 100%;
		left: 0;
		min-width: 220px;
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
</style>
