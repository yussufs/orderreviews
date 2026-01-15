<script lang="ts">
	interface Props {
		label: string;
		name: string;
		checked?: boolean;
		value?: string;
		disabled?: boolean;
		helpText?: string;
		error?: string;
		indeterminate?: boolean;
		onchange?: (event: Event) => void;
	}

	let {
		label,
		name,
		checked = false,
		value = '',
		disabled = false,
		helpText,
		error,
		indeterminate = false,
		onchange
	}: Props = $props();

	const checkboxId = `checkbox-${name}-${Math.random().toString(36).substring(7)}`;
</script>

<div class="checkbox-field" class:has-error={error} class:disabled>
	<label class="checkbox-label" for={checkboxId}>
		<input
			type="checkbox"
			id={checkboxId}
			{name}
			{value}
			{checked}
			{disabled}
			aria-invalid={error ? 'true' : undefined}
			aria-describedby={error ? `${checkboxId}-error` : helpText ? `${checkboxId}-help` : undefined}
			class="checkbox-input"
			{onchange}
		/>
		<span class="checkbox-box" class:indeterminate>
			{#if indeterminate}
				<svg viewBox="0 0 20 20" fill="currentColor">
					<path d="M5 10h10" stroke="currentColor" stroke-width="2" />
				</svg>
			{:else}
				<svg viewBox="0 0 20 20" fill="currentColor">
					<path
						fill-rule="evenodd"
						d="M16.707 5.293a1 1 0 0 1 0 1.414l-8 8a1 1 0 0 1-1.414 0l-4-4a1 1 0 0 1 1.414-1.414L8 12.586l7.293-7.293a1 1 0 0 1 1.414 0Z"
						clip-rule="evenodd"
					/>
				</svg>
			{/if}
		</span>
		<span class="checkbox-text">
			<span class="checkbox-label-text">{label}</span>
			{#if helpText && !error}
				<span id="{checkboxId}-help" class="help-text">{helpText}</span>
			{/if}
		</span>
	</label>
	{#if error}
		<p id="{checkboxId}-error" class="error-text">{error}</p>
	{/if}
</div>

<style>
	.checkbox-field {
		display: flex;
		flex-direction: column;
		gap: var(--space-100);
	}

	.checkbox-label {
		display: flex;
		align-items: flex-start;
		gap: var(--space-200);
		cursor: pointer;
	}

	.disabled .checkbox-label {
		cursor: not-allowed;
		opacity: 0.5;
	}

	.checkbox-input {
		position: absolute;
		opacity: 0;
		pointer-events: none;
	}

	.checkbox-box {
		flex-shrink: 0;
		width: 18px;
		height: 18px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-bg-surface);
		border: 2px solid var(--color-border);
		border-radius: var(--radius-sm);
		transition:
			background-color var(--duration-fast) var(--ease-default),
			border-color var(--duration-fast) var(--ease-default);
	}

	.checkbox-box svg {
		width: 14px;
		height: 14px;
		color: var(--color-text-inverse);
		opacity: 0;
		transition: opacity var(--duration-fast) var(--ease-default);
	}

	.checkbox-input:checked + .checkbox-box,
	.checkbox-box.indeterminate {
		background: var(--color-bg-fill-brand);
		border-color: var(--color-bg-fill-brand);
	}

	.checkbox-input:checked + .checkbox-box svg,
	.checkbox-box.indeterminate svg {
		opacity: 1;
	}

	.checkbox-input:focus-visible + .checkbox-box {
		outline: 2px solid var(--color-border-focus);
		outline-offset: 2px;
	}

	.has-error .checkbox-box {
		border-color: var(--color-border-critical);
	}

	.checkbox-text {
		display: flex;
		flex-direction: column;
		gap: var(--space-050);
	}

	.checkbox-label-text {
		font-size: var(--font-size-md);
		color: var(--color-text);
		line-height: 1.25;
	}

	.help-text {
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
	}

	.error-text {
		font-size: var(--font-size-sm);
		color: var(--color-text-critical);
		margin: 0;
		padding-left: 26px;
	}
</style>
