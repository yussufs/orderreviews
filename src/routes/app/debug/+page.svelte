<script lang="ts">
	import { onMount } from 'svelte';
	import { Page, Card, Button, Badge, Banner, TextField, Text } from '$lib/components';
	import { apiFetch } from '$lib/client/api';

	interface DebugState {
		plan: 'free' | 'premium';
		planInterval: string | null;
		subscriptionStatus: string | null;
		subscriptionId: string | null;
		period: string;
		emailsSent: number;
		cap: number;
		overLimit: boolean;
		overLimitNotifiedAt: string | null;
		defaultEmail: string;
	}

	let dbg = $state<DebugState | null>(null);
	let isLoading = $state(true);
	let busy = $state(false);
	let error = $state<string | null>(null);
	let note = $state<string | null>(null);

	let email = $state('');
	let usageInput = $state('0');

	async function refresh() {
		const { state } = await apiFetch<{ state: DebugState }>('/app/api/debug');
		dbg = state;
		usageInput = String(state.emailsSent);
		if (!email) email = state.defaultEmail;
	}

	onMount(async () => {
		try {
			await refresh();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load debug state';
		} finally {
			isLoading = false;
		}
	});

	async function act(body: Record<string, unknown>, successNote: string) {
		busy = true;
		error = null;
		note = null;
		try {
			const res = await apiFetch<{ state?: DebugState; dryRun?: boolean }>('/app/api/debug', {
				method: 'POST',
				body
			});
			if (res.state) {
				dbg = res.state;
				usageInput = String(res.state.emailsSent);
			} else {
				await refresh();
			}
			note = res.dryRun ? `${successNote} (logged to console — no SES creds)` : successNote;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Action failed';
		} finally {
			busy = false;
		}
	}
</script>

<svelte:head>
	<title>Debug</title>
</svelte:head>

<Page title="Debug" subtitle="Dev-only tools for testing pricing, gating, and emails.">
	<Banner tone="warning" title="Development only">
		This page is hidden in production. Actions here bypass Shopify billing and write directly to the
		database.
	</Banner>

	{#if error}
		<Banner tone="critical" title="Error">{error}</Banner>
	{/if}
	{#if note}
		<Banner tone="success" title="Done">{note}</Banner>
	{/if}

	{#if isLoading}
		<Text tone="subdued">Loading…</Text>
	{:else if dbg}
		<div class="grid">
			<Card title="Current state">
				<div class="state">
					<div>
						<span class="k">Plan</span>
						<Badge tone={dbg.plan === 'premium' ? 'success' : 'info'}>{dbg.plan}</Badge>
						{#if dbg.planInterval}<span class="muted">({dbg.planInterval})</span>{/if}
					</div>
					<div><span class="k">Subscription status</span>{dbg.subscriptionStatus ?? '—'}</div>
					<div><span class="k">Subscription id</span>{dbg.subscriptionId ?? '—'}</div>
					<div>
						<span class="k">Emails this month ({dbg.period})</span>
						{dbg.emailsSent}/{dbg.cap}
						{#if dbg.overLimit}<Badge tone="critical">over limit</Badge>{/if}
					</div>
					<div>
						<span class="k">Over-limit notified</span>
						{dbg.overLimitNotifiedAt ? new Date(dbg.overLimitNotifiedAt).toLocaleString() : 'no'}
					</div>
				</div>
			</Card>

			<Card title="Plan">
				<div class="actions">
					<Button
						variant={dbg.plan === 'premium' ? 'secondary' : 'primary'}
						disabled={busy}
						onclick={() => act({ action: 'setPlan', plan: 'premium' }, 'Set to Premium')}
					>
						Make Premium
					</Button>
					<Button
						variant={dbg.plan === 'free' ? 'secondary' : 'primary'}
						disabled={busy}
						onclick={() => act({ action: 'setPlan', plan: 'free' }, 'Set to Free')}
					>
						Make Free
					</Button>
				</div>
			</Card>

			<Card title="Monthly email usage">
				<div class="row">
					<TextField
						name="usage"
						label="Emails sent"
						type="number"
						value={usageInput}
						oninput={(e) => (usageInput = (e.target as HTMLInputElement).value)}
					/>
					<Button
						disabled={busy}
						onclick={() =>
							act({ action: 'setUsage', emailsSent: Number(usageInput) }, 'Usage updated')}
					>
						Set
					</Button>
				</div>
				<div class="actions">
					<Button
						variant="secondary"
						disabled={busy}
						onclick={() => act({ action: 'setUsage', emailsSent: 0 }, 'Usage reset')}
					>
						Reset to 0
					</Button>
					<Button
						variant="secondary"
						disabled={busy}
						onclick={() => act({ action: 'setUsage', emailsSent: dbg?.cap ?? 10 }, 'Usage maxed')}
					>
						Set to cap ({dbg.cap})
					</Button>
				</div>
			</Card>

			<Card title="Test emails">
				<div class="row">
					<TextField
						name="recipient"
						label="Recipient"
						type="email"
						placeholder="you@example.com"
						value={email}
						oninput={(e) => (email = (e.target as HTMLInputElement).value)}
					/>
				</div>
				<div class="actions">
					<Button
						disabled={busy || !email}
						onclick={() => act({ action: 'sendFeedbackEmail', email }, 'Feedback email sent')}
					>
						Send feedback request
					</Button>
					<Button
						variant="secondary"
						disabled={busy || !email}
						onclick={() => act({ action: 'sendOverLimitEmail', email }, 'Over-limit email sent')}
					>
						Send over-limit email
					</Button>
				</div>
			</Card>
		</div>
	{/if}
</Page>

<style>
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 16px;
		margin-top: 16px;
	}
	.state {
		display: flex;
		flex-direction: column;
		gap: 10px;
		font-size: 14px;
	}
	.state .k {
		display: block;
		color: #6b7280;
		font-size: 12px;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}
	.muted {
		color: #6b7280;
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-top: 8px;
	}
	.row {
		display: flex;
		align-items: flex-end;
		gap: 8px;
	}
</style>
