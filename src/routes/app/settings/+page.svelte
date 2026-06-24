<script lang="ts">
	import { Page, Card, Text, Icon } from '$lib/components';

	type IconName = 'image' | 'email' | 'star' | 'edit' | 'qr';

	const groups: {
		title: string;
		items: { icon: IconName; title: string; desc: string; href: string }[];
	}[] = [
		{
			title: 'Reviews',
			items: [
				{
					icon: 'image',
					title: 'Connected locations',
					desc: 'Connect or remove the Google business you import reviews from',
					href: '/app/locations'
				},
				{
					icon: 'email',
					title: 'Review collection emails',
					desc: 'Automated post-order emails: trigger, timing, rating type and follow-ups',
					href: '/app/review-collection'
				},
				{
					icon: 'qr',
					title: 'Get more reviews',
					desc: 'Share link, QR code and other ways to collect reviews',
					href: '/app/get-reviews'
				}
			]
		},
		{
			title: 'Feedback',
			items: [
				{
					icon: 'edit',
					title: 'Feedback form',
					desc: 'Edit the text and layout of the review form customers see',
					href: '/app/feedback/form'
				}
			]
		},
		{
			title: 'Storefront',
			items: [
				{
					icon: 'star',
					title: 'Widget appearance',
					desc: 'Choose the review widget design and add it to your storefront',
					href: '/app/widget'
				},
				{
					icon: 'edit',
					title: 'Feedback form',
					desc: 'Edit the form customers see when leaving a review',
					href: '/app/feedback/form'
				}
			]
		}
	];
</script>

<svelte:head>
	<title>Settings</title>
</svelte:head>

<Page title="Settings">
	{#each groups as group (group.title)}
		<Card title={group.title}>
			<div class="settings-grid">
				{#each group.items as item (item.href)}
					<a class="settings-card" href={item.href}>
						<span class="settings-icon"><Icon name={item.icon} /></span>
						<span class="settings-body">
							<Text variant="bodyMd">{item.title}</Text>
							<Text tone="subdued" variant="bodySm">{item.desc}</Text>
						</span>
						<Icon name="chevron-right" tone="subdued" />
					</a>
				{/each}
			</div>
		</Card>
	{/each}
</Page>

<style>
	.settings-grid {
		display: flex;
		flex-direction: column;
		gap: var(--space-300);
		margin-top: var(--space-300);
	}
	.settings-card {
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
	.settings-card:hover {
		background: var(--color-bg-surface-hover, #f6f6f7);
	}
	.settings-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		border-radius: 8px;
		background: var(--color-bg-surface-secondary, #f1f1f1);
		flex-shrink: 0;
	}
	.settings-body {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
	}
</style>
