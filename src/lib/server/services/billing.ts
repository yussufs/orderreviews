/**
 * Billing service — keeps `shopPreferences` plan state in sync with the Shopify
 * Billing API (`appSubscriptionCreate`). Two writers feed `setPlanState`:
 *   1. the `app_subscriptions/update` webhook (primary, push), and
 *   2. `syncSubscription` (best-effort reconciliation on app open, pull).
 * Gating code never calls Shopify — it just reads `shopPreferences.plan`.
 * `createSubscription` / `cancelSubscription` drive the subscription itself.
 */
import { db } from '$lib/server/db';
import { shopPreferences, type ShopPlan } from '$lib/shared/db';
import type { AdminClient } from '$lib/server/shopify/graphql';
import { getUsage, currentPeriod } from '$lib/shared/billing/usage';
import { FREE_EMAIL_CAP } from '$lib/shared/billing/limits';
import { eq } from 'drizzle-orm';

export type BillingInterval = 'monthly' | 'annual';

/** The premium plans we offer via the Billing API. Prices in USD. */
export const PLANS: Record<
	BillingInterval,
	{ name: string; amount: string; interval: 'EVERY_30_DAYS' | 'ANNUAL' }
> = {
	monthly: { name: 'Premium (Monthly)', amount: '14.99', interval: 'EVERY_30_DAYS' },
	annual: { name: 'Premium (Annual)', amount: '119.88', interval: 'ANNUAL' }
};

export const TRIAL_DAYS = 7;

export interface PlanState {
	plan: ShopPlan;
	planInterval?: 'monthly' | 'annual' | null;
	subscriptionId?: string | null;
	subscriptionStatus?: string | null;
	currentPeriodEnd?: Date | null;
}

/** Upsert a shop's plan state (creates the preferences row if needed). */
export async function setPlanState(shop: string, state: PlanState): Promise<void> {
	const now = new Date();
	const fields = {
		plan: state.plan,
		planInterval: state.planInterval ?? null,
		subscriptionId: state.subscriptionId ?? null,
		subscriptionStatus: state.subscriptionStatus ?? null,
		currentPeriodEnd: state.currentPeriodEnd ?? null,
		subscriptionUpdatedAt: now
	};
	await db
		.insert(shopPreferences)
		.values({ shop, ...fields })
		.onConflictDoUpdate({
			target: shopPreferences.shop,
			set: { ...fields, updatedAt: now }
		});
}

export interface PlanContext {
	plan: ShopPlan;
	planInterval: 'monthly' | 'annual' | null;
	usage: { emailsSent: number; cap: number; overLimit: boolean };
}

/** Reconcile at most once an hour (the webhook is the real-time signal). */
const RECONCILE_TTL_MS = 60 * 60 * 1000;

/**
 * Plan + usage context for the `/app` layout. Reconciles from the Admin API only
 * when the stored state is stale, so navigation between pages doesn't spam Shopify.
 */
export async function loadPlanContext(shop: string, admin?: AdminClient): Promise<PlanContext> {
	const prefs = await db.query.shopPreferences.findFirst({
		where: eq(shopPreferences.shop, shop)
	});
	const stale =
		!prefs?.subscriptionUpdatedAt ||
		Date.now() - prefs.subscriptionUpdatedAt.getTime() > RECONCILE_TTL_MS;

	let plan: ShopPlan = prefs?.plan ?? 'free';
	let planInterval = prefs?.planInterval ?? null;
	if (admin && stale) {
		await syncSubscription(shop, admin);
		const fresh = await db.query.shopPreferences.findFirst({
			where: eq(shopPreferences.shop, shop)
		});
		plan = fresh?.plan ?? 'free';
		planInterval = fresh?.planInterval ?? null;
	}

	const usage = await getUsage(db, shop, currentPeriod());
	return {
		plan,
		planInterval,
		usage: {
			emailsSent: usage.emailsSent,
			cap: FREE_EMAIL_CAP,
			overLimit: usage.emailsSent >= FREE_EMAIL_CAP
		}
	};
}

/** Map a Shopify AppRecurringPricing.interval to our stored value. */
function toInterval(interval?: string | null): 'monthly' | 'annual' | null {
	if (interval === 'ANNUAL') return 'annual';
	if (interval === 'EVERY_30_DAYS') return 'monthly';
	return null;
}

interface ActiveSubscriptionsResponse {
	currentAppInstallation?: {
		activeSubscriptions?: Array<{
			id: string;
			name: string;
			status: string;
			currentPeriodEnd: string | null;
			lineItems?: Array<{
				plan?: { pricingDetails?: { interval?: string | null } };
			}>;
		}>;
	};
}

