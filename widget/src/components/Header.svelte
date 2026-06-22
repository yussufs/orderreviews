<script lang="ts">
	/**
	 * Header Component
	 * Displays location info, rating, and leave review button
	 */
	import type { GLocation } from '../lib/types';
	import Stars from './Stars.svelte';

	interface Props {
		place: GLocation;
		showLeaveReview?: boolean;
	}

	let { place, showLeaveReview = true }: Props = $props();

	const formattedReviewCount = $derived(place.reviewsCount.toLocaleString());
	const formattedRating = $derived(place.totalScore.toFixed(1));
</script>

<div class="header">
	<img src={place.imageUrl} alt={place.title} />
	<div class="location-info">
		<p class="title">{place.title}</p>
		<div class="rating-block">
			<span class="rating-value">{formattedRating}</span>
			<Stars rating={place.totalScore} />
		</div>
		<p class="reviews-count">{formattedReviewCount} reviews</p>
	</div>
	{#if showLeaveReview}
		<a class="leave-button" href={place.review_link} target="_blank" rel="noopener noreferrer">
			Leave a Review
		</a>
	{/if}
</div>

<style>
	.header {
		background: var(--dragonio-google-review-widget-header-background);
		color: var(--dragonio-google-review-widget-header-color);
		padding: var(--dragonio-google-review-widget-header-padding);
		border-radius: var(--dragonio-google-review-widget-header-border-radius);
		box-shadow: var(--dragonio-google-review-widget-header-box-shadow);
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1em;
	}

	@container (max-width: 600px) {
		.header {
			flex-direction: column;
		}
	}

	.header img {
		width: var(--dragonio-google-review-widget-header-image-size);
		height: var(--dragonio-google-review-widget-header-image-size);
		border-radius: 8px;
		object-fit: cover;
	}

	.location-info {
		display: flex;
		flex-direction: column;
		gap: 0.25em;
		flex: 1;
	}

	.title {
		font-size: 1.25em;
		font-weight: 500;
		margin: 0;
	}

	.rating-block {
		display: flex;
		align-items: center;
		gap: 0.5em;
	}

	.rating-value {
		font-size: 1em;
		font-weight: 600;
	}

	.reviews-count {
		font-size: 0.9em;
		opacity: 0.7;
	}

	.leave-button {
		background: var(--dragonio-google-review-widget-button-background);
		color: var(--dragonio-google-review-widget-button-color);
		padding: 0.65em 1em;
		border-radius: 8px;
		font-weight: 500;
		border: none;
		text-align: center;
		cursor: pointer;
		text-decoration: none;
		display: inline-block;
		white-space: nowrap;
	}

	.leave-button:hover {
		filter: brightness(0.9);
	}

	@container (max-width: 600px) {
		.leave-button {
			width: 100%;
		}
	}
</style>
