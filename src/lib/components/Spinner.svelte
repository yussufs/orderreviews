<script lang="ts">
	interface Props {
		size?: 'small' | 'medium' | 'large';
		label?: string;
	}

	let { size = 'medium', label = 'Loading' }: Props = $props();
</script>

<span
	class="spinner"
	class:small={size === 'small'}
	class:large={size === 'large'}
	role="status"
	aria-label={label}
></span>

<style>
	.spinner {
		display: inline-block;
		position: relative;
		width: 24px;
		height: 24px;
	}

	.spinner.small {
		width: 16px;
		height: 16px;
	}

	.spinner.large {
		width: 44px;
		height: 44px;
	}

	.spinner::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		border: 3px solid var(--color-border);
		border-top-color: var(--color-text);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	.spinner.small::before {
		border-width: 2px;
	}

	.spinner.large::before {
		border-width: 4px;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
