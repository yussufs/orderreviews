<script lang="ts">
	import Card from './Card.svelte';
	import Icon from './Icon.svelte';
	import Text from './Text.svelte';

	type IconName = 'email' | 'link' | 'qr' | 'edit' | 'star' | 'image' | 'eye';

	interface Item {
		icon: IconName;
		title: string;
		desc: string;
		href: string;
	}

	interface Props {
		title?: string;
		items: Item[];
		/** Fixed number of columns; omit for a responsive auto-fit grid. */
		columns?: number;
	}

	let { title = 'Collect reviews', items, columns }: Props = $props();
</script>

<Card {title}>
	<div class="grid" class:fixed={!!columns} style={columns ? `--cols:${columns}` : undefined}>
		{#each items as item (item.href)}
			<a class="action-card" href={item.href}>
				<span class="action-icon"><Icon name={item.icon} /></span>
				<span class="action-body">
					<Text variant="bodyMd">{item.title}</Text>
					<Text tone="subdued" variant="bodySm">{item.desc}</Text>
				</span>
				<Icon name="chevron-right" tone="subdued" />
			</a>
		{/each}
	</div>
</Card>

<style>
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: var(--space-300);
		margin-top: var(--space-300);
	}
	.grid.fixed {
		grid-template-columns: repeat(var(--cols), minmax(0, 1fr));
	}
	@media (max-width: 600px) {
		.grid.fixed {
			grid-template-columns: 1fr;
		}
	}
	.action-card {
		display: flex;
		align-items: center;
		gap: var(--space-300);
		padding: var(--space-300) var(--space-400);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg, 12px);
		text-decoration: none;
		color: inherit;
		transition: background 0.15s ease;
	}
	.action-card:hover {
		background: var(--color-bg-surface-hover, #f6f6f7);
	}
	.action-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		border-radius: 8px;
		background: var(--color-bg-surface-secondary, #f1f1f1);
		color: var(--color-text, #1a1a1a);
		flex-shrink: 0;
	}
	.action-body {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
	}
</style>
