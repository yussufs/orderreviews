/**
 * feedback-email handler — sends the initial post-order feedback email, then
 * schedules the first follow-up. Framework-agnostic (worker process).
 */
import { eq } from 'drizzle-orm';
import { getWorkerDb } from '../db';
import { reviewRequests, reviewCollectionSettings } from '../../../shared/db/schema';
import { sendEmail } from '../../email/ses';
import { feedbackRequestEmail } from '../../email/templates';
import { enqueueFollowupEmail } from '../enqueue';
import { buildRatingLinks, prettyStoreName } from './shared';
import type { FeedbackEmailPayload } from '../boss';

export async function handleFeedbackEmail(data: FeedbackEmailPayload): Promise<void> {
	const db = getWorkerDb();

	const req = await db.query.reviewRequests.findFirst({
		where: eq(reviewRequests.id, data.reviewRequestId)
	});
	if (!req) return;
	// Only send if still scheduled (cancelled on uninstall, or already responded).
	if (req.status !== 'scheduled') {
		console.log(`[worker] feedback-email skipped (status=${req.status}) for ${req.id}`);
		return;
	}

	const settings = await db.query.reviewCollectionSettings.findFirst({
		where: eq(reviewCollectionSettings.shop, data.shop)
	});
	if (!settings || !settings.enabled) return;

	const storeName = prettyStoreName(data.shop, settings.fromName);
	const ratingLinks = buildRatingLinks(req.id, settings.ratingType, data.shop);
	const { subject, html } = feedbackRequestEmail({
		storeName,
		customerName: req.customerName,
		ratingType: settings.ratingType,
		ratingLinks
	});

	const result = await sendEmail({
		to: req.customerEmail,
		subject: settings.subject || subject,
		html,
		fromName: settings.fromName || undefined
	});
	if (!result.success) throw new Error(result.error || 'Failed to send feedback email');

	await db
		.update(reviewRequests)
		.set({ status: 'sent', sentAt: new Date(), updatedAt: new Date() })
		.where(eq(reviewRequests.id, req.id));

	// Schedule the first follow-up reminder.
	if (settings.followupEnabled && settings.maxFollowups > 0) {
		const delay = Math.max(0, settings.followupDelayDays) * 86400;
		const jobId = await enqueueFollowupEmail(
			{ shop: data.shop, reviewRequestId: req.id, attempt: 1 },
			delay
		);
		if (jobId) {
			await db
				.update(reviewRequests)
				.set({ followupJobIds: [...(req.followupJobIds ?? []), jobId], updatedAt: new Date() })
				.where(eq(reviewRequests.id, req.id));
		}
	}

	console.log(`[worker] feedback-email sent for ${req.id}`);
}
