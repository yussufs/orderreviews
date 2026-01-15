<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		tone?: 'default' | 'success' | 'info' | 'caution' | 'warning' | 'critical';
		size?: 'small' | 'medium';
		children: Snippet;
	}

	let { tone = 'default', size = 'medium', children }: Props = $props();
</script>

<span
	class="badge"
	class:success={tone === 'success'}
	class:info={tone === 'info'}
	class:caution={tone === 'caution'}
	class:warning={tone === 'warning'}
	class:critical={tone === 'critical'}
	class:small={size === 'small'}
>
	{@render children()}
</span>

<style>
	.badge {
		display: inline-flex;
		align-items: center;
		gap: var(--space-100);
		padding: var(--space-050) var(--space-200);
		font-size: var(--font-size-300);
		font-weight: var(--font-weight-medium);
		line-height: var(--line-height-500);
		border-radius: var(--radius-full);
		background: var(--color-bg-fill-secondary);
		color: var(--color-text);
	}

	.badge.success {
		background: var(--color-bg-surface-success);
		color: var(--color-text-success);
	}

	.badge.info {
		background: var(--color-bg-surface-info);
		color: var(--color-text-info);
	}

	.badge.caution {
		background: var(--color-bg-surface-caution);
		color: var(--color-text-caution);
	}

	.badge.warning {
		background: var(--color-bg-surface-warning);
		color: var(--color-text-warning);
	}

	.badge.critical {
		background: var(--color-bg-surface-critical);
		color: var(--color-text-critical);
	}

	.badge.small {
		padding: var(--space-025) var(--space-150);
		font-size: var(--font-size-275);
	}
</style>
