<script lang="ts">
	/**
	 * Carousel Widget Component
	 * Displays reviews in a CSS scroll-snap carousel with loop support
	 *
	 * Variants:
	 * - primary: Standard card carousel
	 * - speech-bubble: Speech bubble style carousel
	 */
	import type { Review, GLocation, DisplaySettings } from '../lib/types';
	import Header from '../components/Header.svelte';
	import ReviewCard from '../components/ReviewCard.svelte';

	interface Props {
		reviewData: Review[];
		placeData: GLocation;
		displaySettings?: DisplaySettings;
		variant?: 'primary' | 'speech-bubble';
	}

	let { reviewData, placeData, displaySettings = {}, variant = 'primary' }: Props = $props();

	// Display settings
	const variableHeightText = $derived(displaySettings.variableheighttext || false);

	// Carousel state
	let trackElement: HTMLElement | null = $state(null);
	let containerElement: HTMLElement | null = $state(null);
	let perPage = $state(1);
	let isHovered = $state(false);
	let autoplayInterval: ReturnType<typeof setInterval> | null = null;
	let resizeObserver: ResizeObserver | null = null;
	let isScrolling = $state(false);
	let scrollTimeout: ReturnType<typeof setTimeout> | null = null;

	// Mouse drag state
	let isDragging = $state(false);
	let dragStartX = $state(0);
	let dragScrollLeft = $state(0);

	// For loop: clone slides at start and end
	const cloneCount = $derived(Math.min(perPage, reviewData.length));
	const startClones = $derived(reviewData.slice(-cloneCount));
	const endClones = $derived(reviewData.slice(0, cloneCount));

	// Slide width calculation (account for gap)
	const slideWidth = $derived.by(() => {
		if (!trackElement) return 0;
		const gap = 16; // 1em = 16px
		const containerWidth = trackElement.parentElement?.clientWidth || trackElement.clientWidth;
		return (containerWidth - gap * (perPage - 1)) / perPage;
	});

	// Total cloned slides offset
	const clonesOffset = $derived(cloneCount * (slideWidth + 16));

	// Initialize carousel
	$effect(() => {
		if (!trackElement || !containerElement) return;

		// Function to get width - use container if valid, fallback to window
		const getWidth = () => {
			const containerWidth = containerElement?.offsetWidth || 0;
			return containerWidth > 100 ? containerWidth : window.innerWidth;
		};

		// Setup responsive perPage with ResizeObserver
		resizeObserver = new ResizeObserver((entries) => {
			for (const entry of entries) {
				const width = entry.contentRect.width;
				if (width > 100) {
					updatePerPage(width);
				}
			}
		});
		resizeObserver.observe(containerElement);

		// Window resize as fallback
		const handleWindowResize = () => updatePerPage(getWidth());
		window.addEventListener('resize', handleWindowResize);

		// Delay initial check to ensure layout is complete
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				updatePerPage(getWidth());
			});
		});

		// Start autoplay
		startAutoplay();

		// Set initial scroll position (skip start clones)
		requestAnimationFrame(() => {
			if (trackElement && clonesOffset > 0) {
				trackElement.scrollLeft = clonesOffset;
			}
		});

		return () => {
			stopAutoplay();
			window.removeEventListener('resize', handleWindowResize);
			if (resizeObserver) {
				resizeObserver.disconnect();
				resizeObserver = null;
			}
		};
	});

	// Handle scroll end for loop behavior
	$effect(() => {
		if (!trackElement) return;

		const handleScroll = () => {
			if (scrollTimeout) clearTimeout(scrollTimeout);
			isScrolling = true;

			scrollTimeout = setTimeout(() => {
				isScrolling = false;
				handleScrollEnd();
			}, 100);
		};

		trackElement.addEventListener('scroll', handleScroll, { passive: true });

		return () => {
			trackElement?.removeEventListener('scroll', handleScroll);
			if (scrollTimeout) clearTimeout(scrollTimeout);
		};
	});

	function updatePerPage(containerWidth: number) {
		if (containerWidth >= 800) {
			perPage = 3;
		} else if (containerWidth >= 600) {
			perPage = 2;
		} else {
			perPage = 1;
		}
	}

	function handleScrollEnd() {
		if (!trackElement || isScrolling) return;

		const scrollLeft = trackElement.scrollLeft;
		const totalRealSlides = reviewData.length;
		const singleSlideWidth = slideWidth + 16;
		const totalRealWidth = totalRealSlides * singleSlideWidth;

		// Check if we're at the start clones (need to jump to end)
		if (scrollLeft < singleSlideWidth * 0.5) {
			// Jump to the real end (before end clones)
			trackElement.style.scrollBehavior = 'auto';
			trackElement.scrollLeft = clonesOffset + totalRealWidth - singleSlideWidth;
			requestAnimationFrame(() => {
				if (trackElement) trackElement.style.scrollBehavior = 'smooth';
			});
		}
		// Check if we're at the end clones (need to jump to start)
		else if (scrollLeft >= clonesOffset + totalRealWidth - singleSlideWidth * 0.5) {
			// Jump to the real start (after start clones)
			trackElement.style.scrollBehavior = 'auto';
			trackElement.scrollLeft = clonesOffset;
			requestAnimationFrame(() => {
				if (trackElement) trackElement.style.scrollBehavior = 'smooth';
			});
		}
	}

	function startAutoplay() {
		stopAutoplay();
		autoplayInterval = setInterval(() => {
			if (!isHovered && !isScrolling) {
				scrollNext();
			}
		}, 3000);
	}

	function stopAutoplay() {
		if (autoplayInterval) {
			clearInterval(autoplayInterval);
			autoplayInterval = null;
		}
	}

	function scrollNext() {
		if (!trackElement) return;
		const singleSlideWidth = slideWidth + 16;
		trackElement.scrollBy({ left: singleSlideWidth, behavior: 'smooth' });
	}

	function scrollPrev() {
		if (!trackElement) return;
		const singleSlideWidth = slideWidth + 16;
		trackElement.scrollBy({ left: -singleSlideWidth, behavior: 'smooth' });
	}

	function handleMouseEnter() {
		isHovered = true;
	}

	function handleMouseLeave() {
		isHovered = false;
		// End drag if mouse leaves
		if (isDragging) {
			handleDragEnd();
		}
	}

	// Mouse drag handlers
	function handleDragStart(e: MouseEvent) {
		if (!trackElement) return;
		isDragging = true;
		dragStartX = e.pageX - trackElement.offsetLeft;
		dragScrollLeft = trackElement.scrollLeft;
		// Disable smooth scroll during drag
		trackElement.style.scrollBehavior = 'auto';
		trackElement.style.scrollSnapType = 'none';
	}

	function handleDragMove(e: MouseEvent) {
		if (!isDragging || !trackElement) return;
		e.preventDefault();
		const x = e.pageX - trackElement.offsetLeft;
		const walk = (x - dragStartX) * 1.5; // Multiply for faster drag
		trackElement.scrollLeft = dragScrollLeft - walk;
	}

	function handleDragEnd() {
		if (!trackElement) return;
		isDragging = false;
		// Re-enable smooth scroll and snap
		trackElement.style.scrollBehavior = 'smooth';
		trackElement.style.scrollSnapType = 'x mandatory';
	}
