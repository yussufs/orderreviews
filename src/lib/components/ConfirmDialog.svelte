<script lang="ts">
	import Button from './Button.svelte';

	interface Props {
		open: boolean;
		title: string;
		message?: string;
		confirmLabel?: string;
		cancelLabel?: string;
		/** Red, filled confirm button (default). */
		destructive?: boolean;
		loading?: boolean;
		onconfirm: () => void;
		oncancel: () => void;
	}

	let {
		open,
		title,
		message,
		confirmLabel = 'Delete',
		cancelLabel = 'Cancel',
		destructive = true,
		loading = false,
		onconfirm,
		oncancel
	}: Props = $props();

	function onkeydown(e: KeyboardEvent) {
		if (open && e.key === 'Escape' && !loading) oncancel();
	}
</script>

<svelte:window {onkeydown} />

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="overlay" onclick={() => !loading && oncancel()}>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div
			class="dialog"
			role="dialog"
			aria-modal="true"
			aria-label={title}
			tabindex="-1"
			onclick={(e) => e.stopPropagation()}
		>
			<h2 class="dialog-title">{title}</h2>
			{#if message}
				<p class="dialog-msg">{message}</p>
			{/if}
			<div class="dialog-actions">
				<Button variant="secondary" disabled={loading} onclick={oncancel}>{cancelLabel}</Button>
				<Button
					variant="primary"
					tone={destructive ? 'critical' : 'default'}
					{loading}
					onclick={onconfirm}
				>
					{confirmLabel}
				</Button>
			</div>
		</div>
	</div>
{/if}

<style>
	.overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.45);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-400);
		z-index: 400;
	}
	.dialog {
		background: var(--color-bg-surface, #fff);
		border-radius: var(--radius-lg, 12px);
		box-shadow: var(--shadow-lg, 0 12px 32px rgba(0, 0, 0, 0.2));
		max-width: 420px;
		width: 100%;
		padding: var(--space-500);
	}
	.dialog-title {
		font-size: var(--font-size-lg, 1.125rem);
		font-weight: var(--font-weight-semibold, 600);
		margin: 0 0 var(--space-200);
	}
	.dialog-msg {
		margin: 0 0 var(--space-400);
		color: var(--color-text-secondary, #4b5563);
		line-height: 1.5;
	}
	.dialog-actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--space-200);
	}
</style>
