<script lang="ts">
	interface Props {
		spacing?: 'none' | 'tight' | 'base' | 'loose';
	}

	let { spacing = 'base' }: Props = $props();
</script>

<hr
	class="divider"
	class:spacing-none={spacing === 'none'}
	class:spacing-tight={spacing === 'tight'}
	class:spacing-loose={spacing === 'loose'}
/>

<style>
	.divider {
		border: none;
		height: 1px;
		background: var(--color-border);
		margin: var(--space-400) 0;
	}

	.divider.spacing-none {
		margin: 0;
	}

	.divider.spacing-tight {
		margin: var(--space-200) 0;
	}

	.divider.spacing-loose {
		margin: var(--space-600) 0;
	}
</style>