</script>

<div
	class="widget-container"
	bind:this={containerElement}
	onmouseenter={handleMouseEnter}
	onmouseleave={handleMouseLeave}
	role="region"
	aria-label="Reviews carousel"
>
	<Header place={placeData} />

	<div class="reviews-carousel">
		<div class="carousel-wrapper">
			<button
				class="carousel-arrow carousel-arrow-prev"
				onclick={scrollPrev}
				aria-label="Previous slide"
			>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M15 18l-6-6 6-6" />
				</svg>
			</button>

			<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
			<div
				class="carousel-track"
				class:dragging={isDragging}
				class:variable-height={variableHeightText}
				bind:this={trackElement}
				style="--per-page: {perPage}; --slide-gap: 16px;"
				onmousedown={handleDragStart}
				onmousemove={handleDragMove}
				onmouseup={handleDragEnd}
				onmouseleave={handleDragEnd}
				role="list"
			>
				<!-- Start clones for loop -->
				{#each startClones as review, i}
					<div class="carousel-slide clone" aria-hidden="true">
						<ReviewCard
							{review}
							{displaySettings}
							variant={variant === 'speech-bubble' ? 'bubble' : 'card'}
						/>
					</div>
				{/each}

				<!-- Real slides -->
				{#each reviewData as review, index}
					<div class="carousel-slide">
						<ReviewCard
							{review}
							{displaySettings}
							variant={variant === 'speech-bubble' ? 'bubble' : 'card'}
						/>
					</div>
				{/each}

				<!-- End clones for loop -->
				{#each endClones as review, i}
					<div class="carousel-slide clone" aria-hidden="true">
						<ReviewCard
							{review}
							{displaySettings}
							variant={variant === 'speech-bubble' ? 'bubble' : 'card'}
						/>
					</div>
				{/each}
			</div>

			<button
				class="carousel-arrow carousel-arrow-next"
				onclick={scrollNext}
				aria-label="Next slide"
			>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M9 18l6-6-6-6" />
				</svg>
			</button>
		</div>
	</div>
</div>

<style>
	/* ============================================
	   Carousel Container
	   ============================================ */

	.widget-container {
		display: block;
		width: 100%;
		max-width: 100%;
		background: var(--dragonio-google-review-widget-background);
		padding: var(--dragonio-google-review-widget-padding);
		border-radius: var(--dragonio-google-review-widget-border-radius);
		box-shadow: var(--dragonio-google-review-widget-box-shadow);
		box-sizing: border-box;
	}

	/* ============================================
	   Reviews Carousel
	   ============================================ */

	.reviews-carousel {
		margin-top: 1em;
	}

	.carousel-wrapper {
		position: relative;
	}

	.carousel-track {
		display: flex;
		gap: var(--slide-gap);
		overflow-x: auto;
		scroll-snap-type: x mandatory;
		scroll-behavior: smooth;
		-webkit-overflow-scrolling: touch;
		scrollbar-width: none;
		-ms-overflow-style: none;
		padding: 4px 0; /* Allow for card shadows */
		cursor: grab;
	}

	.carousel-track::-webkit-scrollbar {
		display: none;
	}

	.carousel-track.dragging {
		cursor: grabbing;
		user-select: none;
	}

	.carousel-track.variable-height {
		align-items: flex-start;
	}

	.carousel-slide {
		flex: 0 0 calc((100% - var(--slide-gap) * (var(--per-page) - 1)) / var(--per-page));
		scroll-snap-align: start;
		min-width: 0;
	}

	/* Fixed height mode: cards fill their slide container */
	.carousel-slide :global(.review-card) {
		height: 100%;
		display: flex;
		flex-direction: column;
	}

	/* Variable height mode: cards are natural height */
	.carousel-track.variable-height .carousel-slide :global(.review-card) {
		height: auto;
	}

	/* Arrow buttons */
	.carousel-arrow {
		position: absolute;
		top: 20%;
		width: 40px;
		height: 40px;
		border-radius: 50%;
		border: none;
		background: var(--dragonio-google-review-widget-button-background, #f3f3f3);
		color: var(--dragonio-google-review-widget-button-color, #333);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 10;
		transition:
			opacity 0.2s,
			transform 0.2s;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
	}

	.carousel-arrow:hover {
		opacity: 0.8;
		transform: scale(1.05);
	}

	.carousel-arrow:active {
		transform: scale(0.95);
	}

	.carousel-arrow svg {
		width: 20px;
		height: 20px;
	}

	.carousel-arrow-prev {
		left: 8px;
	}

	.carousel-arrow-next {
		right: 8px;
	}

	/* Mobile adjustments */
	@media (max-width: 600px) {
		.carousel-arrow {
			width: 32px;
			height: 32px;
		}

		.carousel-arrow svg {
			width: 16px;
			height: 16px;
		}

		.carousel-arrow-prev {
			left: 4px;
		}

		.carousel-arrow-next {
			right: 4px;
		}
	}
</style>
