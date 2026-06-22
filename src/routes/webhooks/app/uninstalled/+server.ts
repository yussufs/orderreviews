import type { RequestHandler } from './$types';
import { authenticateWebhook } from '$lib/server/shopify/webhooks';
import { db } from '$lib/server/db';
import { session as sessionTable, reviewRequests } from '$lib/shared/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { cancelFollowups, cancelFeedbackEmail } from '$lib/server/queue/enqueue';

export const POST: RequestHandler = async ({ request }) => {
	const { shop } = await authenticateWebhook(request);

	try {
		// Cancel any still-pending feedback / follow-up jobs so we don't email
		// customers of a store that uninstalled the app.
		const pending = await db
			.select({
				sendJobId: reviewRequests.sendJobId,
				followupJobIds: reviewRequests.followupJobIds
			})
			.from(reviewRequests)
			.where(
				and(eq(reviewRequests.shop, shop), inArray(reviewRequests.status, ['scheduled', 'sent']))
			);

		const followups = pending.flatMap((r) => r.followupJobIds ?? []);
		if (followups.length) await cancelFollowups(followups);
		for (const r of pending) {
			if (r.sendJobId) await cancelFeedbackEmail(r.sendJobId);
		}

		await db.delete(sessionTable).where(eq(sessionTable.shop, shop));
		console.log(`Deleted sessions and cancelled ${pending.length} pending job(s) for ${shop}`);
	} catch (err) {
		console.error('Error processing app/uninstalled webhook:', err);
	}

	return new Response();
};
