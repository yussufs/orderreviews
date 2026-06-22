<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let submitting = $state(false);
</script>

<svelte:head>
	<title>{data.storeName} — Feedback</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main class="wrap">
	<div class="card">
		{#if data.branch === 'positive'}
			<div class="emoji">🎉</div>
			<h1>Thanks so much!</h1>
			<p>We're thrilled you had a great experience with {data.storeName}.</p>
			{#if data.writeReviewUrl}
				<p>Would you mind sharing it on Google? It only takes a moment and means a lot.</p>
				<a class="btn primary" href={data.writeReviewUrl} target="_blank" rel="noopener noreferrer">
					Leave a Google review
				</a>
			{:else}
				<p>We appreciate your support.</p>
			{/if}
		{:else if form?.success}
			<div class="emoji">🙏</div>
			<h1>Thank you for your feedback</h1>
			<p>We've shared it with the {data.storeName} team and we'll use it to do better.</p>
		{:else}
			<div class="emoji">💬</div>
			<h1>We're sorry to hear that</h1>
			<p>
				Your feedback goes straight to the {data.storeName} team — please tell us what went wrong so we
				can make it right.
			</p>
			<form
				method="POST"
				use:enhance={() => {
					submitting = true;
					return async ({ update }) => {
						await update();
						submitting = false;
					};
				}}
			>
				<textarea name="message" rows="5" placeholder="Tell us what happened…" required></textarea>
				<button class="btn primary" type="submit" disabled={submitting}>
					{submitting ? 'Sending…' : 'Send feedback'}
				</button>
			</form>
		{/if}
	</div>
</main>

<style>
	:global(body) {
		margin: 0;
		background: #f4f5f7;
	}
	.wrap {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 24px;
		font-family:
			-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
		color: #1a1a1a;
	}
	.card {
		background: #fff;
		border: 1px solid #e5e7eb;
		border-radius: 16px;
		padding: 40px 32px;
		max-width: 480px;
		width: 100%;
		text-align: center;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
	}
	.emoji {
		font-size: 48px;
		line-height: 1;
		margin-bottom: 12px;
	}
	h1 {
		font-size: 24px;
		margin: 0 0 12px;
	}
	p {
		color: #4b5563;
		line-height: 1.6;
		margin: 0 0 16px;
	}
	textarea {
		width: 100%;
		box-sizing: border-box;
		border: 1px solid #d1d5db;
		border-radius: 8px;
		padding: 12px;
		font: inherit;
		resize: vertical;
		margin-bottom: 16px;
	}
	.btn {
		display: inline-block;
		text-decoration: none;
		border: none;
		cursor: pointer;
		font: inherit;
		font-weight: 600;
		padding: 14px 28px;
		border-radius: 8px;
	}
	.btn.primary {
		background: #1a73e8;
		color: #fff;
	}
	.btn.primary:disabled {
		opacity: 0.6;
		cursor: default;
	}
</style>
