<script lang="ts">
	import type { PageData } from './$types';
	import {
		Page,
		Card,
		Button,
		TextField,
		Select,
		SearchField,
		Checkbox,
		Switch,
		Badge,
		Text,
		Divider,
		DataTable,
		Icon
	} from '$lib/components';

	let { data }: { data: PageData } = $props();
	let puzzle = $state(data.puzzle);
	let searchQuery = $state('');

	interface Template {
		id: string;
		name: string;
		pieces: number;
		image: string;
	}

	const allTemplates: Template[] = [
		{
			id: '1',
			name: '16-pieces puzzle',
			pieces: 16,
			image: 'https://cdn.shopify.com/static/images/polaris/patterns/16-pieces.png'
		},
		{
			id: '2',
			name: '9-pieces puzzle',
			pieces: 9,
			image: 'https://cdn.shopify.com/static/images/polaris/patterns/9-pieces.png'
		},
		{
			id: '3',
			name: '25-pieces puzzle',
			pieces: 25,
			image: 'https://picsum.photos/id/29/40/40'
		},
		{
			id: '4',
			name: '36-pieces puzzle',
			pieces: 36,
			image: 'https://picsum.photos/id/12/40/40'
		}
	];

	let filteredTemplates = $derived(
		searchQuery
			? allTemplates.filter((t) => t.name.toLowerCase().includes(searchQuery.toLowerCase()))
			: allTemplates
	);

	function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		const form = event.target as HTMLFormElement;
		const formData = new FormData(form);
		const formEntries = Object.fromEntries(formData);
		console.log('Form data', formEntries);
		window.shopify?.toast.show('Puzzle saved');
	}

	function handleSearch(event: Event) {
		const input = event.target as HTMLInputElement;
		searchQuery = input.value;
	}

	function handleClearSearch() {
		searchQuery = '';
	}

	function getStatusTone(status: string): 'success' | 'default' {
		return status === 'active' ? 'success' : 'default';
	}

	function formatStatus(status: string): string {
		return status.charAt(0).toUpperCase() + status.slice(1);
	}

	const sizeOptions = [
		{ value: 'small', label: 'Small (8" x 8")' },
		{ value: 'medium', label: 'Medium (12" x 12")' },
		{ value: 'large', label: 'Large (18" x 18")' }
	];

	const pieceOptions = [
		{ value: '9', label: '9 pieces' },
		{ value: '16', label: '16 pieces' },
		{ value: '25', label: '25 pieces' },
		{ value: '36', label: '36 pieces' }
	];

	const materialOptions = [
		{ value: 'cardboard', label: 'Cardboard' },
		{ value: 'wood', label: 'Wood' },
		{ value: 'premium', label: 'Premium (Recycled)' }
	];
</script>

<svelte:head>
	<title>{puzzle.name} - Puzzle Details</title>
</svelte:head>

