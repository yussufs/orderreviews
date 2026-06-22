<script lang="ts">
	/**
	 * Star Rating Component
	 * Displays a 5-star rating with filled/empty states
	 */
	import StarIcon from '../icons/StarIcon.svelte';

	interface Props {
		rating: number;
		size?: 'sm' | 'md' | 'lg';
	}

	let { rating, size = 'md' }: Props = $props();

	// Generate array of 5 stars with filled state based on rating
	const stars = $derived(
		Array.from({ length: 5 }, (_, i) => ({
			index: i,
			filled: i < Math.round(rating)
		}))
	);
</script>

<div class="stars stars--{size}">
	{#each stars as star (star.index)}
		<StarIcon filled={star.filled} />
	{/each}
</div>

<style>
	.stars {
		display: flex;
		align-items: center;
		gap: 0;
	}

	.stars--sm :global(.star) {
		width: 0.9em;
		height: 0.9em;
	}

	.stars--md :global(.star) {
		width: 1.2em;
		height: 1.2em;
	}

	.stars--lg :global(.star) {
		width: 1.5em;
		height: 1.5em;
	}
</style>
