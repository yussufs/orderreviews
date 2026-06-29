/**
 * followup-email handler — sends a reminder if the customer hasn't responded,
 * then schedules the next reminder up to maxFollowups. Framework-agnostic.
 *
 * Cancellation: when the customer responds, the landing route cancels any
 * scheduled follow-up jobs. This handler also bails defensively on responded/cancelled.
 */
import { eq } from 'drizzle-orm';
import { getWorkerDb } from '../db';
import { reviewRequests, reviewCollectionSettings } from '../../../shared/db/schema';
import { sendEmail } from '../../email/ses';
import { feedbackRequestEmail } from '../../email/templates';
import { enqueueFollowupEmail } from '../enqueue';
import { buildRatingLinks, prettyStoreName } from './shared';
import type { FollowupEmailPayload } from '../boss';

export async function handleFollowupEmail(data: FollowupEmailPayload): Promise<void> {
	const db = getWorkerDb();

	const req = await db.query.reviewRequests.findFirst({
		where: eq(reviewRequests.id, data.reviewRequestId)
	});
	if (!req) return;
	if (req.status === 'responded' || req.status === 'cancelled') {
		console.log(`[worker] followup skipped (status=${req.status}) for ${req.id}`);
		return;
	}

	const settings = await db.query.reviewCollectionSettings.findFirst({
		where: eq(reviewCollectionSettings.shop, data.shop)
	});
	if (!settings || !settings.enabled || !settings.followupEnabled) return;
	if ((req.followupsSent ?? 0) >= settings.maxFollowups) return;

	const storeName = prettyStoreName(data.shop, settings.storeName || settings.fromName);
	const ratingLinks = buildRatingLinks(req.id, settings.ratingType, data.shop);
	const { subject, html } = feedbackRequestEmail({
		storeName,
		customerName: req.customerName,
		ratingType: settings.ratingType,
		ratingLinks,
		isFollowup: true
	});

	const result = await sendEmail({
		to: req.customerEmail,
		subject,
		html,
		fromName: settings.fromName || undefined
	});
	if (!result.success) throw new Error(result.error || 'Failed to send follow-up email');

	const followupsSent = (req.followupsSent ?? 0) + 1;
	await db
		.update(reviewRequests)
		.set({ followupsSent, updatedAt: new Date() })
		.where(eq(reviewRequests.id, req.id));

	// Schedule the next reminder if we haven't hit the cap.
	if (followupsSent < settings.maxFollowups) {
		const delay = Math.max(0, settings.followupDelayDays) * 86400;
		const jobId = await enqueueFollowupEmail(
			{ shop: data.shop, reviewRequestId: req.id, attempt: data.attempt + 1 },
			delay
		);
		if (jobId) {
			await db
				.update(reviewRequests)
				.set({ followupJobIds: [...(req.followupJobIds ?? []), jobId], updatedAt: new Date() })
				.where(eq(reviewRequests.id, req.id));
		}
	}

	console.log(`[worker] followup #${followupsSent} sent for ${req.id}`);
}
