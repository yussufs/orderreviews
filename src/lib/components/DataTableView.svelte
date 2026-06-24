<script lang="ts" generics="T">
	import type { Snippet } from 'svelte';
	import DataTable from './DataTable.svelte';
	import SearchField from './SearchField.svelte';
	import Spinner from './Spinner.svelte';
	import EmptyState from './EmptyState.svelte';
	import Button from './Button.svelte';

	interface Column {
		label: string;
		align?: 'left' | 'right' | 'center';
	}

	interface Props {
		columns: Column[];
		rows: T[];
		/** Stable key for each row. */
		rowKey: (row: T) => string;
		/** Renders the <td> cells for one row. */
		row: Snippet<[T]>;
		loading?: boolean;
		searchable?: boolean;
		searchValue?: string;
		searchPlaceholder?: string;
		onsearch?: (value: string) => void;
		/** Toolbar controls (e.g. filter selects), rendered next to the search box. */
		filters?: Snippet;
		/** Toolbar actions on the right (e.g. buttons). */
		actions?: Snippet;
		emptyHeading?: string;
		emptyDescription?: string;
		/** Rows per page; 0 (default) shows all rows with no pagination. */
		pageSize?: number;
	}

	let {
		columns,
		rows,
		rowKey,
		row,
		loading = false,
		searchable = true,
		searchValue = '',
		searchPlaceholder = 'Search',
		onsearch,
		filters,
		actions,
		emptyHeading = 'Nothing here yet',
		emptyDescription = '',
		pageSize = 0
	}: Props = $props();

	const hasToolbar = $derived(searchable || !!filters || !!actions);

	// Client-side pagination (only when pageSize > 0).
	let page = $state(1);
	const pageCount = $derived(pageSize > 0 ? Math.max(1, Math.ceil(rows.length / pageSize)) : 1);
	// Reset to a valid page when the row set changes (e.g. filtering).
	$effect(() => {
		if (page > pageCount) page = 1;
	});
	const pageRows = $derived(
		pageSize > 0 ? rows.slice((page - 1) * pageSize, page * pageSize) : rows
	);
	const rangeStart = $derived(rows.length === 0 ? 0 : (page - 1) * pageSize + 1);
	const rangeEnd = $derived(Math.min(page * pageSize, rows.length));
	const showPagination = $derived(pageSize > 0 && rows.length > pageSize);
</script>

<div class="dtv">
	{#if hasToolbar}
		<div class="toolbar">
			{#if searchable}
				<div class="toolbar-search">
					<SearchField
						placeholder={searchPlaceholder}
						value={searchValue}
						oninput={(e) => onsearch?.((e.target as HTMLInputElement).value)}
						onclear={() => onsearch?.('')}
					/>
				</div>
			{/if}
			{#if filters}
				<div class="toolbar-filters">{@render filters()}</div>
			{/if}
			{#if actions}
				<div class="toolbar-actions">{@render actions()}</div>
			{/if}
		</div>
	{/if}

	{#if loading}
		<div class="dtv-centered"><Spinner /></div>
	{:else if rows.length === 0}
		<div class="dtv-empty">
			<EmptyState heading={emptyHeading} description={emptyDescription} />
		</div>
	{:else}
		<DataTable>
			<thead>
				<tr>
					{#each columns as col (col.label)}
						<th data-align={col.align ?? 'left'}>{col.label}</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#each pageRows as item (rowKey(item))}
					<tr>{@render row(item)}</tr>
				{/each}
			</tbody>
		</DataTable>

		{#if showPagination}
			<div class="dtv-pagination">
				<span class="dtv-range">{rangeStart}–{rangeEnd} of {rows.length}</span>
				<div class="dtv-pager">
					<Button size="slim" variant="secondary" disabled={page <= 1} onclick={() => (page -= 1)}>
						Previous
					</Button>
					<Button
						size="slim"
						variant="secondary"
						disabled={page >= pageCount}
						onclick={() => (page += 1)}
					>
						Next
					</Button>
				</div>
			</div>
		{/if}
	{/if}
</div>

<style>
	.dtv {
		background: var(--color-bg-surface);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-card);
		overflow: hidden;
	}
	.toolbar {
		display: flex;
		align-items: center;
		gap: var(--space-300);
		padding: var(--space-400);
		border-bottom: 1px solid var(--color-border);
		flex-wrap: wrap;
	}
	.toolbar-search {
		flex: 1;
		min-width: 200px;
	}
	.toolbar-filters {
		display: flex;
		gap: var(--space-200);
		align-items: center;
	}
	.toolbar-actions {
		margin-left: auto;
	}
	/* The inner DataTable already draws its own surface/shadow — flatten it here. */
	.dtv :global(.data-table-wrapper) {
		box-shadow: none;
		border-radius: 0;
	}
	.dtv-centered {
		display: flex;
		justify-content: center;
		padding: var(--space-700);
	}
	.dtv-empty {
		padding: var(--space-500);
	}
	.dtv-pagination {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-300);
		padding: var(--space-300) var(--space-400);
		border-top: 1px solid var(--color-border);
	}
	.dtv-range {
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
	}
	.dtv-pager {
		display: flex;
		gap: var(--space-200);
	}
</style>
