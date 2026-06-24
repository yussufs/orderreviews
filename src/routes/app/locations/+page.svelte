<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import {
		Page,
		Card,
		Button,
		Banner,
		SearchField,
		Badge,
		Text,
		Spinner,
		EmptyState
	} from '$lib/components';
	import { apiFetch } from '$lib/client/api';

	interface PlaceResult {
		placeId: string;
		title: string;
		address: string;
		totalScore?: number;
		reviewsCount?: number;
	}

	interface Location {
		placeId: string;
		title: string;
		address: string | null;
		totalScore: number | null;
		reviewsCount: number | null;
		lastReviewFetchAt: string | null;
	}

	let locations = $state<Location[]>([]);
	let isLoading = $state(true);
	let error = $state<string | null>(null);

	// Search
	let searchQuery = $state('');
	let searchResults = $state<PlaceResult[]>([]);
	let isSearching = $state(false);
	let searchTimeout: ReturnType<typeof setTimeout> | null = null;

	// Import progress: placeId -> jobId being polled
	let importing = $state<Record<string, boolean>>({});
	let progress = $state<Record<string, number>>({});
	let pollers: ReturnType<typeof setInterval>[] = [];

	async function loadLocations() {
		try {
			const data = await apiFetch<{ locations: Location[] }>('/app/api/locations');
			locations = data.locations;
			error = null;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load locations';
		}
	}

	onMount(async () => {
		await loadLocations();
		isLoading = false;
	});

	onDestroy(() => {
		pollers.forEach(clearInterval);
		if (searchTimeout) clearTimeout(searchTimeout);
	});

	function handleSearch(event: Event) {
		searchQuery = (event.target as HTMLInputElement).value;
		if (searchTimeout) clearTimeout(searchTimeout);
		if (!searchQuery.trim()) {
			searchResults = [];
			return;
		}
		isSearching = true;
		searchTimeout = setTimeout(runSearch, 400);
	}

	async function runSearch() {
		try {
			const data = await apiFetch<{ results: PlaceResult[] }>(
				`/app/api/locations/search?q=${encodeURIComponent(searchQuery)}`
			);
			searchResults = data.results;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Search failed';
		} finally {
			isSearching = false;
		}
	}

	async function importLocation(place: PlaceResult) {
		try {
			importing[place.placeId] = true;
			progress[place.placeId] = 0;
			const data = await apiFetch<{ jobId: string }>('/app/api/locations', {
				method: 'POST',
				body: { placeId: place.placeId }
			});
			searchResults = [];
			searchQuery = '';
			await loadLocations();
			pollJob(place.placeId, data.jobId);
		} catch (err) {
			importing[place.placeId] = false;
			error = err instanceof Error ? err.message : 'Import failed';
		}
	}

	function pollJob(placeId: string, jobId: string) {
		const poller = setInterval(async () => {
			try {
				const data = await apiFetch<{ task: { status: string; progress: number } }>(
					`/app/api/tasks/${jobId}`
				);
				progress[placeId] = data.task.progress;
				if (data.task.status === 'completed' || data.task.status === 'failed') {
					clearInterval(poller);
					importing[placeId] = false;
					await loadLocations();
				}
			} catch {
				clearInterval(poller);
				importing[placeId] = false;
			}
		}, 2000);
		pollers.push(poller);
	}

	async function refresh(placeId: string) {
		try {
			importing[placeId] = true;
			progress[placeId] = 0;
			const data = await apiFetch<{ jobId: string }>('/app/api/reviews/refresh', {
				method: 'POST',
				body: { placeId }
			});
			pollJob(placeId, data.jobId);
		} catch (err) {
			importing[placeId] = false;
			error = err instanceof Error ? err.message : 'Refresh failed';
		}
	}

	async function remove(placeId: string) {
		if (!confirm('Remove this location and all its imported reviews?')) return;
		try {
			await apiFetch(`/app/api/locations/${encodeURIComponent(placeId)}`, { method: 'DELETE' });
			await loadLocations();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Delete failed';
		}
	}
</script>

<svelte:head>
	<title>Locations</title>
</svelte:head>

<Page
	title="Locations"
	breadcrumbs={[{ label: 'Settings', href: '/app/settings' }, { label: 'Locations' }]}
>
	{#if error}
		<Banner tone="critical" title="Something went wrong">{error}</Banner>
	{/if}

	<Card title="Connect a Google business">
		<SearchField
			placeholder="Search your business name and city…"
			value={searchQuery}
			oninput={handleSearch}
			onclear={() => {
				searchQuery = '';
				searchResults = [];
			}}
		/>

		{#if isSearching}
			<div class="centered"><Spinner /></div>
		{:else if searchResults.length > 0}
			<ul class="results">
				{#each searchResults as place (place.placeId)}
					<li>
						<div>
							<Text variant="bodyMd">{place.title}</Text>
							<Text tone="subdued">{place.address}</Text>
							{#if place.totalScore}
								<Badge tone="success">{place.totalScore}★ · {place.reviewsCount ?? 0} reviews</Badge
								>
							{/if}
						</div>
						<Button
							variant="primary"
							disabled={importing[place.placeId]}
							onclick={() => importLocation(place)}
						>
							{importing[place.placeId] ? 'Importing…' : 'Import'}
						</Button>
					</li>
				{/each}
			</ul>
		{/if}
	</Card>

	<Card title="Connected locations">
		{#if isLoading}
			<div class="centered"><Spinner /></div>
		{:else if locations.length === 0}
			<EmptyState
				heading="No locations yet"
				description="Search for your business above to import its Google reviews."
			/>
		{:else}
			<ul class="results">
				{#each locations as loc (loc.placeId)}
					<li>
						<div>
							<Text variant="bodyMd">{loc.title}</Text>
							<Text tone="subdued">{loc.address}</Text>
							<Badge tone="success">{loc.totalScore ?? 0}★ · {loc.reviewsCount ?? 0} reviews</Badge>
							{#if importing[loc.placeId]}
								<Text tone="subdued">Importing… {progress[loc.placeId] ?? 0}%</Text>
							{/if}
						</div>
						<div class="actions">
							<Button
								variant="secondary"
								disabled={importing[loc.placeId]}
								onclick={() => refresh(loc.placeId)}
							>
								Refresh
							</Button>
							<Button variant="secondary" tone="critical" onclick={() => remove(loc.placeId)}>
								Remove
							</Button>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</Card>
</Page>

<style>
	.results {
		list-style: none;
		margin: var(--space-400) 0 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-300);
	}
	.results li {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-300);
		padding: var(--space-300);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
	}
	.actions {
		display: flex;
		gap: var(--space-200);
	}
	.centered {
		display: flex;
		justify-content: center;
		padding: var(--space-600);
	}
</style>
