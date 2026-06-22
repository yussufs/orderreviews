<script lang="ts">
	/**
	 * Lightbox Component
	 * Full-screen image viewer with navigation
	 */
	import { lightboxStore, closeLightbox, nextImage, prevImage } from '../lib/lightbox';

	// Touch handling for swipe
	let touchStartX = 0;
	let touchEndX = 0;
	const SWIPE_THRESHOLD = 50;

	function handleTouchStart(e: TouchEvent) {
		touchStartX = e.touches[0].clientX;
	}

	function handleTouchEnd(e: TouchEvent) {
		touchEndX = e.changedTouches[0].clientX;
		handleSwipe();
	}

	function handleSwipe() {
		const diff = touchStartX - touchEndX;
		if (Math.abs(diff) > SWIPE_THRESHOLD) {
			if (diff > 0) {
				nextImage();
			} else {
				prevImage();
			}
		}
	}

	// Keyboard handling
	function handleKeydown(e: KeyboardEvent) {
		if (!$lightboxStore.isOpen) return;

		switch (e.key) {
			case 'Escape':
				closeLightbox();
				break;
			case 'ArrowLeft':
				prevImage();
				break;
			case 'ArrowRight':
				nextImage();
				break;
		}
	}

	// Handle backdrop click (close if clicking outside image)
	function handleBackdropClick(e: MouseEvent) {
		const target = e.target as HTMLElement;
		if (target.classList.contains('lightbox-backdrop')) {
			closeLightbox();
		}
	}

	// Preload adjacent images
	function preloadImages(images: string[], currentIndex: number) {
		const indicesToPreload = [
			(currentIndex - 1 + images.length) % images.length,
			(currentIndex + 1) % images.length
		];

		indicesToPreload.forEach((i) => {
			if (images[i]) {
				const img = new Image();
				img.src = images[i];
			}
		});
	}

	// Preload adjacent images when lightbox opens or navigates
	$: if ($lightboxStore.isOpen && $lightboxStore.images.length > 1) {
		preloadImages($lightboxStore.images, $lightboxStore.currentIndex);
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if $lightboxStore.isOpen}
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions a11y_click_events_have_key_events a11y_interactive_supports_focus -->
	<div
		class="lightbox-backdrop"
		onclick={handleBackdropClick}
		onkeydown={(e) => e.key === 'Escape' && closeLightbox()}
		ontouchstart={handleTouchStart}
		ontouchend={handleTouchEnd}
		role="dialog"
		aria-modal="true"
		aria-label="Image lightbox"
		tabindex="-1"
	>
		<!-- Close button -->
		<button class="lightbox-close" onclick={closeLightbox} aria-label="Close lightbox">
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M18 6L6 18M6 6l12 12" />
			</svg>
		</button>

		<!-- Image counter -->
		{#if $lightboxStore.images.length > 1}
			<div class="lightbox-counter">
				{$lightboxStore.currentIndex + 1} / {$lightboxStore.images.length}
			</div>
		{/if}

		<!-- Main image -->
		<div class="lightbox-content">
			{#if $lightboxStore.images[$lightboxStore.currentIndex]}
				<img
					src={$lightboxStore.images[$lightboxStore.currentIndex]}
					alt="Image {$lightboxStore.currentIndex + 1} of {$lightboxStore.images.length}"
					class="lightbox-image"
				/>
			{/if}
		</div>

		<!-- Navigation arrows -->
		{#if $lightboxStore.images.length > 1}
			<button class="lightbox-nav lightbox-prev" onclick={prevImage} aria-label="Previous image">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M15 18l-6-6 6-6" />
				</svg>
			</button>

			<button class="lightbox-nav lightbox-next" onclick={nextImage} aria-label="Next image">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M9 18l6-6-6-6" />
				</svg>
			</button>
		{/if}
	</div>
{/if}

<style>
	.lightbox-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.9);
		z-index: 10000;
		display: flex;
		align-items: center;
		justify-content: center;
		animation: fadeIn 0.2s ease-out;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	.lightbox-close {
		position: absolute;
		top: 16px;
		right: 16px;
		width: 44px;
		height: 44px;
		background: rgba(255, 255, 255, 0.1);
		border: none;
		border-radius: 50%;
		color: white;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: background 0.2s;
		z-index: 10001;
	}

	.lightbox-close:hover {
		background: rgba(255, 255, 255, 0.2);
	}

	.lightbox-close svg {
		width: 24px;
		height: 24px;
	}

	.lightbox-counter {
		position: absolute;
		top: 16px;
		left: 50%;
		transform: translateX(-50%);
		color: white;
		font-size: 14px;
		font-weight: 500;
		background: rgba(0, 0, 0, 0.5);
		padding: 6px 12px;
		border-radius: 20px;
		z-index: 10001;
	}

	.lightbox-content {
		max-width: 90vw;
		max-height: 90vh;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.lightbox-image {
		max-width: 100%;
		max-height: 90vh;
		object-fit: contain;
		border-radius: 4px;
		animation: scaleIn 0.2s ease-out;
	}

	@keyframes scaleIn {
		from {
			transform: scale(0.95);
			opacity: 0;
		}
		to {
			transform: scale(1);
			opacity: 1;
		}
	}

	.lightbox-nav {
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
		width: 48px;
		height: 48px;
		background: rgba(255, 255, 255, 0.1);
		border: none;
		border-radius: 50%;
		color: white;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: background 0.2s;
		z-index: 10001;
	}

	.lightbox-nav:hover {
		background: rgba(255, 255, 255, 0.2);
	}

	.lightbox-nav svg {
		width: 28px;
		height: 28px;
	}

	.lightbox-prev {
		left: 16px;
	}

	.lightbox-next {
		right: 16px;
	}

	/* Mobile adjustments */
	@media (max-width: 600px) {
		.lightbox-nav {
			width: 40px;
			height: 40px;
		}

		.lightbox-nav svg {
			width: 24px;
			height: 24px;
		}

		.lightbox-prev {
			left: 8px;
		}

		.lightbox-next {
			right: 8px;
		}

		.lightbox-close {
			top: 8px;
			right: 8px;
			width: 40px;
			height: 40px;
		}

		.lightbox-counter {
			top: 8px;
		}
	}
</style>
