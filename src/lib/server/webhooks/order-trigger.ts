/**
 * Shared handler for the orders/paid and orders/fulfilled webhooks.
 *
 * Both topics are always subscribed; this no-ops unless review collection is
 * enabled AND the firing topic matches the merchant's configured trigger.
 * Creating the request is idempotent (unique shop+orderId), so duplicate
 * deliveries / both topics firing never double-send.
 */
import {
	getSettings,
	createReviewRequest,
	setSendJob
} from '$lib/server/services/review-collection';
import { enqueueFeedbackEmail } from '$lib/server/queue/enqueue';
import { resolveAppBaseUrl } from '$lib/server/shopify';

/** Minimal shape of the Shopify Order webhook payload we rely on. */
interface OrderPayload {
	id?: number | string;
	admin_graphql_api_id?: string;
	email?: string;
	contact_email?: string;
	// Legacy top-level marketing flag (still sent on order webhooks).
	buyer_accepts_marketing?: boolean;
	customer?: {
		email?: string;
		first_name?: string;
		last_name?: string;
		// Current consent model: state is 'subscribed' when the customer opted in.
		email_marketing_consent?: {
			state?: string;
		} | null;
	};
}

/**
 * Whether the customer has consented to marketing email. We only send post-order
 * review-request emails to customers who opted in, so we respect their consent
 * decision (required to truthfully answer the Protected Customer Data
 * questionnaire). Prefers the current `email_marketing_consent.state` and falls
 * back to the legacy `buyer_accepts_marketing` flag.
 */
function customerConsented(payload: OrderPayload): boolean {
	const state = payload.customer?.email_marketing_consent?.state;
	if (state) return state === 'subscribed';
	return payload.buyer_accepts_marketing === true;
}

export async function handleOrderTrigger(
	shop: string,
	topic: string,
	rawPayload: unknown
): Promise<void> {
	const settings = await getSettings(shop);
	if (!settings.enabled || settings.trigger !== topic) return;

	const payload = rawPayload as OrderPayload;

	const customerEmail = payload.email || payload.contact_email || payload.customer?.email;
	const orderId = payload.admin_graphql_api_id || (payload.id != null ? String(payload.id) : null);

	if (!customerEmail || !orderId) {
		console.log(`[webhook] ${topic} for ${shop}: missing email or order id, skipping`);
		return;
	}

	// Respect the customer's marketing-consent decision — never email customers
	// who haven't opted in.
	if (!customerConsented(payload)) {
		console.log(`[webhook] ${topic} for ${shop}: customer not consented, skipping ${orderId}`);
		return;
	}

	const customerName = [payload.customer?.first_name, payload.customer?.last_name]
		.filter(Boolean)
		.join(' ')
		.trim();

	const delaySeconds = Math.max(0, settings.delayDays) * 86400;
	const scheduledFor = new Date(Date.now() + delaySeconds * 1000);

	const { row, created } = await createReviewRequest({
		shop,
		orderId,
		customerEmail,
		customerName: customerName || null,
		scheduledFor,
		// Capture the live app URL (CLI-injected tunnel in dev, SHOPIFY_APP_URL in
		// production) so the worker can build feedback links.
		appBaseUrl: resolveAppBaseUrl()
	});

	// Only enqueue on first creation (idempotency for duplicate/both-topic deliveries).
	if (!created) {
		console.log(`[webhook] ${topic} for ${shop}: request already exists for ${orderId}`);
		return;
	}

	const jobId = await enqueueFeedbackEmail({ shop, reviewRequestId: row.id }, delaySeconds);
	if (jobId) await setSendJob(row.id, jobId);
	console.log(`[webhook] ${topic} for ${shop}: scheduled feedback email for order ${orderId}`);
}
