<script lang="ts">
	interface Props {
		label?: string;
		name?: string;
		value?: string;
		placeholder?: string;
		disabled?: boolean;
		labelHidden?: boolean;
		oninput?: (event: Event) => void;
		onchange?: (event: Event) => void;
		onclear?: () => void;
	}

	let {
		label = 'Search',
		name = 'search',
		value = '',
		placeholder = 'Search',
		disabled = false,
		labelHidden = true,
		oninput,
		onchange,
		onclear
	}: Props = $props();

	const inputId = `search-${name}-${Math.random().toString(36).substring(7)}`;

	function handleClear() {
		if (onclear) {
			onclear();
		}
	}
</script>

<div class="search-field" class:disabled>
	<label for={inputId} class="label" class:visually-hidden={labelHidden}>
		{label}
	</label>
	<div class="input-wrapper">
		<span class="search-icon">
			<svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20">
				<path
					fill-rule="evenodd"
					d="M8 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM2 8a6 6 0 1 1 10.89 3.476l4.817 4.817a1 1 0 0 1-1.414 1.414l-4.816-4.816A6 6 0 0 1 2 8Z"
					clip-rule="evenodd"
				/>
			</svg>
		</span>
		<input
			type="search"
			id={inputId}
			{name}
			{value}
			{placeholder}
			{disabled}
			class="input"
			{oninput}
			{onchange}
		/>
		{#if value}
			<button type="button" class="clear-button" onclick={handleClear} aria-label="Clear search">
				<svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20">
					<path
						fill-rule="evenodd"
						d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.707 7.293a1 1 0 0 0-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 1 0 1.414 1.414L10 11.414l1.293 1.293a1 1 0 0 0 1.414-1.414L11.414 10l1.293-1.293a1 1 0 0 0-1.414-1.414L10 8.586 8.707 7.293Z"
						clip-rule="evenodd"
					/>
				</svg>
			</button>
		{/if}
	</div>
</div>

<style>
	.search-field {
		display: flex;
		flex-direction: column;
		gap: var(--space-100);
	}

	.label {
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-medium);
		color: var(--color-text);
	}

	.label.visually-hidden {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	.input-wrapper {
		position: relative;
		display: flex;
		align-items: center;
	}

	.search-icon {
		position: absolute;
		left: var(--space-300);
		pointer-events: none;
		color: var(--color-text-secondary);
		display: flex;
	}

	.input {
		flex: 1;
		padding: var(--space-200) var(--space-300) var(--space-200) 40px;
		font-family: inherit;
		font-size: var(--font-size-md);
		color: var(--color-text);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		min-height: 36px;
		transition:
			border-color var(--duration-fast) var(--ease-default),
			box-shadow var(--duration-fast) var(--ease-default);
	}

	.input:focus {
		outline: none;
		border-color: var(--color-border-focus);
		box-shadow: 0 0 0 1px var(--color-border-focus);
	}

	.input::placeholder {
		color: var(--color-text-disabled);
	}

	.input::-webkit-search-cancel-button {
		display: none;
	}

	.disabled .input {
		background: var(--color-bg-surface-secondary);
		color: var(--color-text-disabled);
		cursor: not-allowed;
	}

	.clear-button {
		position: absolute;
		right: var(--space-200);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-100);
		background: transparent;
		border: none;
		border-radius: var(--radius-sm);
		color: var(--color-text-secondary);
		cursor: pointer;
		transition:
			color var(--duration-fast) var(--ease-default),
			background-color var(--duration-fast) var(--ease-default);
	}

	.clear-button:hover {
		color: var(--color-text);
		background: var(--color-bg-surface-secondary);
	}

	.clear-button:focus-visible {
		outline: 2px solid var(--color-border-focus);
		outline-offset: 2px;
	}
</style>
