/**
 * feedback-email handler — sends the initial post-order feedback email, then
 * schedules the first follow-up. Framework-agnostic (worker process).
 */
import { eq } from 'drizzle-orm';
import { getWorkerDb } from '../db';
import {
	reviewRequests,
	reviewCollectionSettings,
	shopPreferences
} from '../../../shared/db/schema';
import { sendEmail } from '../../email/ses';
import { feedbackRequestEmail, overLimitEmail } from '../../email/templates';
import { enqueueFollowupEmail } from '../enqueue';
import { buildRatingLinks, prettyStoreName } from './shared';
import { FREE_EMAIL_CAP } from '../../../shared/billing/limits';
import {
	currentPeriod,
	getShopPlan,
	getUsage,
	incrementEmailsSent,
	markOverLimitNotified
} from '../../../shared/billing/usage';
import { appAdminUrl } from '../../../shared/billing/app-urls';
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

	const storeName = prettyStoreName(data.shop, settings.storeName || settings.fromName);

	// Free-tier cap: at most FREE_EMAIL_CAP initial request emails per calendar
	// month. Enforced at SEND time (the configurable delay can push a send into a
	// later month, so the counter must reflect the actual send month). Follow-ups
	// are unaffected — only this initial handler counts/caps.
	const plan = await getShopPlan(db, data.shop);
	if (plan === 'free') {
		const period = currentPeriod();
		const { emailsSent, overLimitNotifiedAt } = await getUsage(db, data.shop, period);
		if (emailsSent >= FREE_EMAIL_CAP) {
			await db
				.update(reviewRequests)
				.set({ status: 'capped', updatedAt: new Date() })
				.where(eq(reviewRequests.id, req.id));

			// Notify the merchant once per month that they've hit the free limit.
			if (!overLimitNotifiedAt) {
				const prefs = await db.query.shopPreferences.findFirst({
					where: eq(shopPreferences.shop, data.shop)
				});
				const recipient = settings.merchantEmail || prefs?.email;
				if (recipient) {
					const { subject, html } = overLimitEmail({
						storeName,
						cap: FREE_EMAIL_CAP,
						upgradeUrl: appAdminUrl(data.shop)
					});
					const notify = await sendEmail({ to: recipient, subject, html });
					if (notify.success) await markOverLimitNotified(db, data.shop, period);
				}
			}

			console.log(`[worker] feedback-email capped (free tier, ${period}) for ${req.id}`);
			return;
		}
	}
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
		// Sender name defaults to the store name when not explicitly set.
		fromName: settings.fromName || storeName
	});
	if (!result.success) throw new Error(result.error || 'Failed to send feedback email');

	await db
		.update(reviewRequests)
		.set({ status: 'sent', sentAt: new Date(), updatedAt: new Date() })
		.where(eq(reviewRequests.id, req.id));

	// Count this initial send against the shop's monthly usage (powers the free cap
	// + the in-app usage meter). Follow-ups never increment.
	await incrementEmailsSent(db, data.shop, currentPeriod());

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
