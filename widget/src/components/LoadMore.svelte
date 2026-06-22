<script lang="ts">
	/**
	 * Load More Button Component
	 * Triggers loading of additional reviews
	 */

	interface Props {
		loading?: boolean;
		hasMore: boolean;
		onclick: () => void;
	}

	let { loading = false, hasMore, onclick }: Props = $props();
</script>

{#if hasMore}
	<div class="load-more-container">
		<button class="load-more" {onclick} disabled={loading}>
			{#if loading}
				<span class="load-more-spinner"></span>
				Loading...
			{:else}
				Load More
			{/if}
		</button>
	</div>
{/if}

<style>
	.load-more-container {
		display: flex;
		justify-content: center;
		margin-top: 1.5em;
	}

	.load-more {
		background: var(--dragonio-google-review-widget-button-background);
		color: var(--dragonio-google-review-widget-button-color);
		padding: 0.75em 2em;
		border-radius: 8px;
		font-weight: 500;
		border: none;
		cursor: pointer;
		font-size: 1em;
		display: flex;
		align-items: center;
		gap: 0.5em;
		transition: opacity 0.2s;
	}

	.load-more:hover:not(:disabled) {
		filter: brightness(0.9);
	}

	.load-more:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	.load-more-spinner {
		width: 16px;
		height: 16px;
		border: 2px solid currentColor;
		border-top-color: transparent;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
