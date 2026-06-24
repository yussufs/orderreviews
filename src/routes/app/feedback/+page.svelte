<script lang="ts">
	import { onMount } from 'svelte';
	import {
		Page,
		Button,
		Banner,
		Badge,
		Text,
		Select,
		DataTableView,
		CollectReviewsCard,
		ConfirmDialog
	} from '$lib/components';
	import { apiFetch } from '$lib/client/api';
	import { SMART_ACTIONS } from '$lib/smart-actions';

	interface Feedback {
		id: string;
		rating: number;
		message: string | null;
		customerEmail: string | null;
		source: 'order' | 'link';
		createdAt: string;
	}

	let feedback = $state<Feedback[]>([]);
	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let query = $state('');
	let sourceFilter = $state('all');
	let confirmId = $state<string | null>(null);
	let deleting = $state(false);

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

	const filtered = $derived(
		feedback.filter((f) => {
			if (sourceFilter !== 'all' && f.source !== sourceFilter) return false;
			if (query.trim()) {
				const q = query.toLowerCase();
				const hay = `${f.message ?? ''} ${f.customerEmail ?? ''}`.toLowerCase();
				if (!hay.includes(q)) return false;
			}
			return true;
		})
	);

	const sourceOptions = [
		{ value: 'all', label: 'All sources' },
		{ value: 'order', label: 'Order email' },
		{ value: 'link', label: 'Shared link' }
	];

	const columns = [
		{ label: 'Rating' },
		{ label: 'Feedback' },
		{ label: 'Customer' },
		{ label: 'Source' },
		{ label: 'Date' },
		{ label: '', align: 'right' as const }
	];

	async function doDelete() {
		if (!confirmId) return;
		deleting = true;
		try {
			await apiFetch(`/app/api/feedback/${confirmId}`, { method: 'DELETE' });
			feedback = feedback.filter((f) => f.id !== confirmId);
			confirmId = null;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Delete failed';
		} finally {
			deleting = false;
		}
	}

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
	{#snippet secondaryActions()}
		<Button variant="secondary" href="/app/feedback/form">Edit feedback page</Button>
	{/snippet}
	{#snippet primaryAction()}
		<Button variant="primary" href="/app/get-reviews">Get more reviews</Button>
	{/snippet}

	{#if error}
		<Banner tone="critical" title="Something went wrong">{error}</Banner>
	{/if}

	<CollectReviewsCard title="Smart actions" items={SMART_ACTIONS} columns={2} />

	<DataTableView
		{columns}
		rows={filtered}
		rowKey={(f) => f.id}
		loading={isLoading}
		pageSize={10}
		searchValue={query}
		searchPlaceholder="Search feedback or customer"
		onsearch={(v) => (query = v)}
		emptyHeading={feedback.length === 0 ? 'No feedback yet' : 'No matching feedback'}
		emptyDescription={feedback.length === 0
			? 'Feedback from customers who rated below your threshold appears here.'
			: 'Try adjusting your search or filters.'}
	>
		{#snippet filters()}
			<Select
				name="source"
				label="Source"
				labelHidden
				value={sourceFilter}
				options={sourceOptions}
				onchange={(e) => (sourceFilter = (e.target as HTMLSelectElement).value)}
			/>
		{/snippet}

		{#snippet row(f)}
			<td><Badge tone={f.rating <= 2 ? 'critical' : 'caution'}>{f.rating}/5</Badge></td>
			<td><span class="msg">{f.message || '—'}</span></td>
			<td>
				{#if f.customerEmail}
					<a class="email" href="mailto:{f.customerEmail}">{f.customerEmail}</a>
				{:else}
					<Text tone="subdued">—</Text>
				{/if}
			</td>
			<td><Text tone="subdued">{f.source === 'link' ? 'Shared link' : 'Order email'}</Text></td>
			<td>{formatDate(f.createdAt)}</td>
			<td data-align="right">
				<Button size="slim" variant="secondary" tone="critical" onclick={() => (confirmId = f.id)}>
					Delete
				</Button>
			</td>
		{/snippet}
	</DataTableView>

	<ConfirmDialog
		open={!!confirmId}
		title="Delete this feedback?"
		message="This permanently removes the feedback entry. This can't be undone."
		confirmLabel="Delete"
		loading={deleting}
		onconfirm={doDelete}
		oncancel={() => (confirmId = null)}
	/>
</Page>

<style>
	.msg {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
		max-width: 360px;
		color: var(--color-text-secondary, #4b5563);
	}
	.email {
		color: var(--color-text-info, var(--color-text-link));
		text-decoration: none;
		font-size: 0.875rem;
	}
</style>
