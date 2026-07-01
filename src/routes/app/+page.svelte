<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import {
		Page,
		Card,
		Button,
		Banner,
		Badge,
		Text,
		Spinner,
		CollectReviewsCard,
		Stars
	} from '$lib/components';
	import { apiFetch } from '$lib/client/api';
	import { SMART_ACTIONS } from '$lib/smart-actions';
	import { VERIFY_ACCOUNT_SUPPORT_URL } from '$lib/support-links';
	import type { PageData } from './$types';

	// Layout data (plan, shop, account verification). The dashboard payload below
	// is fetched client-side into `data`, so the load data is aliased to `layout`.
	let { data: layout }: { data: PageData } = $props();

	const ONBOARDING_SKIP_KEY = 'or_onboarding_skipped';

	interface Dashboard {
		range: '30d' | 'all';
		setup: { hasLocation: boolean; widgetConfigured: boolean; collectionEnabled: boolean };
		widget: {
			locationCount: number;
			reviewsImported: number;
			totalReviews: number;
			avgRating: number;
			lastRefresh: string | null;
		};
		collection: {
			enabled: boolean;
			threshold: number;
			sent: number;
			responded: number;
			responseRate: number;
			toGoogle: number;
			toPrivate: number;
			avgRating: number;
		};
		ratingDistribution: { stars: number; count: number }[];
		feedback: {
			count: number;
			recent: { id: string; rating: number; message: string | null; createdAt: string }[];
		};
		recentReviews: {
			id: string;
			name: string | null;
			stars: number | null;
			text: string | null;
			date: string | null;
		}[];
		reviewsSummary: {
			newLast7Days: number;
			newByStar: { stars: number; count: number }[];
			growth: { day: string; total: number }[];
		};
	}

	const COLLAPSE_KEY = 'or_setup_collapsed';

	let data = $state<Dashboard | null>(null);
	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let range = $state<'30d' | 'all'>('30d');
	let setupCollapsed = $state(false);
	let redirecting = $state(false);

	async function load(r: '30d' | 'all') {
		try {
			error = null;
			data = await apiFetch<Dashboard>(`/app/api/dashboard?range=${r}`);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load dashboard';
		}
	}

	onMount(async () => {
		setupCollapsed = localStorage.getItem(COLLAPSE_KEY) === '1';
		await load(range);
		// First run: no locations yet (and not skipped) → send to the onboarding wizard.
		if (data && !data.setup.hasLocation && localStorage.getItem(ONBOARDING_SKIP_KEY) !== '1') {
			redirecting = true;
			await goto('/app/onboarding');
			return;
		}
		isLoading = false;
	});

	async function setRange(r: '30d' | 'all') {
		range = r;
		await load(r);
	}

	const steps = $derived(
		data
			? [
					{
						title: 'Connect your Google business',
						done: data.setup.hasLocation,
						href: '/app/locations',
						cta: 'Connect'
					},
					{
						title: 'Add the review widget to your storefront',
						done: data.setup.widgetConfigured,
						href: '/app/widget',
						cta: 'Set up'
					},
					{
						title: 'Turn on post-order review collection',
						done: data.setup.collectionEnabled,
						href: '/app/review-collection',
						cta: 'Turn on'
					}
				]
			: []
	);
	const doneCount = $derived(steps.filter((s) => s.done).length);
	const allDone = $derived(steps.length > 0 && doneCount === steps.length);

	function toggleCollapse() {
		setupCollapsed = !setupCollapsed;
		localStorage.setItem(COLLAPSE_KEY, setupCollapsed ? '1' : '0');
	}

	function pct(n: number, total: number): number {
		return total > 0 ? Math.round((n / total) * 100) : 0;
	}
	function formatDate(iso: string | null): string {
		if (!iso) return 'never';
		return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}

	const maxDist = $derived(data ? Math.max(1, ...data.ratingDistribution.map((d) => d.count)) : 1);
	const hasCollectionData = $derived(!!data && data.collection.sent > 0);

	// Sparkline path for the reviews-growth trend (needs >= 2 daily snapshots).
	function sparkline(points: { total: number }[]): { line: string; area: string } | null {
		if (points.length < 2) return null;
		const w = 100;
		const h = 28;
		const totals = points.map((p) => p.total);
		const min = Math.min(...totals);
		const range = Math.max(...totals) - min || 1;
		const stepX = w / (points.length - 1);
		const coords = points.map((p, i) => [i * stepX, h - ((p.total - min) / range) * h]);
		const line = coords
			.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`)
			.join(' ');
		return { line, area: `${line} L ${w} ${h} L 0 ${h} Z` };
	}
	const spark = $derived(data ? sparkline(data.reviewsSummary.growth) : null);
</script>

<svelte:head>
	<title>Dashboard</title>
</svelte:head>

<Page title="Dashboard">
	{#if error}
		<Banner tone="critical" title="Something went wrong">{error}</Banner>
	{/if}

	{#if layout.verification?.needsVerification}
		<div class="verify-banner">
			<Banner tone="warning" title="Your account hasn't been verified">
				Before your Google reviews can appear on your storefront, we need to verify that you own
				this Google Business account. Your widget stays hidden on your live store until then.
				{#snippet actions()}
					<Button variant="primary" href={VERIFY_ACCOUNT_SUPPORT_URL}>Verify my account</Button>
				{/snippet}
			</Banner>
		</div>
	{/if}

	{#if isLoading || redirecting || !data}
		<Card><div class="centered"><Spinner /></div></Card>
	{:else}
		<!-- Setup checklist (collapses once complete) -->
		{#if allDone && setupCollapsed}
			<Card>
				<div class="setup-collapsed">
					<span class="setup-done">
						<span class="step-icon done">✓</span>
						<Text variant="bodyMd">You're all set up</Text>
					</span>
					<Button variant="plain" onclick={toggleCollapse}>Show steps</Button>
				</div>
			</Card>
		{:else}
			<Card title={allDone ? 'Setup complete' : `Get set up (${doneCount}/3)`}>
				{#snippet actions()}
					{#if allDone}
						<Button variant="plain" onclick={toggleCollapse}>Hide</Button>
					{/if}
				{/snippet}
				<ul class="steps">
					{#each steps as step (step.title)}
						<li>
							<span class="step-icon" class:done={step.done}>{step.done ? '✓' : ''}</span>
							<span class="step-title" class:done={step.done}>{step.title}</span>
							{#if step.done}
								<Badge tone="success">Done</Badge>
							{:else}
								<Button variant="primary" href={step.href}>{step.cta}</Button>
							{/if}
						</li>
					{/each}
				</ul>
			</Card>
		{/if}

		<!-- Range toggle -->
		<div class="range-toggle">
			<Button variant={range === '30d' ? 'primary' : 'secondary'} onclick={() => setRange('30d')}>
				Last 30 days
			</Button>
			<Button variant={range === 'all' ? 'primary' : 'secondary'} onclick={() => setRange('all')}>
				All time
			</Button>
		</div>

		<!-- KPI cards -->
		<div class="kpi-grid">
			<Card title="Reviews">
				{#snippet actions()}
					<Button variant="plain" href="/app/reviews">View all</Button>
				{/snippet}
				<div class="stats">
					<div class="stat">
						<span class="stat-value">{data.widget.totalReviews.toLocaleString()}</span>
						<span class="stat-label">total reviews</span>
					</div>
					<div class="stat">
						<span class="stat-value">+{data.reviewsSummary.newLast7Days}</span>
						<span class="stat-label">new · 7 days</span>
					</div>
					<div class="stat">
						<span class="stat-value">
							{data.widget.avgRating || '—'}{#if data.widget.avgRating}<Stars
									value={1}
									size={20}
								/>{/if}
						</span>
						<span class="stat-label">avg rating</span>
					</div>
				</div>

				{#if spark}
					<svg class="spark" viewBox="0 0 100 28" preserveAspectRatio="none" aria-hidden="true">
						<path d={spark.area} class="spark-area" />
						<path d={spark.line} class="spark-line" />
					</svg>
				{:else}
					<Text tone="subdued" variant="bodySm">
						Growth trend appears as daily data is collected.
					</Text>
				{/if}

				<div class="new-stars">
					{#each data.reviewsSummary.newByStar as b (b.stars)}
						<span class="new-star"><Stars value={1} size={13} />{b.stars} · {b.count}</span>
					{/each}
				</div>
			</Card>

			<Card title="Review collection">
				{#snippet actions()}
					<Button variant="plain" href="/app/review-collection">Configure</Button>
				{/snippet}
				<div class="status-line">
					<Badge tone={data.collection.enabled ? 'success' : 'default'}>
						{data.collection.enabled ? 'On' : 'Off'}
					</Badge>
				</div>
				<div class="stats">
					<div class="stat">
						<span class="stat-value">{data.collection.sent}</span>
						<span class="stat-label">requests sent</span>
					</div>
					<div class="stat">
						<span class="stat-value">{data.collection.responseRate}%</span>
						<span class="stat-label">response rate</span>
					</div>
					<div class="stat">
						<span class="stat-value">
							{data.collection.avgRating || '—'}{#if data.collection.avgRating}<Stars
									value={1}
									size={20}
								/>{/if}
						</span>
						<span class="stat-label">avg rating</span>
					</div>
				</div>
			</Card>
		</div>

		<CollectReviewsCard title="Smart actions" items={SMART_ACTIONS} columns={2} />

		<!-- Collection funnel -->
		{#if hasCollectionData}
			<Card title="Collection funnel">
				<div class="funnel">
					<div class="funnel-row">
						<span class="funnel-label">Emails sent</span>
						<div class="bar-track"><div class="bar" style="width:100%"></div></div>
						<span class="funnel-val">{data.collection.sent}</span>
					</div>
					<div class="funnel-row">
						<span class="funnel-label">Responded</span>
						<div class="bar-track">
							<div
								class="bar"
								style="width:{pct(data.collection.responded, data.collection.sent)}%"
							></div>
						</div>
						<span class="funnel-val">
							{data.collection.responded} ({data.collection.responseRate}%)
						</span>
					</div>
					<div class="funnel-row">
						<span class="funnel-label">★ Sent to Google</span>
						<div class="bar-track">
							<div
								class="bar bar-google"
								style="width:{pct(data.collection.toGoogle, data.collection.sent)}%"
							></div>
						</div>
						<span class="funnel-val">{data.collection.toGoogle}</span>
					</div>
					<div class="funnel-row">
						<span class="funnel-label">💬 Private feedback</span>
						<div class="bar-track">
							<div
								class="bar bar-private"
								style="width:{pct(data.collection.toPrivate, data.collection.sent)}%"
							></div>
						</div>
						<span class="funnel-val">{data.collection.toPrivate}</span>
					</div>
				</div>
			</Card>
		{/if}

		<!-- Rating distribution -->
		{#if data.collection.responded > 0}
			<Card title="Rating distribution">
				<div class="dist">
					{#each data.ratingDistribution as d (d.stars)}
						<div class="dist-row">
							<span class="dist-label">{d.stars}★</span>
							<div class="bar-track">
								<div
									class="bar"
									class:bar-below={d.stars < data.collection.threshold}
									style="width:{(d.count / maxDist) * 100}%"
								></div>
							</div>
							<span class="dist-val">{d.count}</span>
						</div>
					{/each}
				</div>
				<Text tone="subdued">
					Ratings of {data.collection.threshold}★ and up are sent to Google; below go to private
					feedback.
				</Text>
			</Card>
		{/if}

		<!-- Recent reviews -->
		{#if data.recentReviews.length > 0}
			<Card title="Recent reviews">
				{#snippet actions()}
					<Button variant="plain" href="/app/reviews">View all</Button>
				{/snippet}
				<ul class="rev-list">
					{#each data.recentReviews as r (r.id)}
						<li>
							<span class="rev-stars"><Stars value={r.stars} size={15} /></span>
							<span class="rev-body">
								<span class="rev-name">{r.name ?? 'Anonymous'}</span>
								<span class="rev-text">{r.text || '—'}</span>
							</span>
							<span class="rev-date">{formatDate(r.date)}</span>
						</li>
					{/each}
				</ul>
			</Card>
		{/if}

		<!-- Recent private feedback -->
		{#if data.feedback.count > 0}
			<Card title="Private feedback">
				{#snippet actions()}
					<Button variant="plain" href="/app/feedback">View all</Button>
				{/snippet}
				<Banner tone="warning">
					{data.feedback.count} customer{data.feedback.count === 1 ? '' : 's'} left private feedback{range ===
					'30d'
						? ' in the last 30 days'
						: ''}.
				</Banner>
				<ul class="fb-list">
					{#each data.feedback.recent as f (f.id)}
						<li>
							<Badge tone={f.rating <= 2 ? 'critical' : 'caution'}>{f.rating}/5</Badge>
							<span class="fb-msg">{f.message || '(no message)'}</span>
							<span class="fb-date">{formatDate(f.createdAt)}</span>
						</li>
					{/each}
				</ul>
			</Card>
		{/if}
	{/if}
</Page>

<style>
	.verify-banner {
		margin-bottom: var(--space-400);
	}
	.centered {
		display: flex;
		justify-content: center;
		padding: var(--space-600);
	}
	.setup-collapsed {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.setup-done {
		display: flex;
		align-items: center;
		gap: var(--space-200);
	}
	.steps {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-300);
	}
	.steps li {
		display: flex;
		align-items: center;
		gap: var(--space-300);
	}
	.step-icon {
		flex-shrink: 0;
		width: 22px;
		height: 22px;
		border-radius: 50%;
		border: 2px solid var(--color-border);
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-size: 13px;
		color: #fff;
	}
	.step-icon.done {
		background: var(--color-bg-fill-success, #16a34a);
		border-color: var(--color-bg-fill-success, #16a34a);
	}
	.step-title {
		flex: 1;
	}
	.step-title.done {
		color: var(--color-text-subdued, #6b7280);
		text-decoration: line-through;
	}
	.range-toggle {
		display: flex;
		gap: var(--space-200);
		margin: var(--space-400) 0;
	}
	.kpi-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-400);
	}
	@media (max-width: 640px) {
		.kpi-grid {
			grid-template-columns: 1fr;
		}
	}
	.status-line {
		margin-bottom: var(--space-300);
	}
	.spark {
		width: 100%;
		height: 44px;
		display: block;
		margin: var(--space-200) 0 var(--space-300);
	}
	.spark-line {
		fill: none;
		stroke: #16a34a;
		stroke-width: 2;
		vector-effect: non-scaling-stroke;
		stroke-linejoin: round;
	}
	.spark-area {
		fill: rgba(22, 163, 74, 0.12);
		stroke: none;
	}
	.new-stars {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-200) var(--space-400);
		font-size: 0.85rem;
		color: var(--color-text-secondary, #4b5563);
	}
	.new-star {
		display: inline-flex;
		align-items: center;
		gap: 3px;
		white-space: nowrap;
	}
	.stats {
		display: flex;
		gap: var(--space-500);
		margin-bottom: var(--space-300);
	}
	.stat {
		display: flex;
		flex-direction: column;
	}
	.stat-value {
		font-size: 1.6rem;
		font-weight: 600;
		line-height: 1.1;
	}
	.stat-label {
		font-size: 0.8rem;
		color: var(--color-text-subdued, #6b7280);
	}
	.funnel,
	.dist {
		display: flex;
		flex-direction: column;
		gap: var(--space-300);
		margin-bottom: var(--space-300);
	}
	.funnel-row,
	.dist-row {
		display: flex;
		align-items: center;
		gap: var(--space-300);
	}
	.funnel-label {
		width: 140px;
		flex-shrink: 0;
		font-size: 0.9rem;
	}
	.dist-label {
		width: 32px;
		flex-shrink: 0;
		font-size: 0.9rem;
	}
	.bar-track {
		flex: 1;
		height: 14px;
		background: var(--color-bg-surface-secondary, #f1f1f1);
		border-radius: 7px;
		overflow: hidden;
	}
	.bar {
		height: 100%;
		background: var(--color-bg-fill-info, #1a73e8);
		border-radius: 7px;
		transition: width 0.3s ease;
		min-width: 2px;
	}
	.bar-google {
		background: #16a34a;
	}
	.bar-private,
	.bar-below {
		background: #f59e0b;
	}
	.funnel-val,
	.dist-val {
		width: 88px;
		flex-shrink: 0;
		text-align: right;
		font-size: 0.9rem;
		font-variant-numeric: tabular-nums;
	}
	.dist-val {
		width: 48px;
	}
	.fb-list {
		list-style: none;
		margin: var(--space-300) 0 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-200);
	}
	.fb-list li {
		display: flex;
		align-items: center;
		gap: var(--space-200);
	}
	.fb-msg {
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: var(--color-text-subdued, #4b5563);
	}
	.fb-date {
		flex-shrink: 0;
		font-size: 0.8rem;
		color: var(--color-text-subdued, #6b7280);
	}
	.rev-list {
		list-style: none;
		margin: var(--space-300) 0 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-300);
	}
	.rev-list li {
		display: flex;
		align-items: center;
		gap: var(--space-300);
	}
	.rev-stars {
		flex-shrink: 0;
		color: #fbbc04;
		white-space: nowrap;
	}
	.rev-body {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
	}
	.rev-name {
		font-weight: var(--font-weight-medium);
	}
	.rev-text {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: var(--color-text-subdued, #4b5563);
		font-size: 0.875rem;
	}
	.rev-date {
		flex-shrink: 0;
		font-size: 0.8rem;
		color: var(--color-text-subdued, #6b7280);
	}
</style>
