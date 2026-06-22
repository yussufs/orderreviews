<script lang="ts">
	import { onMount } from 'svelte';
	import type { PageData } from './$types';
	import {
		Page,
		Card,
		Button,
		Banner,
		Select,
		Text,
		Spinner,
		Divider,
		AdminLink
	} from '$lib/components';
	import { apiFetch } from '$lib/client/api';
	import { addAppBlockUrl, activateAppEmbedUrl } from '$lib/admin-links';

	let { data }: { data: PageData } = $props();

	type WidgetStyle = 'order_reviews_grid' | 'order_reviews_carousel';

	interface Location {
		placeId: string;
		title: string;
	}
	interface WidgetSettingsRow {
		widgetStyle: WidgetStyle;
		locationPlaceId: string | null;
	}

	let locations = $state<Location[]>([]);
	let widgetStyle = $state<WidgetStyle>('order_reviews_grid');
	let locationPlaceId = $state<string>('');
	let isLoading = $state(true);
	let isSaving = $state(false);
	let error = $state<string | null>(null);
	let saved = $state(false);

	onMount(async () => {
		try {
			const [locData, settingsData] = await Promise.all([
				apiFetch<{ locations: Location[] }>('/app/api/locations'),
				apiFetch<{ settings: WidgetSettingsRow | null }>('/app/api/widget-settings')
			]);
			locations = locData.locations;
			if (settingsData.settings) {
				widgetStyle = settingsData.settings.widgetStyle;
				locationPlaceId = settingsData.settings.locationPlaceId ?? '';
			}
			if (!locationPlaceId && locations.length) locationPlaceId = locations[0].placeId;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load widget settings';
		} finally {
			isLoading = false;
		}
	});

	async function save() {
		try {
			isSaving = true;
			saved = false;
			await apiFetch('/app/api/widget-settings', {
				method: 'PUT',
				body: { widgetStyle, locationPlaceId: locationPlaceId || null }
			});
			saved = true;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Save failed';
		} finally {
			isSaving = false;
		}
	}

	const styleOptions = [
		{ value: 'order_reviews_grid', label: 'Grid' },
		{ value: 'order_reviews_carousel', label: 'Carousel' }
	];
	const locationOptions = $derived(locations.map((l) => ({ value: l.placeId, label: l.title })));

	// Theme-editor deep links for the currently selected design.
	const blockHandle = $derived(
		widgetStyle === 'order_reviews_carousel' ? 'order-reviews-carousel' : 'order-reviews-grid'
	);
	const addToProductUrl = $derived(
		addAppBlockUrl({
			shop: data.shop,
			apiKey: data.apiKey ?? '',
			handle: blockHandle,
			template: 'product'
		})
	);
	const addToHomeUrl = $derived(
		addAppBlockUrl({
			shop: data.shop,
			apiKey: data.apiKey ?? '',
			handle: blockHandle,
			template: 'index'
		})
	);
	const activateEmbedUrl = $derived(
		activateAppEmbedUrl({
			shop: data.shop,
			apiKey: data.apiKey ?? '',
			handle: 'order-reviews-embed'
		})
	);
</script>

<svelte:head>
	<title>Widget</title>
</svelte:head>

<Page title="Review widget">
	{#if error}
		<Banner tone="critical" title="Something went wrong">{error}</Banner>
	{/if}
	{#if saved}
		<Banner tone="success" title="Saved">Your widget settings were saved.</Banner>
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
			<Select
				label="Widget style"
				name="widgetStyle"
				value={widgetStyle}
				options={styleOptions}
				onchange={(e) => (widgetStyle = (e.target as HTMLSelectElement).value as WidgetStyle)}
			/>
			<Select
				label="Location"
				name="location"
				value={locationPlaceId}
				options={locationOptions}
				onchange={(e) => (locationPlaceId = (e.target as HTMLSelectElement).value)}
			/>
			<div class="row">
				<Button variant="primary" disabled={isSaving} onclick={save}>
					{isSaving ? 'Saving…' : 'Save'}
				</Button>
			</div>
		</Card>

		<Card title="Add the widget to your storefront">
			<Text tone="subdued">
				Save your design first, then place it on your storefront. The links below open the theme
				editor with the {widgetStyle === 'order_reviews_carousel' ? 'Carousel' : 'Grid'} block pre-selected.
			</Text>
			<div class="links">
				<AdminLink href={addToProductUrl}>Add to product page</AdminLink>
				<AdminLink href={addToHomeUrl}>Add to home page</AdminLink>
			</div>
			<Divider />
			<Text tone="subdued">
				Or show it across your whole storefront by activating the global app embed.
			</Text>
			<div class="links">
				<AdminLink href={activateEmbedUrl}>Activate global app embed</AdminLink>
			</div>
		</Card>
	{/if}
</Page>

<style>
	.row {
		margin-top: var(--space-400);
	}
	.links {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-400);
		margin: var(--space-400) 0;
	}
	.centered {
		display: flex;
		justify-content: center;
		padding: var(--space-600);
	}
</style>
