import type { RequestHandler } from './$types';
import { authenticateWebhook } from '$lib/server/shopify/webhooks';
import { db } from '$lib/server/db';
import {
	session as sessionTable,
	reviewRequests,
	feedbackSubmissions,
	reviewCollectionSettings,
	widgetSettings,
	locations,
	reviews,
	shopPreferences,
	jobStatus
} from '$lib/shared/db/schema';
import { eq, and } from 'drizzle-orm';
import { cancelFollowups, cancelFeedbackEmail } from '$lib/server/queue/enqueue';

/**
 * Compliance webhook payloads
 * @see https://shopify.dev/docs/apps/build/compliance/privacy-law-compliance
 */
interface CustomerDataRequestPayload {
	shop_id: number;
	shop_domain: string;
	customer: { id: number; email: string; phone?: string };
	orders_requested: number[];
	data_request: { id: number };
}

interface CustomerRedactPayload {
	shop_id: number;
	shop_domain: string;
	customer: { id: number; email: string; phone?: string };
	orders_to_redact: number[];
}

interface ShopRedactPayload {
	shop_id: number;
	shop_domain: string;
}

type CompliancePayload = CustomerDataRequestPayload | CustomerRedactPayload | ShopRedactPayload;

/** Cancel any queued send/follow-up jobs for the given review requests. */
async function cancelJobsFor(
	rows: { sendJobId: string | null; followupJobIds: string[] | null }[]
) {
	const followups = rows.flatMap((r) => r.followupJobIds ?? []);
	if (followups.length) await cancelFollowups(followups);
	for (const r of rows) {
		if (r.sendJobId) await cancelFeedbackEmail(r.sendJobId);
	}
}

export const POST: RequestHandler = async ({ request }) => {
	const { shop, topic, payload } = await authenticateWebhook<CompliancePayload>(request);

	try {
		switch (topic) {
			case 'customers/data_request': {
				const p = payload as CustomerDataRequestPayload;
				const email = p.customer.email;
				// Gather the PII we store for this customer so the merchant can fulfil the request.
				const requests = await db
					.select()
					.from(reviewRequests)
					.where(and(eq(reviewRequests.shop, shop), eq(reviewRequests.customerEmail, email)));
				const feedback = await db
					.select()
					.from(feedbackSubmissions)
					.where(
						and(eq(feedbackSubmissions.shop, shop), eq(feedbackSubmissions.customerEmail, email))
					);
				console.log(
					`[compliance] data_request #${p.data_request.id} for ${email}: ` +
						`${requests.length} review request(s), ${feedback.length} feedback entr(ies)`
				);
				// 30 days to provide this data to the merchant (export / admin panel as you grow).
				break;
			}

			case 'customers/redact': {
				const p = payload as CustomerRedactPayload;
				const email = p.customer.email;

				const requests = await db
					.select()
					.from(reviewRequests)
					.where(and(eq(reviewRequests.shop, shop), eq(reviewRequests.customerEmail, email)));

				await cancelJobsFor(requests);

				// Deleting review requests cascades to their feedback submissions.
				await db
					.delete(reviewRequests)
					.where(and(eq(reviewRequests.shop, shop), eq(reviewRequests.customerEmail, email)));
				// Defensive: remove any feedback rows that referenced this email directly.
				await db
					.delete(feedbackSubmissions)
					.where(
						and(eq(feedbackSubmissions.shop, shop), eq(feedbackSubmissions.customerEmail, email))
					);

				console.log(`[compliance] redacted customer ${email} for ${shop}`);
				break;
			}

			case 'shop/redact': {
				// Cancel queued jobs, then delete all of this shop's data.
				const requests = await db
					.select()
					.from(reviewRequests)
					.where(eq(reviewRequests.shop, shop));
				await cancelJobsFor(requests);

				await db.delete(feedbackSubmissions).where(eq(feedbackSubmissions.shop, shop));
				await db.delete(reviewRequests).where(eq(reviewRequests.shop, shop));
				await db.delete(reviewCollectionSettings).where(eq(reviewCollectionSettings.shop, shop));
				await db.delete(widgetSettings).where(eq(widgetSettings.shop, shop));
				await db.delete(reviews).where(eq(reviews.shop, shop)); // also cascades when locations go
				await db.delete(locations).where(eq(locations.shop, shop));
				await db.delete(jobStatus).where(eq(jobStatus.shop, shop));
				await db.delete(shopPreferences).where(eq(shopPreferences.shop, shop));
				await db.delete(sessionTable).where(eq(sessionTable.shop, shop));

				console.log(`[compliance] deleted all data for shop ${shop}`);
				break;
			}

			default:
				console.log(`Unknown compliance topic: ${topic}`);
		}
	} catch (err) {
		console.error(`Error processing ${topic} webhook:`, err);
	}

	return new Response();
};
