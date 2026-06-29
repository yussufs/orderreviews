/**
 * Review-collection service (SvelteKit-side, `$lib/server/db`).
 * Used by the order webhooks, the public landing route, and the merchant UI.
 * The worker's email handlers do their own queries via the worker DB.
 */
import { db } from '$lib/server/db';
import {
	reviewCollectionSettings,
	reviewRequests,
	feedbackSubmissions,
	type ReviewTrigger,
	type RatingType
} from '$lib/shared/db';
import { type FormContent, DEFAULT_FORM_CONTENT } from '$lib/shared/review-form-html';
import { eq, and, desc } from 'drizzle-orm';

export type ReviewCollectionSettingsRow = typeof reviewCollectionSettings.$inferSelect;
export type ReviewRequestRow = typeof reviewRequests.$inferSelect;
export type FeedbackRow = typeof feedbackSubmissions.$inferSelect;

export interface ReviewCollectionSettingsInput {
	enabled: boolean;
	trigger: ReviewTrigger;
	delayDays: number;
	ratingType: RatingType;
	threshold: number;
	placeId?: string | null;
	followupEnabled: boolean;
	followupDelayDays: number;
	maxFollowups: number;
	notifyMerchantOnLowRating: boolean;
	merchantEmail?: string | null;
	fromName?: string | null;
	subject?: string | null;
	storeName?: string | null;
	formContent?: FormContent;
}

/** Defaults mirror the column defaults; returned when a shop has no row yet. */
export function defaultSettings(shop: string): ReviewCollectionSettingsRow {
	const now = new Date();
	return {
		shop,
		enabled: false,
		trigger: 'orders/fulfilled',
		delayDays: 5,
		ratingType: 'stars',
		threshold: 4,
		placeId: null,
		followupEnabled: true,
		followupDelayDays: 3,
		maxFollowups: 1,
		notifyMerchantOnLowRating: true,
		merchantEmail: null,
		fromName: null,
		subject: null,
		storeName: null,
		formContent: DEFAULT_FORM_CONTENT,
		createdAt: now,
		updatedAt: now
	};
}

export async function getSettings(shop: string): Promise<ReviewCollectionSettingsRow> {
	const rows = await db
		.select()
		.from(reviewCollectionSettings)
		.where(eq(reviewCollectionSettings.shop, shop))
		.limit(1);
	return rows[0] ?? defaultSettings(shop);
}

export async function saveSettings(
	shop: string,
	input: ReviewCollectionSettingsInput
): Promise<ReviewCollectionSettingsRow> {
	const now = new Date();
	const values = { shop, ...input, updatedAt: now };
	const result = await db
		.insert(reviewCollectionSettings)
		.values({ ...values, createdAt: now })
		.onConflictDoUpdate({ target: reviewCollectionSettings.shop, set: values })
		.returning();
	return result[0];
}

/**
 * Create a review request for an order, idempotently (unique on shop+orderId).
 * Returns the row and whether it was newly created (so we only enqueue once).
 */
export async function createReviewRequest(params: {
	shop: string;
	orderId: string;
	customerEmail: string;
	customerName?: string | null;
	scheduledFor: Date;
	appBaseUrl?: string | null;
}): Promise<{ row: ReviewRequestRow; created: boolean }> {
	const now = new Date();
	const inserted = await db
		.insert(reviewRequests)
		.values({
			shop: params.shop,
			orderId: params.orderId,
			customerEmail: params.customerEmail,
			customerName: params.customerName ?? null,
			appBaseUrl: params.appBaseUrl ?? null,
			status: 'scheduled',
			scheduledFor: params.scheduledFor,
			createdAt: now,
			updatedAt: now
		})
		.onConflictDoNothing({
			target: [reviewRequests.shop, reviewRequests.orderId]
		})
		.returning();

	if (inserted[0]) return { row: inserted[0], created: true };

	// Already existed — fetch it.
	const existing = await db
		.select()
		.from(reviewRequests)
		.where(and(eq(reviewRequests.shop, params.shop), eq(reviewRequests.orderId, params.orderId)))
		.limit(1);
	return { row: existing[0], created: false };
}

/** Persist the scheduled email's job id on the request. */
export async function setSendJob(id: string, sendJobId: string): Promise<void> {
	await db
		.update(reviewRequests)
		.set({ sendJobId, updatedAt: new Date() })
		.where(eq(reviewRequests.id, id));
}

/** Load a review request by id (public landing uses the token's rid). */
export async function getReviewRequest(id: string): Promise<ReviewRequestRow | null> {
	const rows = await db.select().from(reviewRequests).where(eq(reviewRequests.id, id)).limit(1);
	return rows[0] ?? null;
}

/**
 * Mark a request responded with a rating (first response wins). Returns the
 * follow-up job ids that should now be cancelled, or null if already responded.
 */
export async function markResponded(
	id: string,
	rating: number
): Promise<{ followupJobIds: string[] } | null> {
	const current = await getReviewRequest(id);
	if (!current) return null;
	if (current.status === 'responded') return null; // first response wins

	await db
		.update(reviewRequests)
		.set({ status: 'responded', rating, respondedAt: new Date(), updatedAt: new Date() })
		.where(eq(reviewRequests.id, id));

	return { followupJobIds: current.followupJobIds ?? [] };
}

/** Record private below-threshold feedback (from an order email or the shared link). */
export async function recordFeedback(params: {
	shop: string;
	reviewRequestId?: string | null;
	source?: 'order' | 'link';
	rating: number;
	message?: string | null;
	customerEmail?: string | null;
}): Promise<FeedbackRow> {
	const result = await db
		.insert(feedbackSubmissions)
		.values({
			shop: params.shop,
			reviewRequestId: params.reviewRequestId ?? null,
			source: params.source ?? 'order',
			rating: params.rating,
			message: params.message ?? null,
			customerEmail: params.customerEmail ?? null
		})
		.returning();
	return result[0];
}

export async function markFeedbackEmailed(id: string): Promise<void> {
	await db
		.update(feedbackSubmissions)
		.set({ emailedMerchant: true })
		.where(eq(feedbackSubmissions.id, id));
}

/** Delete a feedback submission, scoped to the shop. Returns true if removed. */
export async function deleteFeedback(shop: string, id: string): Promise<boolean> {
	const result = await db
		.delete(feedbackSubmissions)
		.where(and(eq(feedbackSubmissions.id, id), eq(feedbackSubmissions.shop, shop)))
		.returning({ id: feedbackSubmissions.id });
	return result.length > 0;
}

/** Feedback inbox for the merchant UI, newest first. */
export async function getFeedbackForShop(shop: string): Promise<FeedbackRow[]> {
	return db
		.select()
		.from(feedbackSubmissions)
		.where(eq(feedbackSubmissions.shop, shop))
		.orderBy(desc(feedbackSubmissions.createdAt));
}
