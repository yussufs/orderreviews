<script lang="ts">
	import { onMount } from 'svelte';
	import type { PageData } from './$types';
	import { Page, Card, Button, Banner, TextField, Switch, Text, Spinner } from '$lib/components';
	import { apiFetch } from '$lib/client/api';
	import {
		renderReviewForm,
		type FormContent,
		type PreviewStep
	} from '$lib/shared/review-form-html';

	let { data }: { data: PageData } = $props();

	type RatingType = 'stars' | 'thumbs';

	// Full settings object (PUT needs the other fields too).
	let settings = $state<Record<string, unknown> | null>(null);
	let content = $state<FormContent | null>(null);
	let ratingType = $state<RatingType>('stars');
	let threshold = $state(4);
	let storeNameInput = $state('');

	let isLoading = $state(true);
	let isSaving = $state(false);
	let saved = $state(false);
	let error = $state<string | null>(null);

	let step = $state<PreviewStep>('rating');

	onMount(async () => {
		try {
			const res = await apiFetch<{ settings: Record<string, unknown> }>(
				'/app/api/review-collection'
			);
			settings = res.settings;
			content = structuredClone(res.settings.formContent as FormContent);
			ratingType = (res.settings.ratingType as RatingType) ?? 'stars';
			threshold = (res.settings.threshold as number) ?? 4;
			storeNameInput = (res.settings.storeName as string | null) ?? '';
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load form';
		} finally {
			isLoading = false;
		}
	});

	const derivedStoreName = $derived(
		(data.shop || '')
			.replace(/\.myshopify\.com$/, '')
			.split(/[-_]/)
			.filter(Boolean)
			.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
			.join(' ') || 'Your store'
	);
	const storeName = $derived(storeNameInput.trim() || derivedStoreName);

	const previewHtml = $derived(
		content
			? renderReviewForm({
					storeName,
					ratingType,
					threshold,
					writeReviewUrl: '#',
					content,
					previewStep: step
				})
			: ''
	);

	async function save() {
		if (!settings || !content) return;
		try {
			isSaving = true;
			saved = false;
			await apiFetch('/app/api/review-collection', {
				method: 'PUT',
				body: {
					...settings,
					ratingType,
					storeName: storeNameInput.trim() || null,
					formContent: content
				}
			});
			saved = true;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Save failed';
		} finally {
			isSaving = false;
		}
	}

	const steps: { value: PreviewStep; label: string }[] = [
		{ value: 'rating', label: 'Rating' },
		{ value: 'positive', label: 'Positive' },
		{ value: 'negative', label: 'Private feedback' },
		{ value: 'thanks', label: 'Thank you' }
	];

	const breadcrumbs = [{ label: 'Feedback', href: '/app/feedback' }, { label: 'Feedback form' }];
</script>

<svelte:head>
	<title>Feedback form</title>
</svelte:head>

