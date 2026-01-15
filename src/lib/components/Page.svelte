<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title?: string;
		subtitle?: string;
		narrow?: boolean;
		backAction?: { url: string; label?: string };
		primaryAction?: Snippet;
		secondaryActions?: Snippet;
		children: Snippet;
		aside?: Snippet;
	}

	let {
		title,
		subtitle,
		narrow = false,
		backAction,
		primaryAction,
		secondaryActions,
		children,
		aside
	}: Props = $props();
</script>

<div class="page" class:narrow>
	{#if title || backAction || primaryAction || secondaryActions}
		<div class="page-header">
			<div class="page-header-content">
				{#if backAction}
					<a href={backAction.url} class="back-action">
						<svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20">
							<path
								fill-rule="evenodd"
								d="M12.707 5.293a1 1 0 0 1 0 1.414L9.414 10l3.293 3.293a1 1 0 0 1-1.414 1.414l-4-4a1 1 0 0 1 0-1.414l4-4a1 1 0 0 1 1.414 0Z"
								clip-rule="evenodd"
							/>
						</svg>
						{#if backAction.label}
							<span>{backAction.label}</span>
						{/if}
					</a>
				{/if}
				<div class="page-title-wrapper">
					{#if title}
						<h1 class="page-title">{title}</h1>
					{/if}
					{#if subtitle}
						<p class="page-subtitle">{subtitle}</p>
					{/if}
				</div>
			</div>
			{#if primaryAction || secondaryActions}
				<div class="page-actions">
					{#if secondaryActions}
						<div class="secondary-actions">
							{@render secondaryActions()}
						</div>
					{/if}
					{#if primaryAction}
						<div class="primary-action">
							{@render primaryAction()}
						</div>
					{/if}
				</div>
			{/if}
		</div>
	{/if}

	<div class="page-body" class:has-aside={aside}>
		<div class="page-content">
			{@render children()}
		</div>
		{#if aside}
			<aside class="page-aside">
				{@render aside()}
			</aside>
		{/if}
	</div>
</div>

<style>
	.page {
		max-width: 1000px;
		margin: 0 auto;
		padding: var(--space-400) var(--space-400) var(--space-800);
	}

	.page.narrow {
		max-width: 800px;
	}

	.page-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--space-400);
		margin-bottom: var(--space-400);
		flex-wrap: wrap;
	}

	.page-header-content {
		display: flex;
		flex-direction: column;
		gap: var(--space-200);
	}

	.back-action {
		display: inline-flex;
		align-items: center;
		gap: var(--space-100);
		color: var(--color-text-secondary);
		text-decoration: none;
		font-size: var(--font-size-sm);
		margin-bottom: var(--space-100);
		transition: color var(--duration-fast) var(--ease-default);
	}

	.back-action:hover {
		color: var(--color-text);
	}

	.page-title-wrapper {
		display: flex;
		flex-direction: column;
		gap: var(--space-100);
	}

	.page-title {
		font-size: var(--font-size-xl);
		font-weight: var(--font-weight-semibold);
		line-height: var(--line-height-tight);
		margin: 0;
	}

	.page-subtitle {
		font-size: var(--font-size-md);
		color: var(--color-text-secondary);
		margin: 0;
	}

	.page-actions {
		display: flex;
		align-items: center;
		gap: var(--space-200);
		flex-wrap: wrap;
	}

	.secondary-actions {
		display: flex;
		gap: var(--space-200);
	}

	.page-body {
		display: flex;
		flex-direction: column;
		gap: var(--space-400);
	}

	.page-body.has-aside {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--space-400);
	}

	@media (min-width: 768px) {
		.page-body.has-aside {
			grid-template-columns: 2fr 1fr;
		}
	}

	.page-content {
		display: flex;
		flex-direction: column;
		gap: var(--space-400);
	}

	.page-aside {
		display: flex;
		flex-direction: column;
		gap: var(--space-400);
	}
</style>
