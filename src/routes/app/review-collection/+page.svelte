<script lang="ts">
	import { onMount } from 'svelte';
	import {
		Page,
		Card,
		Button,
		Banner,
		Select,
		Switch,
		TextField,
		Text,
		Spinner
	} from '$lib/components';
	import { apiFetch } from '$lib/client/api';

	type Trigger = 'orders/paid' | 'orders/fulfilled';
	type RatingType = 'stars' | 'thumbs';

	interface Settings {
		enabled: boolean;
		trigger: Trigger;
		delayDays: number;
		ratingType: RatingType;
		threshold: number;
		placeId: string | null;
		followupEnabled: boolean;
		followupDelayDays: number;
		maxFollowups: number;
		notifyMerchantOnLowRating: boolean;
		merchantEmail: string | null;
		fromName: string | null;
		subject: string | null;
	}
	interface Location {
		placeId: string;
		title: string;
	}

	let s = $state<Settings | null>(null);
	let locations = $state<Location[]>([]);
	let isLoading = $state(true);
	let isSaving = $state(false);
	let error = $state<string | null>(null);
	let saved = $state(false);

	onMount(async () => {
		try {
			const [settingsData, locData] = await Promise.all([
				apiFetch<{ settings: Settings }>('/app/api/review-collection'),
				apiFetch<{ locations: Location[] }>('/app/api/locations')
			]);
			s = settingsData.settings;
			locations = locData.locations;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load settings';
		} finally {
			isLoading = false;
		}
	});

	async function save() {
		if (!s) return;
		try {
			isSaving = true;
			saved = false;
			await apiFetch('/app/api/review-collection', { method: 'PUT', body: s });
			saved = true;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Save failed';
		} finally {
			isSaving = false;
		}
	}

	const triggerOptions = [
		{ value: 'orders/fulfilled', label: 'When the order is fulfilled' },
		{ value: 'orders/paid', label: 'When the order is paid' }
	];
	const ratingTypeOptions = [
		{ value: 'stars', label: 'Star rating (1–5)' },
		{ value: 'thumbs', label: 'Thumbs up / down' }
	];
	const thresholdOptions = [
		{ value: '3', label: '3+' },
		{ value: '4', label: '4+' },
		{ value: '5', label: '5 only' }
	];
	const locationOptions = $derived([
		{ value: '', label: 'First connected location' },
		...locations.map((l) => ({ value: l.placeId, label: l.title }))
	]);

	function num(e: Event): number {
		return Number((e.target as HTMLInputElement).value);
	}
</script>

<svelte:head>
	<title>Review collection</title>
</svelte:head>

<Page
	title="Review collection"
	breadcrumbs={[
		{ label: 'Reviews', href: '/app/reviews' },
		{ label: 'Get more reviews', href: '/app/get-reviews' },
		{ label: 'Email requests' }
	]}
>
	{#if error}
		<Banner tone="critical" title="Something went wrong">{error}</Banner>
	{/if}
	{#if saved}
		<Banner tone="success" title="Saved">Your settings were saved.</Banner>
	{/if}

	{#if isLoading || !s}
		<Card><div class="centered"><Spinner /></div></Card>
	{:else}
		<Card title="Email request">
			<Switch
				label="Enable post-order review collection"
				name="enabled"
				checked={s.enabled}
				onchange={(e) => (s!.enabled = (e.target as HTMLInputElement).checked)}
			/>
			<Select
				label="Send the email…"
				name="trigger"
				value={s.trigger}
				options={triggerOptions}
				onchange={(e) => (s!.trigger = (e.target as HTMLSelectElement).value as Trigger)}
			/>
			<TextField
				label="Delay (days after trigger)"
				name="delayDays"
				type="number"
				value={String(s.delayDays)}
				oninput={(e) => (s!.delayDays = num(e))}
				helpText="Use 0 to send (almost) immediately — handy for testing."
			/>
		</Card>

		<Card title="Rating &amp; routing">
			<Select
				label="Ask for"
				name="ratingType"
				value={s.ratingType}
				options={ratingTypeOptions}
				onchange={(e) => (s!.ratingType = (e.target as HTMLSelectElement).value as RatingType)}
			/>
			<Select
				label="Send to Google when rating is"
				name="threshold"
				value={String(s.threshold)}
				options={thresholdOptions}
				onchange={(e) => (s!.threshold = Number((e.target as HTMLSelectElement).value))}
			/>
			<Select
				label="Google location for positive reviews"
				name="placeId"
				value={s.placeId ?? ''}
				options={locationOptions}
				onchange={(e) => (s!.placeId = (e.target as HTMLSelectElement).value || null)}
			/>
			<Text tone="subdued">
				Ratings at or above the threshold are sent to your Google review page. Lower ratings go to a
				private feedback form instead.
			</Text>
		</Card>

		<Card title="Follow-up reminder">
			<Switch
				label="Send a reminder if the customer doesn't respond"
				name="followupEnabled"
				checked={s.followupEnabled}
				onchange={(e) => (s!.followupEnabled = (e.target as HTMLInputElement).checked)}
			/>
			<TextField
				label="Reminder delay (days)"
				name="followupDelayDays"
				type="number"
				value={String(s.followupDelayDays)}
				oninput={(e) => (s!.followupDelayDays = num(e))}
			/>
			<TextField
				label="Max reminders"
				name="maxFollowups"
				type="number"
				value={String(s.maxFollowups)}
				oninput={(e) => (s!.maxFollowups = num(e))}
			/>
		</Card>

		<Card title="Private feedback &amp; sender">
			<Switch
				label="Email me when a customer leaves low-rating feedback"
				name="notifyMerchantOnLowRating"
				checked={s.notifyMerchantOnLowRating}
				onchange={(e) => (s!.notifyMerchantOnLowRating = (e.target as HTMLInputElement).checked)}
			/>
			<TextField
				label="Notification email"
				name="merchantEmail"
				type="email"
				value={s.merchantEmail ?? ''}
				oninput={(e) => (s!.merchantEmail = (e.target as HTMLInputElement).value || null)}
				helpText="Where private feedback notifications are sent."
			/>
			<TextField
				label="Sender name"
				name="fromName"
				value={s.fromName ?? ''}
				oninput={(e) => (s!.fromName = (e.target as HTMLInputElement).value || null)}
				helpText="Shown as the store name in the email."
			/>
			<TextField
				label="Email subject (optional)"
				name="subject"
				value={s.subject ?? ''}
				oninput={(e) => (s!.subject = (e.target as HTMLInputElement).value || null)}
			/>
		</Card>

		<div class="save-row">
			<Button variant="primary" disabled={isSaving} onclick={save}>
				{isSaving ? 'Saving…' : 'Save settings'}
			</Button>
		</div>
	{/if}
</Page>

<style>
	.centered {
		display: flex;
		justify-content: center;
		padding: var(--space-600);
	}
	.save-row {
		margin-top: var(--space-400);
	}
</style>
