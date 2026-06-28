<script lang="ts">
	/**
	 * Review Card Component
	 * Displays a single review with avatar, name, rating, text, and images
	 *
	 * Variants:
	 * - card: Standard card layout (reviewer info inside card)
	 * - bubble: Speech bubble layout (reviewer info below card)
	 * - drawer: Compact drawer layout
	 */
	import type { Review, DisplaySettings } from '../lib/types';
	import { getInitials } from '../lib/utils';
	import Stars from './Stars.svelte';
	import GoogleIcon from '../icons/GoogleIcon.svelte';
	import VerifiedIcon from '../icons/VerifiedIcon.svelte';
	import ImageGallery from './ImageGallery.svelte';

	interface Props {
		review: Review;
		displaySettings?: DisplaySettings;
		variant?: 'card' | 'bubble' | 'drawer';
		showAnimation?: boolean;
	}

	let { review, displaySettings = {}, variant = 'card', showAnimation = false }: Props = $props();

	const imagesToShow = $derived(displaySettings.imagesToShow || 2);
	const showTime = $derived(displaySettings.showtime !== false);
	const variableHeightText = $derived(displaySettings.variableheighttext || false);

	// State for "Show more" text expansion
	let expanded = $state(false);
	const TEXT_LIMIT = 140;
	const hasLongText = $derived(review.text && review.text.length > TEXT_LIMIT);
	const displayText = $derived(() => {
		if (!review.text) return '';
		if (expanded || !hasLongText) return review.text;
		return review.text.slice(0, TEXT_LIMIT) + '...';
	});

	function toggleExpanded() {
		expanded = !expanded;
	}
</script>