<Page title="Edit feedback form" {breadcrumbs}>
	{#snippet primaryAction()}
		<Button variant="primary" disabled={isSaving || !content} onclick={save}>
			{isSaving ? 'Saving…' : 'Save'}
		</Button>
	{/snippet}

	{#if error}
		<Banner tone="critical" title="Something went wrong">{error}</Banner>
	{/if}
	{#if saved}
		<Banner tone="success" title="Saved">Your form was updated.</Banner>
	{/if}

	{#if isLoading || !content}
		<Card><div class="centered"><Spinner /></div></Card>
	{:else}
		<div class="editor">
			<!-- Edit panel -->
			<div class="panel">
				<Card title="Layout">
					<div class="fields" style="margin-bottom: var(--space-300)">
						<TextField
							label="Store name"
							name="store-name"
							value={storeNameInput}
							placeholder={derivedStoreName}
							helpText="Shown as the form title and wherever {'{store}'} appears. Defaults to your store’s name."
							oninput={(e) => (storeNameInput = (e.target as HTMLInputElement).value)}
						/>
					</div>
					<div class="seg">
						<button
							class="seg-btn"
							class:active={ratingType === 'stars'}
							type="button"
							onclick={() => (ratingType = 'stars')}>★ Stars</button
						>
						<button
							class="seg-btn"
							class:active={ratingType === 'thumbs'}
							type="button"
							onclick={() => (ratingType = 'thumbs')}>👍 Thumbs</button
						>
					</div>
					<Text tone="subdued" variant="bodySm">
						Use <code>{'{store}'}</code> in any text to insert your store name.
					</Text>
				</Card>

				<Card title="Step">
					<div class="steps">
						{#each steps as s (s.value)}
							<button
								class="step-btn"
								class:active={step === s.value}
								type="button"
								onclick={() => (step = s.value)}>{s.label}</button
							>
						{/each}
					</div>

					<div class="fields">
						{#if step === 'rating'}
							<TextField
								label="Heading"
								name="r-heading"
								value={content.rating.heading}
								oninput={(e) => (content!.rating.heading = (e.target as HTMLInputElement).value)}
							/>
							<TextField
								label="Subtext"
								name="r-subtext"
								value={content.rating.subtext}
								oninput={(e) => (content!.rating.subtext = (e.target as HTMLInputElement).value)}
							/>
						{:else if step === 'positive'}
							<TextField
								label="Heading"
								name="p-heading"
								value={content.positive.heading}
								oninput={(e) => (content!.positive.heading = (e.target as HTMLInputElement).value)}
							/>
							<TextField
								label="Body"
								name="p-body"
								value={content.positive.body}
								oninput={(e) => (content!.positive.body = (e.target as HTMLInputElement).value)}
							/>
							<TextField
								label="Google button label"
								name="p-btn"
								value={content.positive.buttonLabel}
								oninput={(e) =>
									(content!.positive.buttonLabel = (e.target as HTMLInputElement).value)}
							/>
						{:else if step === 'negative'}
							<TextField
								label="Heading"
								name="n-heading"
								value={content.negative.heading}
								oninput={(e) => (content!.negative.heading = (e.target as HTMLInputElement).value)}
							/>
							<TextField
								label="Body"
								name="n-body"
								value={content.negative.body}
								oninput={(e) => (content!.negative.body = (e.target as HTMLInputElement).value)}
							/>
							<TextField
								label="Message placeholder"
								name="n-msg"
								value={content.negative.messagePlaceholder}
								oninput={(e) =>
									(content!.negative.messagePlaceholder = (e.target as HTMLInputElement).value)}
							/>
							<TextField
								label="Email placeholder"
								name="n-email"
								value={content.negative.emailPlaceholder}
								oninput={(e) =>
									(content!.negative.emailPlaceholder = (e.target as HTMLInputElement).value)}
							/>
							<Switch
								label="Require an email address"
								name="n-required"
								checked={content.negative.emailRequired}
								onchange={(e) =>
									(content!.negative.emailRequired = (e.target as HTMLInputElement).checked)}
							/>
							<TextField
								label="Submit button label"
								name="n-submit"
								value={content.negative.submitLabel}
								oninput={(e) =>
									(content!.negative.submitLabel = (e.target as HTMLInputElement).value)}
							/>
						{:else}
							<TextField
								label="Heading"
								name="t-heading"
								value={content.thanks.heading}
								oninput={(e) => (content!.thanks.heading = (e.target as HTMLInputElement).value)}
							/>
							<TextField
								label="Body"
								name="t-body"
								value={content.thanks.body}
								oninput={(e) => (content!.thanks.body = (e.target as HTMLInputElement).value)}
							/>
						{/if}
					</div>
				</Card>
			</div>

			<!-- Live preview -->
			<div class="preview-col">
				<div class="preview-frame">
					<div class="preview-label">Preview · {steps.find((s) => s.value === step)?.label}</div>
					<iframe class="preview-iframe" title="Form preview" srcdoc={previewHtml}></iframe>
				</div>
			</div>
		</div>
	{/if}
</Page>

<style>
	.centered {
		display: flex;
		justify-content: center;
		padding: var(--space-600);
	}
	.editor {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--space-400);
	}
	@media (min-width: 900px) {
		.editor {
			grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
			align-items: start;
		}
	}
	.panel {
		display: flex;
		flex-direction: column;
		gap: var(--space-400);
	}
	.seg,
	.steps {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-200);
		margin-bottom: var(--space-300);
	}
	.seg-btn,
	.step-btn {
		cursor: pointer;
		font: inherit;
		padding: var(--space-150) var(--space-300);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md, 8px);
		background: var(--color-bg-surface, #fff);
		color: var(--color-text, #1a1a1a);
	}
	.seg-btn.active,
	.step-btn.active {
		border-color: var(--color-bg-fill-info, #1a73e8);
		color: var(--color-bg-fill-info, #1a73e8);
		font-weight: 600;
	}
	.fields {
		display: flex;
		flex-direction: column;
		gap: var(--space-300);
	}
	code {
		background: var(--color-bg-surface-secondary, #f1f1f1);
		padding: 1px 5px;
		border-radius: 4px;
	}
	.preview-col {
		position: sticky;
		top: var(--space-400);
	}
	.preview-frame {
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg, 12px);
		overflow: hidden;
		background: var(--color-bg-surface, #fff);
	}
	.preview-label {
		padding: var(--space-200) var(--space-300);
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary, #6b7280);
		border-bottom: 1px solid var(--color-border);
	}
	.preview-iframe {
		width: 100%;
		height: 560px;
		border: 0;
		display: block;
		background: #f4f5f7;
	}
</style>