<form data-save-bar onsubmit={handleSubmit}>
	<Page title={puzzle.name} backAction={{ url: '/app/puzzles', label: 'Puzzles' }}>
		{#snippet primaryAction()}
			<Button variant="primary" type="submit">Save</Button>
		{/snippet}

		{#snippet secondaryActions()}
			<Button>Duplicate</Button>
			<Button tone="critical">Delete</Button>
		{/snippet}

		{#snippet aside()}
			<!-- Puzzle Preview -->
			<Card title="Preview">
				<div class="preview-image">
					<img src={puzzle.image} alt="{puzzle.name} puzzle preview" />
				</div>
				<Button fullWidth>Change image</Button>
			</Card>

			<!-- Puzzle Summary -->
			<Card title="Summary">
				<div class="summary-list">
					<div class="summary-item">
						<Text tone="subdued">Status</Text>
						<Badge tone={getStatusTone(puzzle.status)}>
							{formatStatus(puzzle.status)}
						</Badge>
					</div>
					<Divider spacing="tight" />
					<div class="summary-item">
						<Text tone="subdued">Price</Text>
						<Text fontWeight="semibold">${puzzle.price}</Text>
					</div>
					<Divider spacing="tight" />
					<div class="summary-item">
						<Text tone="subdued">Pieces</Text>
						<Text fontWeight="semibold">{puzzle.pieces}</Text>
					</div>
					<Divider spacing="tight" />
					<div class="summary-item">
						<Text tone="subdued">Stock</Text>
						<Text fontWeight="semibold">{puzzle.stock} units</Text>
					</div>
					<Divider spacing="tight" />
					<div class="summary-item">
						<Text tone="subdued">Created</Text>
						<Text>{puzzle.created}</Text>
					</div>
				</div>
			</Card>
		{/snippet}

		<!-- Puzzle Information -->
		<Card title="Puzzle information">
			<div class="form-stack">
				<TextField label="Name" name="name" value={puzzle.name} placeholder="Enter puzzle name" />
				<TextField
					label="Description"
					name="description"
					value={puzzle.description}
					placeholder="Enter puzzle description"
					multiline
					rows={3}
				/>
				<div class="form-row">
					<TextField
						label="Price"
						name="price"
						value={puzzle.price}
						prefix="$"
						type="number"
						step="0.01"
					/>
					<TextField label="Stock" name="stock" value={String(puzzle.stock)} type="number" />
				</div>
			</div>
		</Card>

		<!-- Puzzle Settings -->
		<Card title="Puzzle settings">
			<div class="form-stack">
				<Select label="Size" name="size" options={sizeOptions} value={puzzle.size} />
				<Select
					label="Piece count"
					name="pieces"
					options={pieceOptions}
					value={String(puzzle.pieces)}
				/>
				<Select
					label="Material"
					name="material"
					options={materialOptions}
					value={puzzle.material}
				/>
			</div>
		</Card>

		<!-- Puzzle Templates -->
		<Card title="Puzzle templates">
			<div class="form-stack">
				<div class="templates-header">
					<SearchField
						placeholder="Search templates"
						value={searchQuery}
						oninput={handleSearch}
						onclear={handleClearSearch}
					/>
					<Button>Browse</Button>
				</div>

				<DataTable>
					<thead>
						<tr>
							<th>Template</th>
							<th data-align="right">Actions</th>
						</tr>
					</thead>
					<tbody>
						{#each filteredTemplates as template (template.id)}
							<tr>
								<td>
									<div class="cell-content">
										<Checkbox name="template-{template.id}" label="" />
										<div class="template-thumbnail">
											<img src={template.image} alt="{template.name} template" />
										</div>
										{template.name}
									</div>
								</td>
								<td data-align="right">
									<div class="template-actions">
										<a href="/app/templates/{template.id}" class="preview-link">Preview</a>
										<Button variant="tertiary" iconOnly>
											{#snippet icon()}<Icon name="x" />{/snippet}
										</Button>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</DataTable>

				{#if filteredTemplates.length === 0}
					<div class="empty-templates">
						<Text tone="subdued">No templates found matching "{searchQuery}"</Text>
					</div>
				{/if}
			</div>
		</Card>

		<!-- Advanced Settings -->
		<Card title="Advanced settings">
			<div class="settings-list">
				<Switch
					label="Enable piece rotation"
					name="piece-rotation"
					helpText="Allow players to rotate puzzle pieces while solving"
					checked
				/>
				<Divider spacing="tight" />
				<Switch
					label="Show piece preview"
					name="piece-preview"
					helpText="Display a small preview of the completed puzzle"
					checked
				/>
				<Divider spacing="tight" />
				<Switch
					label="Enable hints"
					name="hints-enabled"
					helpText="Allow players to request hints while solving"
				/>
			</div>
		</Card>

		<!-- Publishing -->
		<Card title="Publishing">
			<div class="form-stack">
				<div class="radio-group">
					<label class="radio-label">
						<input type="radio" name="status" value="active" checked={puzzle.status === 'active'} />
						<span>Active</span>
					</label>
					<label class="radio-label">
						<input type="radio" name="status" value="draft" checked={puzzle.status === 'draft'} />
						<span>Draft</span>
					</label>
				</div>
				<Switch
					label="Featured puzzle"
					name="featured"
					helpText="Display this puzzle prominently on the homepage"
					checked={puzzle.featured}
				/>
			</div>
		</Card>
	</Page>
</form>

<style>
	.form-stack {
		display: flex;
		flex-direction: column;
		gap: var(--space-400);
	}

	.form-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-400);
	}

	.preview-image {
		border-radius: var(--radius-md);
		overflow: hidden;
		margin-bottom: var(--space-300);
	}

	.preview-image img {
		width: 100%;
		aspect-ratio: 1;
		object-fit: cover;
	}

	.summary-list {
		display: flex;
		flex-direction: column;
	}

	.summary-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--space-200) 0;
	}

	.templates-header {
		display: flex;
		gap: var(--space-200);
	}

	.templates-header :global(.search-field) {
		flex: 1;
	}

	.cell-content {
		display: flex;
		align-items: center;
		gap: var(--space-200);
	}

	.template-thumbnail {
		width: 40px;
		height: 40px;
		border-radius: var(--radius-md);
		overflow: hidden;
		border: 1px solid var(--color-border);
	}

	.template-thumbnail img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.template-actions {
		display: flex;
		align-items: center;
		gap: var(--space-200);
		justify-content: flex-end;
	}

	.preview-link {
		color: var(--color-text-info);
		text-decoration: none;
	}

	.preview-link:hover {
		text-decoration: underline;
	}

	.empty-templates {
		padding: var(--space-600);
		text-align: center;
	}

	.settings-list {
		display: flex;
		flex-direction: column;
	}

	.radio-group {
		display: flex;
		flex-direction: column;
		gap: var(--space-200);
	}

	.radio-label {
		display: flex;
		align-items: center;
		gap: var(--space-200);
		cursor: pointer;
	}

	.radio-label input {
		width: 18px;
		height: 18px;
		accent-color: var(--color-bg-fill);
	}
</style>
