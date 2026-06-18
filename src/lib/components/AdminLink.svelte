<script lang="ts">
	import type { Snippet } from 'svelte';

	/**
	 * A link to a Shopify admin / theme-editor destination from inside the
	 * embedded app.
	 *
	 * Renders a real anchor targeting the TOP frame — App Bridge's preferred form
	 * for admin destinations. Do NOT use the regular <Link external> for these:
	 * its target="_blank" is the wrong primitive inside the sandboxed iframe.
	 *
	 * Pair with the URL builders in $lib/admin-links (addAppBlockUrl,
	 * activateAppEmbedUrl) so the host is already resolved. See CLAUDE.md
	 * "Admin / Theme-Editor Deep Links".
	 */
	interface Props {
		/** Resolved admin.shopify.com/store/{handle}/... URL. */
		href: string;
		monochrome?: boolean;
		children: Snippet;
		onclick?: (event: MouseEvent) => void;
	}

	let { href, monochrome = false, children, onclick }: Props = $props();
</script>

<a {href} target="_top" class="link" class:monochrome {onclick}>
	{@render children()}
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
</style>
