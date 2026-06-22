<script lang="ts">
	/**
	 * Grid Widget Component
	 * Displays reviews in a responsive grid layout with load more functionality
	 */
	import type { Review, GLocation, DisplaySettings } from '../lib/types';
	import Header from '../components/Header.svelte';
	import ReviewCard from '../components/ReviewCard.svelte';
	import LoadMore from '../components/LoadMore.svelte';

	interface Props {
		reviewData: Review[];
		placeData: GLocation;
		displaySettings?: DisplaySettings;
		variant?: string;
	}

	let { reviewData, placeData, displaySettings = {}, variant = 'primary' }: Props = $props();

	// Display settings
	const variableHeightText = $derived(displaySettings.variableheighttext || false);

	// State for load more
	const REVIEWS_PER_PAGE = 6;
	const initialVisibleCount = $derived(displaySettings.visibleReviews || REVIEWS_PER_PAGE);
	let visibleCount = $state(REVIEWS_PER_PAGE);
	let previousCount = $state(0);
	let hasInitialized = $state(false);

	// Sync initial visible count from displaySettings
	$effect(() => {
		if (!hasInitialized) {
			visibleCount = initialVisibleCount;
			hasInitialized = true;
		}
	});

	// Computed values
	const visibleReviews = $derived(reviewData.slice(0, visibleCount));
	const hasMoreReviews = $derived(visibleCount < reviewData.length);

	function loadMore() {
		previousCount = visibleCount;
		visibleCount = Math.min(visibleCount + REVIEWS_PER_PAGE, reviewData.length);
	}
</script>

<div class="widget-container">
	<Header place={placeData} />

	<div class="reviews-grid" class:variable-height={variableHeightText}>
		{#each visibleReviews as review, index}
			<div class="grid-item" class:fade-in={index >= previousCount && previousCount > 0}>
				<ReviewCard {review} {displaySettings} />
			</div>
		{/each}
	</div>

	<LoadMore hasMore={hasMoreReviews} onclick={loadMore} />
</div>

<style>
	/* ============================================
	   Grid Container
	   ============================================ */

	.widget-container {
		/* Column variables inherit from :host (set in base.css, overridable via liquid) */
		display: block;
		width: 100%;
		max-width: 100%;
		background: var(--dragonio-google-review-widget-background);
		padding: var(--dragonio-google-review-widget-padding);
		border-radius: var(--dragonio-google-review-widget-border-radius);
		box-shadow: var(--dragonio-google-review-widget-box-shadow);
		box-sizing: border-box;
		container-type: inline-size;
	}

	/* ============================================
	   Reviews Grid
	   ============================================ */

	.reviews-grid {
		--grid-cols: var(--grid-cols-sm);
		display: grid;
		grid-template-columns: repeat(var(--grid-cols), 1fr);
		gap: 1em;
		margin-top: 1em;
		/* Fixed height mode: align items to stretch */
		align-items: stretch;
	}

	@container (min-width: 600px) {
		.reviews-grid {
			--grid-cols: var(--grid-cols-md);
		}
	}

	@container (min-width: 800px) {
		.reviews-grid {
			--grid-cols: var(--grid-cols-lg);
		}
	}

	/* Fixed height mode: cards fill their grid cell */
	.grid-item :global(.review-card) {
		height: 100%;
		display: flex;
		flex-direction: column;
	}

	/* Variable height mode: cards are natural height */
	.reviews-grid.variable-height {
		align-items: flex-start;
	}

	.reviews-grid.variable-height .grid-item :global(.review-card) {
		height: auto;
	}

	/* Override review card content direction for grid */
	.reviews-grid :global(.review-content-and-images) {
		flex-direction: column-reverse;
		align-items: flex-start;
	}

	/* Simple fade for new items */
	.grid-item.fade-in {
		animation: fadeIn 0.3s ease-out;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}
</style>
