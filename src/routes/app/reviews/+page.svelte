<script lang="ts">
	import { onMount } from 'svelte';
	import {
		Page,
		Card,
		Button,
		Banner,
		Badge,
		Text,
		Select,
		Icon,
		DataTableView
	} from '$lib/components';
	import { apiFetch } from '$lib/client/api';

	interface ReviewRow {
		reviewId: string;
		placeId: string;
		text: string | null;
		name: string | null;
		stars: number | null;
		publishedAtDate: string | null;
		reviewerPhotoUrl: string | null;
		hidden: boolean | null;
		locationTitle: string | null;
	}
	interface Location {
		placeId: string;
		title: string;
	}

	let reviews = $state<ReviewRow[]>([]);
	let locations = $state<Location[]>([]);
	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let busy = $state<Record<string, boolean>>({});

	// Filters
	let query = $state('');
	let ratingFilter = $state('all');
	let statusFilter = $state('all');
	let locationFilter = $state('');

	onMount(async () => {
		try {
			const [revData, locData] = await Promise.all([
				apiFetch<{ reviews: ReviewRow[] }>('/app/api/reviews'),
				apiFetch<{ locations: Location[] }>('/app/api/locations')
			]);
			reviews = revData.reviews;
			locations = locData.locations;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load reviews';
		} finally {
			isLoading = false;
		}
	});

	const filtered = $derived(
		reviews.filter((r) => {
			if (query.trim()) {
				const q = query.toLowerCase();
				const hay = `${r.name ?? ''} ${r.text ?? ''}`.toLowerCase();
				if (!hay.includes(q)) return false;
			}
			if (ratingFilter !== 'all') {
				const s = r.stars ?? 0;
				if (ratingFilter === '5' && s < 5) return false;
				if (ratingFilter === '4' && s < 4) return false;
				if (ratingFilter === 'low' && s > 3) return false;
			}
			if (statusFilter === 'visible' && r.hidden) return false;
			if (statusFilter === 'hidden' && !r.hidden) return false;
			if (locationFilter && r.placeId !== locationFilter) return false;
			return true;
		})
	);

	async function toggle(r: ReviewRow) {
		busy[r.reviewId] = true;
		try {
			const next = !r.hidden;
			await apiFetch('/app/api/reviews', {
				method: 'PATCH',
				body: { reviewId: r.reviewId, hidden: next }
			});
			reviews = reviews.map((x) => (x.reviewId === r.reviewId ? { ...x, hidden: next } : x));
		} catch (err) {
			error = err instanceof Error ? err.message : 'Could not update review';
		} finally {
			busy[r.reviewId] = false;
		}
	}

	const ratingOptions = [
		{ value: 'all', label: 'All ratings' },
		{ value: '5', label: '5 stars' },
		{ value: '4', label: '4 stars & up' },
		{ value: 'low', label: '3 stars & below' }
	];
	const statusOptions = [
		{ value: 'all', label: 'All' },
		{ value: 'visible', label: 'Visible' },
		{ value: 'hidden', label: 'Hidden' }
	];
	const locationOptions = $derived([
		{ value: '', label: 'All locations' },
		...locations.map((l) => ({ value: l.placeId, label: l.title }))
	]);

	const collectMethods = [
		{
			icon: 'email' as const,
			title: 'Email after orders',
			desc: 'Automatically ask customers for a review',
			href: '/app/get-reviews#email'
		},
		{
			icon: 'link' as const,
			title: 'Share a link',
			desc: 'Send your review link anywhere',
			href: '/app/get-reviews#link'
		},
		{
			icon: 'qr' as const,
			title: 'QR code',
			desc: 'Print or display in-store',
			href: '/app/get-reviews#qr'
		}
	];

	const columns = [
		{ label: 'Reviewer' },
		{ label: 'Rating' },
		{ label: 'Review' },
		{ label: 'Date' },
		{ label: 'Status' },
		{ label: '', align: 'right' as const }
	];

	function formatDate(iso: string | null): string {
		if (!iso) return '—';
		return new Date(iso).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}
	function stars(n: number | null): string {
		return '★'.repeat(Math.max(0, Math.round(n ?? 0)));
	}
	function initial(name: string | null): string {
		return (name?.trim()?.[0] ?? '?').toUpperCase();
	}
</script>

<svelte:head>
	<title>Reviews</title>
