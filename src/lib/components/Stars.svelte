<script lang="ts">
	/**
	 * Star rating display using the same Material star SVG as the hosted review
	 * form. Renders `round(value)` filled stars by default; set `showEmpty` to
	 * always render `max` stars (filled + muted outline) like a full rating row.
	 */
	interface Props {
		value: number | null | undefined;
		size?: number;
		max?: number;
		showEmpty?: boolean;
	}

	let { value, size = 16, max = 5, showEmpty = false }: Props = $props();

	const FILL =
		'M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z';
	const BORDER =
		'm22 9.24-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03zM12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28z';

	const filled = $derived(Math.max(0, Math.min(max, Math.round(value ?? 0))));
	const items = $derived(Array.from({ length: showEmpty ? max : filled }, (_, i) => i));
</script>

<span class="stars" style="--s:{size}px" aria-label={`${filled} out of ${max} stars`}>
	{#each items as i (i)}
		<svg viewBox="0 0 24 24" class="star" class:empty={showEmpty && i >= filled} aria-hidden="true">
			<path d={showEmpty && i >= filled ? BORDER : FILL} />
		</svg>
	{/each}
</span>

<style>
	.stars {
		display: inline-flex;
		gap: 1px;
		vertical-align: middle;
		line-height: 0;
	}
	.star {
		width: var(--s);
		height: var(--s);
		fill: #fbbc04;
		flex-shrink: 0;
	}
	.star.empty {
		fill: #d1d5db;
	}
</style>
