<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
		hoverable?: boolean;
		striped?: boolean;
	}

	let { children, hoverable = true, striped = false }: Props = $props();
</script>

<div class="data-table-wrapper">
	<table class="data-table" class:hoverable class:striped>
		{@render children()}
	</table>
</div>

<style>
	.data-table-wrapper {
		background: var(--color-bg-surface);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-card);
		overflow: hidden;
	}

	.data-table {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--font-size-md);
	}

	.data-table :global(thead) {
		background: var(--color-bg-surface-secondary);
	}

	.data-table :global(th) {
		padding: var(--space-300) var(--space-400);
		text-align: left;
		font-weight: var(--font-weight-medium);
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
		border-bottom: 1px solid var(--color-border);
		white-space: nowrap;
	}

	.data-table :global(th[data-align='right']),
	.data-table :global(th[data-align='numeric']) {
		text-align: right;
	}

	.data-table :global(th[data-align='center']) {
		text-align: center;
	}

	.data-table :global(td) {
		padding: var(--space-300) var(--space-400);
		border-bottom: 1px solid var(--color-border);
		vertical-align: middle;
	}

	.data-table :global(td[data-align='right']),
	.data-table :global(td[data-align='numeric']) {
		text-align: right;
	}

	.data-table :global(td[data-align='center']) {
		text-align: center;
	}

	.data-table :global(tbody tr:last-child td) {
		border-bottom: none;
	}

	.data-table.hoverable :global(tbody tr):hover {
		background: var(--color-bg-surface-hover);
	}

	.data-table.striped :global(tbody tr:nth-child(even)) {
		background: var(--color-bg-surface-secondary);
	}

	/* Cell content helpers */
	.data-table :global(.cell-content) {
		display: flex;
		align-items: center;
		gap: var(--space-200);
	}

	.data-table :global(.thumbnail) {
		width: 40px;
		height: 40px;
		border-radius: var(--radius-md);
		overflow: hidden;
		flex-shrink: 0;
		background: var(--color-bg-surface-secondary);
		border: 1px solid var(--color-border);
	}

	.data-table :global(.thumbnail img) {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.data-table :global(.text-subdued) {
		color: var(--color-text-secondary);
	}
</style>
