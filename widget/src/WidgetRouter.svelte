<script lang="ts">
	/**
	 * Widget Router Component
	 * Routes to the correct widget type based on configuration
	 */
	import { untrack } from 'svelte';
	import type { WidgetConfig, Review, GLocation, DisplaySettings, ImportStatus } from './lib/types';
	import { pollForWidgetData, getDummyData } from './lib/api';
	import { generateCssVariables, mapDisplaySettingsToCssVars } from './lib/themes';
	// Widget imports (v1 ships grid + carousel)
	import Grid from './widgets/Grid.svelte';
	import Carousel from './widgets/Carousel.svelte';

	interface Props {
		config: WidgetConfig;
	}

	let { config }: Props = $props();

	// Widget state
	let loading = $state(true);
	let importing = $state(false);
	let importProgress = $state(0);
	let importStatus = $state<ImportStatus | undefined>(undefined);
	let reviewData = $state<Review[]>([]);
	let placeData = $state<GLocation | null>(null);
	let apiDisplaySettings = $state<DisplaySettings>({});
	let apiCustomCss = $state('');
	// Ownership gate: false when the shop hasn't verified business ownership.
	let verified = $state(true);

	// Track data source for change detection
	let dataSource = $derived.by(() => {
		return `${config.endpoint}|${config.location}|${config.myshopifyDomain}|${config.widgetType}`;
	});

	let lastDataSource = $state('');
	let hasLoadedData = $state(false);

	// Check if we're in Shopify theme editor (design mode)
	const isDesignMode =
		typeof window !== 'undefined' &&
		typeof (window as { Shopify?: { designMode?: boolean } }).Shopify !== 'undefined' &&
		(window as { Shopify?: { designMode?: boolean } }).Shopify?.designMode === true;

	// Determine widget type from config
	const widgetType = $derived.by(() => {
		const type = config.widgetType.toLowerCase();
		if (type.includes('carousel')) return 'carousel';
		if (type.includes('grid')) return 'grid';
		return 'grid'; // default
	});

	// Determine variant from config
	const variant = $derived(config.variant || getDefaultVariant(widgetType));

	// Merge display settings from config and API response
	const displaySettings = $derived.by(() => {
		return { ...apiDisplaySettings, ...config.displaySettings };
	});

	// Merge custom CSS from config and API response
	const customCss = $derived.by(() => {
		return config.customCss && apiCustomCss
			? `${config.customCss}\n${apiCustomCss}`
			: config.customCss || apiCustomCss;
	});

	// Generate CSS variables from theme + custom settings
	// When color is 'custom', skip CSS generation - liquid file styles handle it via :host
	const cssVariables = $derived.by(() => {
		const themeName = (displaySettings.color as string) || 'default';
		if (themeName === 'custom') {
			return ''; // Let liquid file's :host styles take precedence
		}
		const customOverrides = mapDisplaySettingsToCssVars(displaySettings);
		return generateCssVariables(themeName, customOverrides);
	});

	function getDefaultVariant(_type: string): string {
		return 'primary';
	}

	// Load data on mount AND when data source changes
	$effect(() => {
		const currentDataSource = dataSource;

		// Only reload if data source actually changed (not just display settings)
		// Use untrack() to avoid re-running effect when hasLoadedData changes
		// (which would cancel the polling cleanup prematurely)
		const alreadyLoaded = untrack(() => hasLoadedData);
		const sameSource = untrack(() => lastDataSource) === currentDataSource;
		if (alreadyLoaded && sameSource) {
			return;
		}

		lastDataSource = currentDataSource;

		// If no endpoint or myshopify domain, use dummy data
		if (!config.endpoint || !config.myshopifyDomain) {
			const dummy = getDummyData();
			reviewData = dummy.reviewData;
			placeData = dummy.placeData;
			loading = false;
			hasLoadedData = true;
			return;
		}

		// Start polling for data
		const stopPolling = pollForWidgetData(
			{
				endpoint: config.endpoint,
				location: config.location,
				myshopifyDomain: config.myshopifyDomain,
				widgetType: config.widgetType,
				designMode: isDesignMode
			},
			(data) => {
				loading = data.loading;
				importing = data.importing;
				importProgress = data.importProgress;
				importStatus = data.importStatus;
				verified = data.verified !== false;
				if (!data.loading) {
					reviewData = data.reviewData;
					placeData = data.placeData;
					apiDisplaySettings = data.displaySettings;
					apiCustomCss = data.customCss;
					hasLoadedData = true;
				}
			},
			(err) => {
				console.error('Failed to load widget data:', err);
				// Fall back to dummy data on error
				const dummy = getDummyData();
				reviewData = dummy.reviewData;
				placeData = dummy.placeData;
				loading = false;
				importing = false;
				importStatus = undefined;
				hasLoadedData = true;
			}
		);

		// Cleanup on unmount or when data source changes
		return stopPolling;
	});