/**
 * Reconcile a shop's plan from the Admin API (catches any missed webhook).
 * Best-effort — logs and returns on failure, never throws into a page load.
 */
export async function syncSubscription(shop: string, admin: AdminClient): Promise<void> {
	try {
		const res = await admin.graphql<ActiveSubscriptionsResponse>(
			`#graphql
			query GetActiveSubscriptions {
				currentAppInstallation {
					activeSubscriptions {
						id
						name
						status
						currentPeriodEnd
						lineItems {
							plan {
								pricingDetails {
									... on AppRecurringPricing {
										interval
									}
								}
							}
						}
					}
				}
			}`
		);
		if (res.errors?.length) {
			console.error(`[billing] syncSubscription errors for ${shop}:`, res.errors);
			return;
		}

		const subs = res.data?.currentAppInstallation?.activeSubscriptions ?? [];
		const active = subs.find((s) => s.status === 'ACTIVE') ?? null;

		if (active) {
			await setPlanState(shop, {
				plan: 'premium',
				planInterval: toInterval(active.lineItems?.[0]?.plan?.pricingDetails?.interval),
				subscriptionId: active.id,
				subscriptionStatus: active.status,
				currentPeriodEnd: active.currentPeriodEnd ? new Date(active.currentPeriodEnd) : null
			});
		} else {
			await setPlanState(shop, {
				plan: 'free',
				planInterval: null,
				subscriptionId: null,
				subscriptionStatus: subs[0]?.status ?? null,
				currentPeriodEnd: null
			});
		}
	} catch (err) {
		console.error(`[billing] syncSubscription failed for ${shop}:`, err);
	}
}

interface AppSubscriptionCreateResponse {
	appSubscriptionCreate?: {
		confirmationUrl: string | null;
		appSubscription: { id: string; status: string } | null;
		userErrors: Array<{ field: string[] | null; message: string }>;
	};
}

/**
 * Start a premium subscription. Returns the Shopify-hosted `confirmationUrl` the
 * merchant must be redirected to (top frame) to approve the charge. `test: true`
 * runs the full approval flow without billing real money (use in dev).
 */
export async function createSubscription(opts: {
	admin: AdminClient;
	interval: BillingInterval;
	returnUrl: string;
	test: boolean;
}): Promise<{ confirmationUrl?: string; error?: string }> {
	const plan = PLANS[opts.interval];
	const res = await opts.admin.graphql<AppSubscriptionCreateResponse>(
		`#graphql
		mutation AppSubscriptionCreate(
			$name: String!
			$returnUrl: URL!
			$trialDays: Int
			$test: Boolean
			$lineItems: [AppSubscriptionLineItemInput!]!
		) {
			appSubscriptionCreate(
				name: $name
				returnUrl: $returnUrl
				trialDays: $trialDays
				test: $test
				lineItems: $lineItems
			) {
				confirmationUrl
				appSubscription { id status }
				userErrors { field message }
			}
		}`,
		{
			variables: {
				name: plan.name,
				returnUrl: opts.returnUrl,
				trialDays: TRIAL_DAYS,
				test: opts.test,
				lineItems: [
					{
						plan: {
							appRecurringPricingDetails: {
								price: { amount: plan.amount, currencyCode: 'USD' },
								interval: plan.interval
							}
						}
					}
				]
			}
		}
	);

	if (res.errors?.length) return { error: res.errors[0].message };
	const payload = res.data?.appSubscriptionCreate;
	if (payload?.userErrors?.length) return { error: payload.userErrors[0].message };
	if (!payload?.confirmationUrl) return { error: 'No confirmation URL returned' };
	return { confirmationUrl: payload.confirmationUrl };
}

interface AppSubscriptionCancelResponse {
	appSubscriptionCancel?: {
		appSubscription: { id: string; status: string } | null;
		userErrors: Array<{ field: string[] | null; message: string }>;
	};
}

/** Cancel a subscription by id and drop the shop back to the free plan. */
export async function cancelSubscription(
	shop: string,
	admin: AdminClient,
	subscriptionId: string
): Promise<{ error?: string }> {
	const res = await admin.graphql<AppSubscriptionCancelResponse>(
		`#graphql
		mutation AppSubscriptionCancel($id: ID!) {
			appSubscriptionCancel(id: $id) {
				appSubscription { id status }
				userErrors { field message }
			}
		}`,
		{ variables: { id: subscriptionId } }
	);

	if (res.errors?.length) return { error: res.errors[0].message };
	const userErrors = res.data?.appSubscriptionCancel?.userErrors;
	if (userErrors?.length) return { error: userErrors[0].message };

	await setPlanState(shop, {
		plan: 'free',
		planInterval: null,
		subscriptionId: null,
		subscriptionStatus: 'CANCELLED'
	});
	return {};
}