</svelte:head>

<Page title="Reviews">
	{#snippet primaryAction()}
		<Button variant="primary" href="/app/get-reviews">Get more reviews</Button>
	{/snippet}

	{#if error}
		<Banner tone="critical" title="Something went wrong">{error}</Banner>
	{/if}

	<!-- Smart access: collect reviews -->
	<Card title="Collect reviews">
		<div class="collect-grid">
			{#each collectMethods as m (m.href)}
				<a class="collect-card" href={m.href}>
					<span class="collect-icon"><Icon name={m.icon} /></span>
					<span class="collect-body">
						<Text variant="bodyMd">{m.title}</Text>
						<Text tone="subdued" variant="bodySm">{m.desc}</Text>
					</span>
					<Icon name="chevron-right" tone="subdued" />
				</a>
			{/each}
		</div>
	</Card>

	<div class="table-wrap">
		<DataTableView
			{columns}
			rows={filtered}
			rowKey={(r) => r.reviewId}
			loading={isLoading}
			searchValue={query}
			searchPlaceholder="Search reviewer or text"
			onsearch={(v) => (query = v)}
			emptyHeading={reviews.length === 0 ? 'No reviews yet' : 'No matching reviews'}
			emptyDescription={reviews.length === 0
				? 'Import a Google business to pull in your reviews.'
				: 'Try adjusting your filters.'}
		>
			{#snippet filters()}
				<Select
					name="rating"
					label="Rating"
					labelHidden
					value={ratingFilter}
					options={ratingOptions}
					onchange={(e) => (ratingFilter = (e.target as HTMLSelectElement).value)}
				/>
				<Select
					name="status"
					label="Status"
					labelHidden
					value={statusFilter}
					options={statusOptions}
					onchange={(e) => (statusFilter = (e.target as HTMLSelectElement).value)}
				/>
				{#if locations.length > 1}
					<Select
						name="location"
						label="Location"
						labelHidden
						value={locationFilter}
						options={locationOptions}
						onchange={(e) => (locationFilter = (e.target as HTMLSelectElement).value)}
					/>
				{/if}
			{/snippet}

			{#snippet row(r)}
				<td>
					<div class="reviewer">
						{#if r.reviewerPhotoUrl}
							<img class="avatar" src={r.reviewerPhotoUrl} alt={r.name ?? 'Reviewer'} />
						{:else}
							<span class="avatar avatar-fallback">{initial(r.name)}</span>
						{/if}
						<span class="reviewer-meta">
							<Text variant="bodyMd">{r.name ?? 'Anonymous'}</Text>
							{#if r.locationTitle}
								<Text tone="subdued" variant="bodySm">{r.locationTitle}</Text>
							{/if}
						</span>
					</div>
				</td>
				<td><span class="stars">{stars(r.stars)}</span></td>
				<td><span class="review-text">{r.text || '—'}</span></td>
				<td>{formatDate(r.publishedAtDate)}</td>
				<td>
					<Badge tone={r.hidden ? 'default' : 'success'}>{r.hidden ? 'Hidden' : 'Visible'}</Badge>
				</td>
				<td data-align="right">
					<Button
						size="slim"
						variant="secondary"
						loading={busy[r.reviewId]}
						onclick={() => toggle(r)}
					>
						{r.hidden ? 'Show' : 'Hide'}
					</Button>
				</td>
			{/snippet}
		</DataTableView>
	</div>
</Page>

<style>
	.collect-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: var(--space-300);
		margin-top: var(--space-300);
	}
	.collect-card {
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
	.collect-card:hover {
		background: var(--color-bg-surface-hover, #f6f6f7);
	}
	.collect-icon {
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
	.collect-body {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
	}
	.table-wrap {
		margin-top: var(--space-400);
	}
	.reviewer {
		display: flex;
		align-items: center;
		gap: var(--space-200);
	}
	.avatar {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		object-fit: cover;
		flex-shrink: 0;
	}
	.avatar-fallback {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		background: var(--color-bg-surface-secondary, #e3e3e3);
		font-weight: 600;
		font-size: 0.8rem;
	}
	.reviewer-meta {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}
	.stars {
		color: #fbbc04;
		white-space: nowrap;
	}
	.review-text {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
		max-width: 360px;
		color: var(--color-text-secondary, #4b5563);
	}
</style>
