<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Option {
		value: string;
		label: string;
		disabled?: boolean;
	}

	interface Props {
		label: string;
		name: string;
		options: Option[];
		value?: string;
		placeholder?: string;
		disabled?: boolean;
		error?: string;
		helpText?: string;
		labelHidden?: boolean;
		required?: boolean;
		onchange?: (event: Event) => void;
	}

	let {
		label,
		name,
		options,
		value = '',
		placeholder = 'Select an option',
		disabled = false,
		error,
		helpText,
		labelHidden = false,
		required = false,
		onchange
	}: Props = $props();

	const selectId = `select-${name}-${Math.random().toString(36).substring(7)}`;
</script>

<div class="select-field" class:has-error={error} class:disabled>
	<label for={selectId} class="label" class:visually-hidden={labelHidden}>
		{label}
		{#if required}
			<span class="required">*</span>
		{/if}
	</label>
	<div class="select-wrapper">
		<select
			id={selectId}
			{name}
			{value}
			{disabled}
			aria-invalid={error ? 'true' : undefined}
			aria-describedby={error ? `${selectId}-error` : helpText ? `${selectId}-help` : undefined}
			class="select"
			{onchange}
		>
			{#if placeholder}
				<option value="" disabled selected={!value}>{placeholder}</option>
			{/if}
			{#each options as option}
				<option value={option.value} disabled={option.disabled} selected={option.value === value}>
					{option.label}
				</option>
			{/each}
		</select>
		<span class="chevron">
			<svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20">
				<path
					fill-rule="evenodd"
					d="M5.293 7.293a1 1 0 0 1 1.414 0L10 10.586l3.293-3.293a1 1 0 1 1 1.414 1.414l-4 4a1 1 0 0 1-1.414 0l-4-4a1 1 0 0 1 0-1.414Z"
					clip-rule="evenodd"
				/>
			</svg>
		</span>
	</div>
	{#if error}
		<p id="{selectId}-error" class="error-text">{error}</p>
	{:else if helpText}
		<p id="{selectId}-help" class="help-text">{helpText}</p>
	{/if}
</div>

<style>
	.select-field {
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

	.required {
		color: var(--color-text-critical);
	}

	.select-wrapper {
		position: relative;
		display: flex;
	}

	.select {
		flex: 1;
		appearance: none;
		padding: var(--space-200) var(--space-800) var(--space-200) var(--space-300);
		font-family: inherit;
		font-size: var(--font-size-md);
		color: var(--color-text);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		cursor: pointer;
		min-height: 36px;
		transition:
			border-color var(--duration-fast) var(--ease-default),
			box-shadow var(--duration-fast) var(--ease-default);
	}

	.select:focus {
		outline: none;
		border-color: var(--color-border-focus);
		box-shadow: 0 0 0 1px var(--color-border-focus);
	}

	.has-error .select {
		border-color: var(--color-border-critical);
	}

	.has-error .select:focus {
		box-shadow: 0 0 0 1px var(--color-border-critical);
	}

	.disabled .select {
		background: var(--color-bg-surface-secondary);
		color: var(--color-text-disabled);
		cursor: not-allowed;
	}

	.chevron {
		position: absolute;
		right: var(--space-300);
		top: 50%;
		transform: translateY(-50%);
		pointer-events: none;
		color: var(--color-text-secondary);
	}

	.error-text {
		font-size: var(--font-size-sm);
		color: var(--color-text-critical);
		margin: 0;
	}

	.help-text {
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
		margin: 0;
	}
</style>
