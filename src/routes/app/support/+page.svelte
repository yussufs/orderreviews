<script lang="ts">
	import { page } from '$app/state';
	import { Page, Card, Button, Banner, TextField, Select, Text, Icon } from '$lib/components';
	import { apiFetch } from '$lib/client/api';

	// Prefill subject/message from the URL (e.g. "Verify my account" CTAs link here).
	const params = page.url.searchParams;

	let name = $state('');
	let email = $state('');
	let subject = $state(params.get('subject') ?? '');
	let message = $state(params.get('message') ?? '');

	let submitting = $state(false);
	let error = $state<string | null>(null);
	let sent = $state(false);

	const topics = [
		{ value: '', label: 'Choose a topic…' },
		{ value: 'Widget & display', label: 'Widget & display' },
		{ value: 'Review collection & emails', label: 'Review collection & emails' },
		{ value: 'Importing reviews', label: 'Importing reviews' },
		{ value: 'Location verification', label: 'Location verification' },
		{ value: 'Billing & plans', label: 'Billing & plans' },
		{ value: 'Other', label: 'Other' }
	];

	const helpTopics = [
		{
			title: 'Widget & display',
			desc: 'Adding the reviews widget to your storefront, layouts, and styling.'
		},
		{
			title: 'Review collection & emails',
			desc: 'Post-order feedback requests, rating routing, and follow-ups.'
		},
		{
			title: 'Importing reviews',
			desc: 'Connecting a Google business and importing its reviews.'
		}
	];

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		submitting = true;
		error = null;
		try {
			const res = await apiFetch<{ ok?: boolean; dryRun?: boolean }>('/app/api/support', {
				method: 'POST',
				body: { name, email, subject, message }
			});
			if (res.ok) {
				sent = true;
				window.shopify?.toast?.show('Message sent');
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Could not send your message.';
		} finally {
			submitting = false;
		}
	}
</script>

<svelte:head>
	<title>Support</title>
</svelte:head>

<Page
	title="Support"
	subtitle="Questions or issues? Send us a message and we'll get back to you."
	backAction={{ url: '/app', label: 'Home' }}
>
	{#snippet aside()}
		<Card title="Help topics">
			<div class="topics">
				{#each helpTopics as topic (topic.title)}
					<div class="topic">
						<Text variant="bodyMd" fontWeight="semibold">{topic.title}</Text>
						<Text variant="bodySm" tone="subdued">{topic.desc}</Text>
					</div>
				{/each}
			</div>
		</Card>
	{/snippet}

	{#if sent}
		<Card>
			<div class="success">
				<span class="success-icon">
					<Icon name="check" tone="success" />
				</span>
				<Text variant="headingMd">Thanks — your message is on its way</Text>
				<Text tone="subdued">
					We've received your request and will reply to <strong>{email}</strong> as soon as we can.
				</Text>
				<Button href="/app">Back to home</Button>
			</div>
		</Card>
	{:else}
		<Card>
			<form onsubmit={submit}>
				<div class="form">
					{#if error}
						<Banner tone="critical" title="Couldn't send your message">{error}</Banner>
					{/if}

					<TextField
						name="name"
						label="Your name"
						value={name}
						oninput={(e) => (name = (e.target as HTMLInputElement).value)}
						autoComplete="name"
					/>
					<TextField
						name="email"
						label="Email"
						type="email"
						value={email}
						oninput={(e) => (email = (e.target as HTMLInputElement).value)}
						autoComplete="email"
						helpText="We'll reply to this address."
					/>
					<Select
						name="subject"
						label="Topic"
						value={subject}
						options={topics}
						onchange={(e) => (subject = (e.target as HTMLSelectElement).value)}
					/>
					<TextField
						name="message"
						label="Message"
						multiline
						rows={6}
						value={message}
						oninput={(e) => (message = (e.target as HTMLTextAreaElement).value)}
						placeholder="Tell us what's going on, with as much detail as you can."
					/>

					<div>
						<Button type="submit" variant="primary" loading={submitting}>Send message</Button>
					</div>
				</div>
			</form>
		</Card>

		<div class="response-time">
			<Banner tone="info">We typically reply within 1–2 business days.</Banner>
		</div>
	{/if}
</Page>

<style>
	.form {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
	.topics {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
	.topic {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.response-time {
		margin-top: 16px;
	}
	.success {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 12px;
		padding: 8px 4px;
	}
	.success-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background: var(--color-bg-surface-success, #e3f1df);
		color: #0c5132;
	}
</style>
