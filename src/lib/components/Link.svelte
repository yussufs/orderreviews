<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		href: string;
		external?: boolean;
		monochrome?: boolean;
		children: Snippet;
		onclick?: (event: MouseEvent) => void;
	}

	let { href, external = false, monochrome = false, children, onclick }: Props = $props();
</script>

<a
	{href}
	class="link"
	class:monochrome
	target={external ? '_blank' : undefined}
	rel={external ? 'noopener noreferrer' : undefined}
	{onclick}
>
	{@render children()}
	{#if external}
		<svg
			viewBox="0 0 20 20"
			fill="currentColor"
			width="16"
			height="16"
			class="external-icon"
			aria-hidden="true"
		>
			<path
				d="M14 11V5H8M14 5L6 13"
				stroke="currentColor"
				stroke-width="1.5"
				stroke-linecap="round"
				stroke-linejoin="round"
				fill="none"
			/>
		</svg>
	{/if}
</a>

<style>
	.link {
		display: inline-flex;
		align-items: center;
		gap: var(--space-100);
		color: var(--color-text-link);
		text-decoration: none;
		font-weight: var(--font-weight-medium);
		transition: color var(--duration-fast) var(--ease-default);
	}

	.link:hover {
		color: var(--color-text-link-hover);
		text-decoration: underline;
	}

	.link:focus-visible {
		outline: 2px solid var(--color-border-focus);
		outline-offset: 2px;
		border-radius: var(--radius-sm);
	}

	.link.monochrome {
		color: inherit;
	}

	.link.monochrome:hover {
		color: var(--color-text-link);
	}

	.external-icon {
		flex-shrink: 0;
	}
</style>
