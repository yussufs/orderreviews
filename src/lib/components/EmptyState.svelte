<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		heading: string;
		description?: string;
		image?: string;
		imageAlt?: string;
		children?: Snippet;
	}

	let { heading, description, image, imageAlt = '', children }: Props = $props();
</script>

<div class="empty-state">
	{#if image}
		<img src={image} alt={imageAlt} class="empty-state-image" />
	{/if}
	<div class="empty-state-content">
		<h3 class="empty-state-heading">{heading}</h3>
		{#if description}
			<p class="empty-state-description">{description}</p>
		{/if}
	</div>
	{#if children}
		<div class="empty-state-actions">
			{@render children()}
		</div>
	{/if}
</div>

<style>
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-400);
		padding: var(--space-800) var(--space-400);
		text-align: center;
	}

	.empty-state-image {
		max-width: 200px;
		max-height: 160px;
		object-fit: contain;
	}

	.empty-state-content {
		display: flex;
		flex-direction: column;
		gap: var(--space-200);
		max-width: 400px;
	}

	.empty-state-heading {
		font-size: var(--font-size-lg);
		font-weight: var(--font-weight-semibold);
		margin: 0;
	}

	.empty-state-description {
		font-size: var(--font-size-md);
		color: var(--color-text-secondary);
		margin: 0;
	}

	.empty-state-actions {
		display: flex;
		gap: var(--space-200);
		flex-wrap: wrap;
		justify-content: center;
	}
</style>
