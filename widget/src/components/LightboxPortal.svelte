<script lang="ts">
	/**
	 * Lightbox Portal Component
	 * Renders to document.body to escape Shadow DOM constraints
	 * Uses inline styles since it's outside Shadow DOM
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
		if (target.classList.contains('dragonio-lightbox-backdrop')) {
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

	// Lock body scroll when lightbox is open
	$: if (typeof document !== 'undefined') {
		if ($lightboxStore.isOpen) {
			document.body.style.overflow = 'hidden';
		} else {
			document.body.style.overflow = '';
		}
	}

	// Inject keyframe animations into document head (only once)
	function ensureAnimationStyles() {
		if (typeof document === 'undefined') return;
		if (document.getElementById('dragonio-lightbox-animations')) return;

		const style = document.createElement('style');
		style.id = 'dragonio-lightbox-animations';
		style.textContent = `
			@keyframes dragonioLightboxFadeIn {
				from { opacity: 0; }
				to { opacity: 1; }
			}
			@keyframes dragonioLightboxScaleIn {
				from { transform: scale(0.95); opacity: 0; }
				to { transform: scale(1); opacity: 1; }
			}
		`;
		document.head.appendChild(style);
	}

	// Ensure animations are available when component mounts
	$: if ($lightboxStore.isOpen) {
		ensureAnimationStyles();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if $lightboxStore.isOpen}
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions a11y_click_events_have_key_events a11y_interactive_supports_focus -->
	<div
		class="dragonio-lightbox-backdrop"
		onclick={handleBackdropClick}
		onkeydown={(e) => e.key === 'Escape' && closeLightbox()}
		ontouchstart={handleTouchStart}
		ontouchend={handleTouchEnd}
		role="dialog"
		aria-modal="true"
		aria-label="Image lightbox"
		tabindex="-1"
		style="
			position: fixed;
			top: 0;
			left: 0;
			width: 100vw;
			height: 100vh;
			background: rgba(0, 0, 0, 0.9);
			z-index: 2147483647;
			display: flex;
			align-items: center;
			justify-content: center;
			animation: dragonioLightboxFadeIn 0.2s ease-out;
			pointer-events: auto;
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		"
	>
		<!-- Close button -->
		<button
			class="dragonio-lightbox-close"
			onclick={closeLightbox}
			aria-label="Close lightbox"
			style="
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
				z-index: 2147483648;
				transition: background 0.2s;
			"
			onmouseenter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)')}
			onmouseleave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)')}
		>
			<svg
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				style="width: 24px; height: 24px;"
			>
				<path d="M18 6L6 18M6 6l12 12" />
			</svg>
		</button>

		<!-- Image counter -->
		{#if $lightboxStore.images.length > 1}
			<div
				style="
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
					z-index: 2147483648;
				"
			>
				{$lightboxStore.currentIndex + 1} / {$lightboxStore.images.length}
			</div>
		{/if}

		<!-- Main image -->
		<div
			style="
				max-width: 90vw;
				max-height: 90vh;
				display: flex;
				align-items: center;
				justify-content: center;
			"
		>
			{#if $lightboxStore.images[$lightboxStore.currentIndex]}
				<img
					src={$lightboxStore.images[$lightboxStore.currentIndex]}
					alt="Image {$lightboxStore.currentIndex + 1} of {$lightboxStore.images.length}"
					style="
						max-width: 100%;
						max-height: 90vh;
						object-fit: contain;
						border-radius: 4px;
						animation: dragonioLightboxScaleIn 0.2s ease-out;
					"
				/>
			{/if}
		</div>

		<!-- Navigation arrows -->
		{#if $lightboxStore.images.length > 1}
			<button
				onclick={prevImage}
				aria-label="Previous image"
				style="
					position: absolute;
					top: 50%;
					left: 16px;
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
					z-index: 2147483648;
					transition: background 0.2s;
				"
				onmouseenter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)')}
				onmouseleave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)')}
			>
				<svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					style="width: 28px; height: 28px;"
				>
					<path d="M15 18l-6-6 6-6" />
				</svg>
			</button>

			<button
				onclick={nextImage}
				aria-label="Next image"
				style="
					position: absolute;
					top: 50%;
					right: 16px;
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
					z-index: 2147483648;
					transition: background 0.2s;
				"
				onmouseenter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)')}
				onmouseleave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)')}
			>
				<svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					style="width: 28px; height: 28px;"
				>
					<path d="M9 18l6-6-6-6" />
				</svg>
			</button>
		{/if}
	</div>
{/if}
