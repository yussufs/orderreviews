<script lang="ts">
	import { onMount } from 'svelte';
	import {
		Page,
		Card,
		Button,
		Banner,
		DataTable,
		Badge,
		Text,
		Spinner,
		EmptyState
	} from '$lib/components';

	interface Puzzle {
		id: string;
		name: string;
		pieces: number;
		created: string;
		status: 'active' | 'draft';
		image: string;
	}

	const mockPuzzles: Puzzle[] = [
		{
			id: '1',
			name: 'Mountain View',
			pieces: 16,
			created: 'Today',
			status: 'active',
			image: 'https://picsum.photos/id/29/80/80'
		},
		{
			id: '2',
			name: 'Ocean Sunset',
			pieces: 9,
			created: 'Yesterday',
			status: 'active',
			image: 'https://picsum.photos/id/12/80/80'
		},
		{
			id: '3',
			name: 'Forest Animals',
			pieces: 25,
			created: 'Last week',
			status: 'draft',
			image: 'https://picsum.photos/id/324/80/80'
		},
		{
			id: '4',
			name: 'City Skyline',
			pieces: 36,
			created: 'Last week',
			status: 'active',
			image: 'https://picsum.photos/id/1067/80/80'
		},
		{
			id: '5',
			name: 'Desert Dunes',
			pieces: 16,
			created: '2 weeks ago',
			status: 'draft',
			image: 'https://picsum.photos/id/1035/80/80'
		}
	];

	let puzzles = $state<Puzzle[]>([]);
	let isLoading = $state(true);
	let error = $state<string | null>(null);

	onMount(async () => {
		await new Promise((resolve) => setTimeout(resolve, 800));
		puzzles = mockPuzzles;
		isLoading = false;
	});

	function getStatusTone(status: string): 'success' | 'default' {
		return status === 'active' ? 'success' : 'default';
	}

	function formatStatus(status: string): string {
		return status.charAt(0).toUpperCase() + status.slice(1);
	}
</script>

<svelte:head>
	<title>Puzzles</title>
</svelte:head>

<Page title="Puzzles">
	{#snippet primaryAction()}
		<Button variant="primary">Create puzzle</Button>
	{/snippet}

	{#snippet secondaryActions()}
		<Button>Export puzzles</Button>
		<Button>Import puzzles</Button>
	{/snippet}

	{#if error}
		<Banner tone="critical" title="Error loading puzzles">
			{error}
		</Banner>
	{/if}

	{#if isLoading}
		<Card>
			<div class="loading-state">
				<Spinner size="large" />
				<Text>Loading puzzles...</Text>
			</div>
		</Card>
	{:else if puzzles.length > 0}
		<Card padding="none">
			<DataTable>
				<thead>
					<tr>
						<th>Puzzle</th>
						<th data-align="right">Pieces</th>
						<th>Created</th>
						<th>Status</th>
					</tr>
				</thead>
				<tbody>
					{#each puzzles as puzzle (puzzle.id)}
						<tr>
							<td>
								<div class="cell-content">
									<a href="/app/puzzles/{puzzle.id}" class="thumbnail">
										<img src={puzzle.image} alt="{puzzle.name} puzzle thumbnail" />
									</a>
									<a href="/app/puzzles/{puzzle.id}" class="puzzle-link">
										{puzzle.name}
									</a>
								</div>
							</td>
							<td data-align="right">{puzzle.pieces}</td>
							<td>{puzzle.created}</td>
							<td>
								<Badge tone={getStatusTone(puzzle.status)}>
									{formatStatus(puzzle.status)}
								</Badge>
							</td>
						</tr>
					{/each}
				</tbody>
			</DataTable>
		</Card>
	{:else}
		<Card>
			<EmptyState
				heading="Start creating puzzles"
				description="Create and manage your collection of puzzles for players to enjoy."
				image="https://cdn.shopify.com/static/images/polaris/patterns/callout.png"
				imageAlt="Puzzle illustration"
			>
				<Button>Learn more</Button>
				<Button variant="primary">Create puzzle</Button>
			</EmptyState>
		</Card>
	{/if}
</Page>

<style>
	.loading-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--space-400);
		min-height: 300px;
	}

	.cell-content {
		display: flex;
		align-items: center;
		gap: var(--space-200);
	}

	.thumbnail {
		width: 40px;
		height: 40px;
		border-radius: var(--radius-md);
		overflow: hidden;
		flex-shrink: 0;
		background: var(--color-bg-surface-secondary);
		border: 1px solid var(--color-border);
	}

	.thumbnail img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.puzzle-link {
		color: var(--color-text-info);
		text-decoration: none;
		font-weight: var(--font-weight-medium);
	}

	.puzzle-link:hover {
		text-decoration: underline;
	}
</style>
