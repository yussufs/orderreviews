<script lang="ts">
	import { onMount } from 'svelte';
	import {
		Page,
		Card,
		Button,
		Banner,
		DataTable,
		SearchField,
		Badge,
		Text,
		Skeleton,
		Icon,
		EmptyState
	} from '$lib/components';

	interface Product {
		id: string;
		title: string;
		status: string;
		createdAt: string;
		image: string | null;
		imageAlt: string;
		price: string;
		inventory: number | null;
	}

	let products = $state<Product[]>([]);
	let isLoading = $state(true);
	let isSearching = $state(false);
	let error = $state<string | null>(null);
	let searchQuery = $state('');
	let searchTimeout: ReturnType<typeof setTimeout> | null = null;

	async function fetchProducts(query: string = '') {
		try {
			if (!window.shopify) {
				throw new Error('Shopify App Bridge not loaded');
			}

			const token = await window.shopify.idToken();
			const url = query ? `/api/products?search=${encodeURIComponent(query)}` : '/api/products';
			const response = await fetch(url, {
				headers: {
					Authorization: `Bearer ${token}`
				}
			});

			if (!response.ok) {
				throw new Error('Failed to fetch products');
			}

			const data = await response.json();
			products = data.products || [];
			if (data.error) {
				error = data.error;
			} else {
				error = null;
			}
		} catch (err) {
			console.error('Error fetching products:', err);
			error = 'Failed to load products';
		}
	}

	onMount(async () => {
		await fetchProducts();
		isLoading = false;
	});

	function handleSearch(event: Event) {
		const input = event.target as HTMLInputElement;
		searchQuery = input.value;

		if (searchTimeout) {
			clearTimeout(searchTimeout);
		}

		isSearching = true;
		searchTimeout = setTimeout(async () => {
			await fetchProducts(searchQuery);
			isSearching = false;
		}, 300);
	}

	function handleClearSearch() {
		searchQuery = '';
		isSearching = true;
		fetchProducts('').then(() => {
			isSearching = false;
		});
	}

	function formatDate(dateString: string): string {
		const date = new Date(dateString);
		const now = new Date();
		const diffTime = Math.abs(now.getTime() - date.getTime());
		const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

		if (diffDays === 0) return 'Today';
		if (diffDays === 1) return 'Yesterday';
		if (diffDays < 7) return `${diffDays} days ago`;

		return date.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
		});
	}

	function getStatusTone(status: string): 'success' | 'default' | 'warning' {
		switch (status) {
			case 'ACTIVE':
				return 'success';
			case 'DRAFT':
				return 'default';
			case 'ARCHIVED':
				return 'warning';
			default:
				return 'default';
		}
	}

	function formatStatus(status: string): string {
		return status.charAt(0) + status.slice(1).toLowerCase();
	}

	function formatPrice(price: string): string {
		return `$${parseFloat(price).toFixed(2)}`;
	}

	function getProductAdminUrl(id: string): string {
		const numericId = id.replace('gid://shopify/Product/', '');
		return `shopify://admin/products/${numericId}`;
	}
</script>

<svelte:head>
	<title>Products</title>
</svelte:head>

<Page title="Products">
	{#snippet primaryAction()}
		<Button variant="primary" href="shopify://admin/products/new">Add product</Button>
	{/snippet}

	{#if error}
		<Banner tone="critical" title="Error loading products">
			{error}
		</Banner>
	{/if}

	<Card padding="none">
		<div class="table-filters">
			<SearchField
				placeholder="Search products"
				value={searchQuery}
				oninput={handleSearch}
				onclear={handleClearSearch}
			/>
			<Button variant="secondary">
				{#snippet icon()}<Icon name="filter" />{/snippet}
				Filter
			</Button>
		</div>

		{#if isLoading || isSearching}
			<DataTable>
				<thead>
					<tr>
						<th>Product</th>
						<th data-align="right">Price</th>
						<th data-align="right">Inventory</th>
						<th>Created</th>
						<th>Status</th>
					</tr>
				</thead>
				<tbody>
					{#each [1, 2, 3, 4, 5] as i}
						<tr>
							<td>
								<div class="cell-content">
									<Skeleton variant="box" />
									<Skeleton variant="text" width="120px" />
								</div>
							</td>
							<td data-align="right"><Skeleton variant="text" width="60px" /></td>
							<td data-align="right"><Skeleton variant="text" width="80px" /></td>
							<td><Skeleton variant="text" width="70px" /></td>
							<td><Skeleton variant="badge" /></td>
						</tr>
					{/each}
				</tbody>
			</DataTable>
		{:else if products.length > 0}
			<DataTable>
				<thead>
					<tr>
						<th>Product</th>
						<th data-align="right">Price</th>
						<th data-align="right">Inventory</th>
						<th>Created</th>
						<th>Status</th>
					</tr>
				</thead>
				<tbody>
					{#each products as product (product.id)}
						<tr>
							<td>
								<div class="cell-content">
									<a href={getProductAdminUrl(product.id)} class="thumbnail">
										{#if product.image}
											<img src={product.image} alt={product.imageAlt} />
										{:else}
											<div class="thumbnail-placeholder">
												<Icon name="image" tone="subdued" />
											</div>
										{/if}
									</a>
									<a href={getProductAdminUrl(product.id)} class="product-link">
										{product.title}
									</a>
								</div>
							</td>
							<td data-align="right">{formatPrice(product.price)}</td>
							<td data-align="right">
								{#if product.inventory !== null}
									{product.inventory} in stock
								{:else}
									<Text tone="subdued">Not tracked</Text>
								{/if}
							</td>
							<td>{formatDate(product.createdAt)}</td>
							<td>
								<Badge tone={getStatusTone(product.status)}>
									{formatStatus(product.status)}
								</Badge>
							</td>
						</tr>
					{/each}
				</tbody>
			</DataTable>
		{:else if searchQuery}
			<div class="empty-search">
				<Text tone="subdued">No products found matching "{searchQuery}"</Text>
			</div>
		{:else}
			<EmptyState heading="No products yet" description="Add products to start selling">
				<Button variant="primary" href="shopify://admin/products/new">Add product</Button>
			</EmptyState>
		{/if}
	</Card>
</Page>

<style>
	.table-filters {
		display: flex;
		gap: var(--space-200);
		padding: var(--space-400);
		border-bottom: 1px solid var(--color-border);
	}

	.table-filters :global(.search-field) {
		flex: 1;
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
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.thumbnail img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.thumbnail-placeholder {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 100%;
	}

	.product-link {
		color: var(--color-text-info);
		text-decoration: none;
		font-weight: var(--font-weight-medium);
	}

	.product-link:hover {
		text-decoration: underline;
	}

	.empty-search {
		padding: var(--space-800);
		text-align: center;
	}
</style>