</script>

{#if cssVariables || customCss}
	{@html `<style>
		:host { ${cssVariables} }
		${customCss || ''}
	</style>`}
{/if}

{#if !verified && isDesignMode}
	<!-- Theme editor only: preview the real widget below, with a notice on top so the
	     merchant knows it isn't live yet. Customers never see this (the live storefront
	     doesn't request design_mode, so the server withholds the data entirely). -->
	<div class="dragonio-verify-notice">
		<strong>Preview only — not visible to customers yet.</strong>
		This is how your reviews will look. Verify that you own your Google Business account in the
		Order Reviews app to make the widget go live. Only you can see this notice.
	</div>
{/if}

{#if !verified && !isDesignMode}
	<!-- Live storefront, unverified: render nothing. -->
{:else if loading || importing}
	<div class="dragonio-status-card">
		<div class="dragonio-spinner"></div>
		<p class="dragonio-status-text">
			{#if importing}
				Your Google reviews are being imported...
			{:else}
				Loading reviews...
			{/if}
		</p>
		{#if importing && importProgress > 0}
			<div class="dragonio-progress-bar">
				<div class="dragonio-progress-fill" style="width: {importProgress}%"></div>
			</div>
			{#if importStatus && importStatus.totalReviews > 0}
				<p class="dragonio-progress-text">
					Processing {importStatus.reviewCount} of {importStatus.totalReviews} reviews
				</p>
			{:else}
				<p class="dragonio-progress-text">{importProgress}% complete</p>
			{/if}
		{/if}
		<p class="dragonio-status-subtext">This will automatically refresh when ready</p>
	</div>
{:else if placeData}
	<!-- Widget routing based on type (v1: grid + carousel) -->
	{#if widgetType === 'carousel'}
		<Carousel
			{reviewData}
			{placeData}
			{displaySettings}
			variant={variant as 'primary' | 'speech-bubble'}
		/>
	{:else}
		<Grid {reviewData} {placeData} {displaySettings} variant={variant as 'primary'} />
	{/if}
{/if}

<style>
	.dragonio-verify-notice {
		font-family:
			'Noto Sans',
			-apple-system,
			BlinkMacSystemFont,
			'Segoe UI',
			Roboto,
			sans-serif;
		font-size: 14px;
		line-height: 1.5;
		color: #7a5c00;
		background: #fff8e1;
		border: 1px solid #ffe08a;
		border-radius: 10px;
		padding: 12px 16px;
		margin-bottom: 16px;
	}
	.dragonio-verify-notice strong {
		display: block;
		margin-bottom: 2px;
		color: #6b4f00;
	}
	.dragonio-status-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 40px 20px;
		text-align: center;
		font-family:
			'Noto Sans',
			-apple-system,
			BlinkMacSystemFont,
			'Segoe UI',
			Roboto,
			sans-serif;
		background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
		border-radius: 12px;
		border: 1px solid #dee2e6;
	}

	.dragonio-spinner {
		width: 32px;
		height: 32px;
		border: 3px solid #e5e5e5;
		border-top-color: #1a73e8;
		border-radius: 50%;
		animation: dragonio-spin 0.8s linear infinite;
	}

	@keyframes dragonio-spin {
		to {
			transform: rotate(360deg);
		}
	}

	.dragonio-status-text {
		margin: 16px 0 8px;
		color: #333;
		font-size: 16px;
		font-weight: 500;
	}

	.dragonio-status-subtext {
		margin: 8px 0 0;
		color: #666;
		font-size: 13px;
	}

	.dragonio-progress-bar {
		width: 200px;
		height: 6px;
		background: #e9ecef;
		border-radius: 3px;
		overflow: hidden;
		margin: 12px 0;
	}

	.dragonio-progress-fill {
		height: 100%;
		background: linear-gradient(90deg, #1a73e8, #4285f4);
		border-radius: 3px;
		transition: width 0.3s ease;
	}

	.dragonio-progress-text {
		margin: 0;
		color: #1a73e8;
		font-size: 13px;
		font-weight: 500;
	}
</style>
