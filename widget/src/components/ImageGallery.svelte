<script lang="ts">
	/**
	 * Image Gallery Component
	 * Displays review images with stacked preview and lightbox support
	 */
	import { openLightbox } from '../lib/lightbox';

	interface Props {
		images: string[];
		maxVisible?: number;
		reviewId: string;
	}

	let { images, maxVisible = 2, reviewId }: Props = $props();

	const visibleImages = $derived(images.slice(0, maxVisible));
	const hiddenCount = $derived(images.length - maxVisible);
	const hasHiddenImages = $derived(hiddenCount > 0);

	// Handle image click to open lightbox
	function handleImageClick(e: MouseEvent, index: number) {
		e.preventDefault();
		openLightbox(images, 0); // Always open from first image
	}

	// Handle overlay click to open lightbox at first hidden image
	function handleOverlayClick() {
		openLightbox(images, 0); // Always open from first image
	}
</script>

<div class="review-images" style="--review-image-count: {Math.min(maxVisible, images.length)}">
	{#each images as imageUrl, index}
		<button
			class="image-button"
			onclick={(e) => handleImageClick(e, index)}
			aria-label="View image {index + 1} of {images.length}"
		>
			<img
				class="review-image"
				class:hidden={index >= maxVisible}
				style="--review-image-index: {index}"
				src={imageUrl}
				alt="Review Image {index + 1}"
				loading="lazy"
			/>
		</button>
	{/each}

	{#if hasHiddenImages}
		<button class="review-image-overlay" onclick={handleOverlayClick}>
			+{hiddenCount}
		</button>
	{/if}
</div>

<style>
	.review-images {
		position: relative;
		--review-image-width: var(--dragonio-google-review-image-width, 64px);
		--review-image-overlap: calc(var(--review-image-width) * 0.25);
		width: calc(
			var(--review-image-width) + (var(--review-image-count) - 1) * var(--review-image-overlap)
		);
		min-width: calc(
			var(--review-image-width) + (var(--review-image-count) - 1) * var(--review-image-overlap)
		);
		height: calc(var(--review-image-width) * (5 / 4));
	}

	.image-button {
		display: block;
		padding: 0;
		margin: 0;
		border: none;
		background: none;
		cursor: pointer;
	}

	.review-image {
		position: absolute;
		top: 0;
		left: calc(var(--review-image-index) * var(--review-image-overlap));
		width: var(--review-image-width);
		aspect-ratio: 4 / 5;
		object-fit: cover;
		border-radius: var(--dragonio-google-review-image-border-radius, 20px);
		border: 2px solid white;
		z-index: var(--review-image-index);
	}

	.review-image.hidden {
		display: none;
	}

	.review-image-overlay {
		cursor: pointer;
		position: absolute;
		top: 0;
		left: calc((var(--review-image-count) - 1) * var(--review-image-overlap));
		width: var(--review-image-width);
		height: calc(var(--review-image-width) * (5 / 4));
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.6);
		color: #fff;
		font-size: 1.5em;
		font-weight: bold;
		font-family: inherit;
		border-radius: var(--dragonio-google-review-image-border-radius, 20px);
		border: 2px solid white;
		padding: 0;
		z-index: calc(var(--review-image-count) + 1);
	}
</style>