{#if variant === 'bubble'}
	<!-- Speech Bubble Variant: Reviewer info is OUTSIDE/BELOW the card -->
	<div
		class="review-bubble-wrapper"
		class:slideInUp={showAnimation}
		class:variable-height={variableHeightText}
	>
		<div class="review-card review-card--bubble">
			<!-- Card Header: Stars and Google Logo -->
			<div class="bubble-header">
				<Stars rating={review.stars} />
				<div class="google-logo-container">
					<span class="hover-text"><strong>verified</strong> review from</span>
					<GoogleIcon />
				</div>
			</div>

			<!-- Review Content and Images -->
			<div class="review-content-and-images">
				<div class="review-content" class:variable-height={variableHeightText}>
					{#if review.text}
						<p>{displayText()}</p>
						{#if hasLongText}
							<div class="show-more-container">
								<button class="show-more" onclick={toggleExpanded}>
									{expanded ? 'Show less' : 'Show more'}
								</button>
							</div>
						{/if}
					{/if}
				</div>

				{#if review.reviewImageUrls && review.reviewImageUrls.length > 0}
					<ImageGallery
						images={review.reviewImageUrls}
						maxVisible={imagesToShow}
						reviewId={review.reviewId}
					/>
				{/if}
			</div>

			<!-- Speech bubble tail -->
			<div class="bubble-tail"></div>
		</div>

		<!-- Reviewer Info: Outside the card -->
		<div class="bubble-footer">
			{#if review.reviewerPhotoUrl}
				<img class="review-avatar" src={review.reviewerPhotoUrl} alt={review.name} />
			{:else}
				<div class="review-avatar review-avatar--initials">
					{getInitials(review.name)}
				</div>
			{/if}
			<div class="reviewer-info">
				<div class="reviewer-name">
					<VerifiedIcon />
					<span>{review.name}</span>
				</div>
				{#if showTime && review.timeago}
					<p class="reviewer-time">{review.timeago}</p>
				{/if}
			</div>
		</div>
	</div>
{:else}
	<!-- Standard Card/Drawer Variant -->
	<div class="review-card review-card--{variant}" class:slideInUp={showAnimation}>
		<!-- Google Logo -->
		<div class="google-logo-container">
			<span class="hover-text"><strong>verified</strong> review from</span>
			<GoogleIcon />
		</div>

		<!-- Review Header -->
		<div class="review-header">
			{#if review.reviewerPhotoUrl}
				<img class="review-avatar" src={review.reviewerPhotoUrl} alt={review.name} />
			{:else}
				<div class="review-avatar review-avatar--initials">
					{getInitials(review.name)}
				</div>
			{/if}
			<div class="reviewer-info">
				<div class="reviewer-name">
					<VerifiedIcon />
					<span>{review.name}</span>
				</div>
				{#if showTime && review.timeago}
					<p class="reviewer-time">{review.timeago}</p>
				{/if}
			</div>
		</div>

		<!-- Star Rating -->
		<Stars rating={review.stars} />

		<!-- Review Content and Images -->
		<div class="review-content-and-images">
			<div class="review-content" class:variable-height={variableHeightText}>
				{#if review.text}
					<p>{displayText()}</p>
					{#if hasLongText}
						<div class="show-more-container">
							<button class="show-more" onclick={toggleExpanded}>
								{expanded ? 'Show less' : 'Show more'}
							</button>
						</div>
					{/if}
				{/if}
			</div>

			{#if review.reviewImageUrls && review.reviewImageUrls.length > 0}
				<ImageGallery
					images={review.reviewImageUrls}
					maxVisible={imagesToShow}
					reviewId={review.reviewId}
				/>
			{/if}
		</div>
	</div>
{/if}

<style>
	/* ============================================
	   Standard Card Styles
	   ============================================ */
	.review-card {
		position: relative;
		background: var(--dragonio-google-review-widget-card-background);
		color: var(--dragonio-google-review-widget-card-color);
		padding: var(--dragonio-google-review-widget-card-padding);
		border-radius: var(--dragonio-google-review-widget-card-border-radius);
		box-shadow: var(--dragonio-google-review-widget-card-box-shadow);
	}

	.review-card--drawer {
		/* Drawer variant - compact styling */
		padding: 1em;
		border-radius: 12px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
	}

	.review-card--drawer .review-content-and-images {
		flex-direction: column;
	}

	.review-card.slideInUp {
		animation: slideInUp 0.4s ease-out;
	}

	@keyframes slideInUp {
		from {
			opacity: 0;
			transform: translateY(20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* ============================================
	   Speech Bubble Variant
	   ============================================ */
	.review-bubble-wrapper {
		display: flex;
		flex-direction: column;
		height: 100%;
	}

	.review-bubble-wrapper.variable-height {
		height: auto;
	}

	.review-bubble-wrapper.slideInUp {
		animation: slideInUp 0.4s ease-out;
	}

	.review-bubble-wrapper .review-card--bubble {
		position: relative;
		flex: 1;
		background: var(--dragonio-google-review-widget-card-background);
		color: var(--dragonio-google-review-widget-card-color);
		padding: var(--dragonio-google-review-widget-card-padding, 1em);
		border-radius: var(--dragonio-google-review-widget-card-border-radius, 16px);
		box-shadow: var(--dragonio-google-review-widget-card-box-shadow);
	}

	.bubble-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 0.75em;
	}

	.bubble-header .google-logo-container {
		position: static;
		font-size: 8px;
		display: flex;
		align-items: center;
		gap: 0.5em;
	}

	/* Speech bubble tail/pointer - uses rotated square for shadow support */
	.review-card--bubble::after {
		content: '';
		position: absolute;
		bottom: -8px;
		left: 28px;
		width: 16px;
		height: 16px;
		background: inherit;
		box-shadow: 2px 2px 2px rgba(0, 0, 0, 0.04);
		transform: rotate(45deg);
	}

	/* Hide the tail element since we use ::after now */
	.bubble-tail {
		display: none;
	}

	/* Reviewer info below the bubble */
	.bubble-footer {
		display: flex;
		align-items: center;
		gap: 0.75em;
		margin-top: 1em;
		padding-left: 0.5em;
		color: var(--dragonio-google-review-widget-footer-color, inherit);
	}

	.bubble-footer .review-avatar {
		width: var(--dragonio-google-review-widget-image-size, 36px);
		height: var(--dragonio-google-review-widget-image-size, 36px);
	}

	/* ============================================
	   Google Logo
	   ============================================ */
	.google-logo-container {
		position: absolute;
		top: 1em;
		right: 1em;
		font-size: 8px;
		display: flex;
		align-items: center;
		gap: 0.5em;
	}

	.google-logo-container .hover-text {
		opacity: 0;
		transition: opacity 0.3s;
	}

	.google-logo-container:hover .hover-text {
		opacity: 1;
	}

	/* ============================================
	   Review Header (standard variant)
	   ============================================ */
	.review-header {
		display: flex;
		align-items: center;
		gap: 0.75em;
		margin-bottom: 0.5em;
	}

	.review-avatar {
		width: var(--dragonio-google-review-widget-image-size, 40px);
		height: var(--dragonio-google-review-widget-image-size, 40px);
		border-radius: 50%;
		object-fit: cover;
	}

	.review-avatar--initials {
		display: flex;
		align-items: center;
		justify-content: center;
		background: #e5e7eb;
		color: #4b5563;
		font-weight: 600;
		font-size: 0.9em;
	}

	.reviewer-info {
		display: flex;
		flex-direction: column;
		gap: 0.15em;
	}

	.reviewer-name {
		display: flex;
		align-items: center;
		gap: 0.35em;
		font-weight: 500;
	}

	.reviewer-time {
		font-size: 0.8em;
		opacity: 0.7;
	}

	/* ============================================
	   Review Content
	   ============================================ */
	.review-content-and-images {
		display: flex;
		flex-direction: row;
		align-items: flex-start;
		gap: 1em;
		margin-top: 0.5em;
	}

	.review-card--bubble .review-content-and-images {
		margin-top: 0;
	}

	.review-content {
		flex: 1;
		font-size: 0.95em;
		line-height: 1.5;
	}

	.review-content.variable-height {
		/* Allow variable height for text - no height constraints */
		max-height: none;
	}

	.review-content p {
		margin: 0;
		white-space: pre-line;
	}

	/* ============================================
	   Show More
	   ============================================ */
	.show-more-container {
		margin-top: 0.5em;
	}

	.show-more {
		font-size: 0.85em;
		font-weight: 500;
		filter: brightness(2);
		text-decoration: underline;
		cursor: pointer;
		background: none;
		border: none;
		padding: 0;
		align-self: start;
		color: inherit;
	}

	.show-more:hover {
		filter: brightness(1.5);
	}
</style>
