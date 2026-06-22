<script lang="ts">
	import { onMount } from 'svelte';
	import { Page, Card, Banner, Badge, Text, Spinner, EmptyState } from '$lib/components';
	import { apiFetch } from '$lib/client/api';

	interface Feedback {
		id: string;
		rating: number;
		message: string | null;
		customerEmail: string | null;
		createdAt: string;
	}

	let feedback = $state<Feedback[]>([]);
	let isLoading = $state(true);
	let error = $state<string | null>(null);

	onMount(async () => {
		try {
			const data = await apiFetch<{ feedback: Feedback[] }>('/app/api/feedback');
			feedback = data.feedback;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load feedback';
		} finally {
			isLoading = false;
		}
	});

	function formatDate(iso: string): string {
		return new Date(iso).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}
</script>

<svelte:head>
	<title>Feedback</title>
</svelte:head>

<Page title="Private feedback">
	{#if error}
		<Banner tone="critical" title="Something went wrong">{error}</Banner>
	{/if}

	<Card padding="none">
		{#if isLoading}
			<div class="centered"><Spinner /></div>
		{:else if feedback.length === 0}
			<EmptyState
				heading="No feedback yet"
				description="Private feedback from customers who rated below your threshold will appear here."
			/>
		{:else}
			<ul class="list">
				{#each feedback as f (f.id)}
					<li>
						<div class="meta">
							<Badge tone={f.rating <= 2 ? 'critical' : 'caution'}>{f.rating}/5</Badge>
							<Text tone="subdued">{formatDate(f.createdAt)}</Text>
						</div>
						<p class="message">{f.message || '(no message)'}</p>
						{#if f.customerEmail}
							<a class="email" href="mailto:{f.customerEmail}">{f.customerEmail}</a>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
	</Card>
</Page>

<style>
	.list {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.list li {
		padding: var(--space-400);
		border-bottom: 1px solid var(--color-border);
	}
	.list li:last-child {
		border-bottom: none;
	}
	.meta {
		display: flex;
		align-items: center;
		gap: var(--space-200);
		margin-bottom: var(--space-200);
	}
	.message {
		margin: 0 0 var(--space-200);
		white-space: pre-wrap;
	}
	.email {
		color: var(--color-text-info, var(--color-text-link));
		text-decoration: none;
		font-size: 0.875rem;
	}
	.centered {
		display: flex;
		justify-content: center;
		padding: var(--space-600);
	}
</style>
