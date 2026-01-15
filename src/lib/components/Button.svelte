<script lang="ts">
	import type { Snippet } from 'svelte';

	interface BaseProps {
		variant?: 'primary' | 'secondary' | 'tertiary' | 'plain';
		tone?: 'default' | 'critical' | 'success';
		size?: 'slim' | 'medium' | 'large';
		fullWidth?: boolean;
		loading?: boolean;
		disabled?: boolean;
		icon?: Snippet;
		iconOnly?: boolean;
		children?: Snippet;
	}

	interface ButtonProps extends BaseProps {
		href?: never;
		type?: 'button' | 'submit' | 'reset';
		onclick?: (event: MouseEvent) => void;
	}

	interface LinkProps extends BaseProps {
		href: string;
		type?: never;
		onclick?: (event: MouseEvent) => void;
	}

	type Props = ButtonProps | LinkProps;

	let {
		variant = 'secondary',
		tone = 'default',
		size = 'medium',
		fullWidth = false,
		loading = false,
		disabled = false,
		icon,
		iconOnly = false,
		href,
		type = 'button',
		onclick,
		children
	}: Props = $props();

	let isLink = $derived(!!href);
</script>

{#if isLink}
	<a
		{href}
		class="btn"
		class:primary={variant === 'primary'}
		class:secondary={variant === 'secondary'}
		class:tertiary={variant === 'tertiary'}
		class:plain={variant === 'plain'}
		class:critical={tone === 'critical'}
		class:success={tone === 'success'}
		class:slim={size === 'slim'}
		class:large={size === 'large'}
		class:full-width={fullWidth}
		class:icon-only={iconOnly}
		class:disabled
		onclick={disabled ? undefined : onclick}
		aria-disabled={disabled ? 'true' : undefined}
	>
		{#if loading}
			<span class="spinner"></span>
		{:else if icon}
			<span class="icon">{@render icon()}</span>
		{/if}
		{#if children && !iconOnly}
			<span class="label">{@render children()}</span>
		{/if}
	</a>
{:else}
	<button
		{type}
		class="btn"
		class:primary={variant === 'primary'}
		class:secondary={variant === 'secondary'}
		class:tertiary={variant === 'tertiary'}
		class:plain={variant === 'plain'}
		class:critical={tone === 'critical'}
		class:success={tone === 'success'}
		class:slim={size === 'slim'}
		class:large={size === 'large'}
		class:full-width={fullWidth}
		class:icon-only={iconOnly}
		disabled={disabled || loading}
		{onclick}
	>
		{#if loading}
			<span class="spinner"></span>
		{:else if icon}
			<span class="icon">{@render icon()}</span>
		{/if}
		{#if children && !iconOnly}
			<span class="label">{@render children()}</span>
		{/if}
	</button>
{/if}

<style>
	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.125rem;
		padding: 0.375rem 0.75rem;
		font-family: inherit;
		font-size: var(--font-size-md);
		font-weight: var(--font-weight-medium);
		line-height: 1;
		text-decoration: none;
		border: none;
		border-radius: var(--radius-md);
		cursor: pointer;
		user-select: none;
		touch-action: manipulation;
		-webkit-tap-highlight-color: transparent;
		min-height: 32px;
		min-width: 32px;
	}

	.btn:focus-visible {
		outline: 2px solid var(--color-border-focus);
		outline-offset: 2px;
	}

	/* Primary */
	.btn.primary {
		background-color: var(--color-bg-fill-brand);
		background-image: linear-gradient(rgba(48, 48, 48, 0) 63.53%, rgba(255, 255, 255, 0.15) 100%);
		color: var(--color-text-brand-on-bg-fill);
		box-shadow: var(--shadow-button-primary);
	}

	.btn.primary:hover:not(:disabled) {
		background-color: var(--color-bg-fill-brand-hover);
		background-image: linear-gradient(rgba(26, 26, 26, 0) 63.53%, rgba(255, 255, 255, 0.15) 100%);
		box-shadow: var(--shadow-button-primary-hover);
	}

	.btn.primary.critical {
		background-color: var(--color-bg-fill-critical);
		background-image: linear-gradient(rgba(229, 28, 0, 0) 63.53%, rgba(255, 255, 255, 0.15) 100%);
		box-shadow:
			rgba(0, 0, 0, 0.8) 0px -1px 0px 1px inset,
			rgb(229, 28, 0) 0px 0px 0px 1px inset,
			rgba(255, 255, 255, 0.25) 0px 0.5px 0px 1.5px inset;
	}

	.btn.primary.critical:hover:not(:disabled) {
		background-color: #c41800;
	}

	.btn.primary.success {
		background-color: var(--color-bg-fill-success);
		background-image: linear-gradient(rgba(31, 139, 59, 0) 63.53%, rgba(255, 255, 255, 0.15) 100%);
		box-shadow:
			rgba(0, 0, 0, 0.8) 0px -1px 0px 1px inset,
			rgb(31, 139, 59) 0px 0px 0px 1px inset,
			rgba(255, 255, 255, 0.25) 0px 0.5px 0px 1.5px inset;
	}

	/* Secondary */
	.btn.secondary {
		background: var(--color-bg-fill);
		color: var(--color-text);
		box-shadow: var(--shadow-button);
	}

	.btn.secondary:hover:not(:disabled) {
		background: var(--color-bg-fill-hover);
	}

	.btn.secondary.critical {
		color: var(--color-text-critical);
	}

	/* Tertiary */
	.btn.tertiary {
		background: transparent;
		color: var(--color-text);
		padding: var(--space-200);
	}

	.btn.tertiary:hover:not(:disabled) {
		background: var(--color-bg-surface-hover);
	}

	.btn.tertiary.critical {
		color: var(--color-text-critical);
	}

	/* Plain */
	.btn.plain {
		background: transparent;
		color: var(--color-text-info);
		padding: 0;
		min-height: auto;
	}

	.btn.plain:hover:not(:disabled) {
		text-decoration: underline;
	}

	.btn.plain.critical {
		color: var(--color-text-critical);
	}

	/* Sizes */
	.btn.slim {
		padding: var(--space-100) var(--space-300);
		min-height: 28px;
		font-size: var(--font-size-sm);
	}

	.btn.large {
		padding: var(--space-300) var(--space-500);
		min-height: 44px;
		font-size: var(--font-size-lg);
	}

	/* Full width */
	.btn.full-width {
		width: 100%;
	}

	/* Icon only */
	.btn.icon-only {
		padding: var(--space-200);
	}

	.btn.icon-only.slim {
		padding: var(--space-100);
	}

	/* Disabled */
	.btn:disabled,
	.btn.disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* Icon */
	.icon {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.icon :global(svg) {
		width: 20px;
		height: 20px;
	}

	/* Spinner */
	.spinner {
		width: 20px;
		height: 20px;
		border: 2px solid currentColor;
		border-top-color: transparent;
		border-radius: 50%;
		animation: spin 0.6s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
