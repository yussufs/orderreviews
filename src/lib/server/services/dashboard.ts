/**
 * Dashboard aggregation (SvelteKit-side). One call returns everything the home
 * dashboard needs, computed from existing tables — no schema changes.
 *
 * Metric definitions:
 * - sent          = requests in cohort whose email went out (sentAt set)
 * - responded     = requests in cohort with status 'responded'
 * - responseRate  = responded / sent
 * - toGoogle      = responded with rating >= collection threshold
 * - toPrivate     = responded with rating < threshold
 * Widget stats are cumulative (not range-filtered); collection stats + rating
 * distribution + feedback count honour the range (cohort = created in range).
 */
import { db } from '$lib/server/db';
import {
	locations,
	reviews,
	widgetSettings,
	reviewRequests,
	feedbackSubmissions,
	reviewSnapshots
} from '$lib/shared/db';
import { eq, and, gte, sql, desc } from 'drizzle-orm';
import { getSettings } from './review-collection';

export type DashboardRange = '30d' | 'all';

export interface DashboardData {
	range: DashboardRange;
	setup: { hasLocation: boolean; widgetConfigured: boolean; collectionEnabled: boolean };
	widget: {
		locationCount: number;
		reviewsImported: number;
		totalReviews: number;
		avgRating: number;
		lastRefresh: string | null;
	};
	collection: {
		enabled: boolean;
		threshold: number;
		sent: number;
		responded: number;
		responseRate: number;
		toGoogle: number;
		toPrivate: number;
		avgRating: number;
	};
	ratingDistribution: { stars: number; count: number }[];
	feedback: {
		count: number;
		recent: { id: string; rating: number; message: string | null; createdAt: string }[];
	};
	recentReviews: {
		id: string;
		name: string | null;
		stars: number | null;
		text: string | null;
		date: string | null;
	}[];
	reviewsSummary: {
		newLast7Days: number;
		newByStar: { stars: number; count: number }[];
		growth: { day: string; total: number }[];
	};
}

export async function getDashboard(shop: string, range: DashboardRange): Promise<DashboardData> {
	const since = range === '30d' ? new Date(Date.now() - 30 * 86400 * 1000) : null;

	// --- Widget stats (cumulative) ---
	// totalReviews = the real Google-reported review count (we only import up to
	// 200 rows per location, so count(*) on `reviews` would cap out).
	const [loc] = await db
		.select({
			count: sql<number>`count(*)`,
			totalReviews: sql<number>`coalesce(sum(${locations.reviewsCount}), 0)`,
			avgScore: sql<number | null>`avg(${locations.totalScore})`,
			lastRefresh: sql<Date | null>`max(${locations.lastReviewFetchAt})`
		})
		.from(locations)
		.where(eq(locations.shop, shop));

	const [rev] = await db
		.select({ count: sql<number>`count(*)` })
		.from(reviews)
		.where(eq(reviews.shop, shop));

	const widgetRow = await db
		.select({ id: widgetSettings.id })
		.from(widgetSettings)
		.where(eq(widgetSettings.shop, shop))
		.limit(1);

	const settings = await getSettings(shop);

	// --- Collection cohort (range-filtered) ---
	const reqWhere = since
		? and(eq(reviewRequests.shop, shop), gte(reviewRequests.createdAt, since))
		: eq(reviewRequests.shop, shop);
	const reqs = await db
		.select({
			status: reviewRequests.status,
			rating: reviewRequests.rating,
			sentAt: reviewRequests.sentAt
		})
		.from(reviewRequests)
		.where(reqWhere);

	let sent = 0;
	let responded = 0;
	let toGoogle = 0;
	let toPrivate = 0;
	let ratingSum = 0;
	const dist = [0, 0, 0, 0, 0]; // index 0 => 1★ … index 4 => 5★

	for (const r of reqs) {
		if (r.sentAt) sent++;
		if (r.status === 'responded') {
			responded++;
			if (r.rating != null) {
				ratingSum += r.rating;
				if (r.rating >= 1 && r.rating <= 5) dist[r.rating - 1]++;
				if (r.rating >= settings.threshold) toGoogle++;
				else toPrivate++;
			}
		}
	}

	// --- Feedback ---
	const fbWhere = since
		? and(eq(feedbackSubmissions.shop, shop), gte(feedbackSubmissions.createdAt, since))
		: eq(feedbackSubmissions.shop, shop);
	const [fbCount] = await db
		.select({ count: sql<number>`count(*)` })
		.from(feedbackSubmissions)
		.where(fbWhere);
	const recent = await db
		.select({
			id: feedbackSubmissions.id,
			rating: feedbackSubmissions.rating,
			message: feedbackSubmissions.message,
			createdAt: feedbackSubmissions.createdAt
		})
		.from(feedbackSubmissions)
		.where(eq(feedbackSubmissions.shop, shop))
		.orderBy(desc(feedbackSubmissions.createdAt))
		.limit(3);

	// --- Recent reviews (most recent imported, cumulative) ---
	const recentReviews = await db
		.select({
			id: reviews.reviewId,
			name: reviews.name,
			stars: reviews.stars,
			text: reviews.text,
			date: reviews.publishedAtDate
		})
		.from(reviews)
		.where(eq(reviews.shop, shop))
		.orderBy(desc(reviews.publishedAtDate))
		.limit(5);

	// --- Reviews summary: new in last 7 days (by star) + growth from snapshots ---
	const since7 = new Date(Date.now() - 7 * 86400 * 1000);
	const newRows = await db
		.select({ stars: reviews.stars })
		.from(reviews)
		.where(and(eq(reviews.shop, shop), gte(reviews.publishedAtDate, since7)));
	const newDist = [0, 0, 0, 0, 0];
	for (const r of newRows) {
		const s = Math.round(r.stars ?? 0);
		if (s >= 1 && s <= 5) newDist[s - 1]++;
	}

	const since14 = new Date(Date.now() - 14 * 86400 * 1000).toISOString().slice(0, 10);
	const snaps = await db
		.select({ day: reviewSnapshots.day, total: reviewSnapshots.totalReviews })
		.from(reviewSnapshots)
		.where(and(eq(reviewSnapshots.shop, shop), gte(reviewSnapshots.day, since14)))
		.orderBy(reviewSnapshots.day);

	return {
		range,
		setup: {
			hasLocation: Number(loc?.count ?? 0) > 0,
			widgetConfigured: widgetRow.length > 0,
			collectionEnabled: settings.enabled
		},
		widget: {
			locationCount: Number(loc?.count ?? 0),
			reviewsImported: Number(rev?.count ?? 0),
			totalReviews: Number(loc?.totalReviews ?? 0),
			avgRating: loc?.avgScore ? Number(Number(loc.avgScore).toFixed(1)) : 0,
			lastRefresh: loc?.lastRefresh ? new Date(loc.lastRefresh).toISOString() : null
		},
		collection: {
			enabled: settings.enabled,
			threshold: settings.threshold,
			sent,
			responded,
			responseRate: sent ? Math.round((responded / sent) * 100) : 0,
			toGoogle,
			toPrivate,
			avgRating: responded ? Number((ratingSum / responded).toFixed(1)) : 0
		},
		ratingDistribution: [5, 4, 3, 2, 1].map((stars) => ({ stars, count: dist[stars - 1] })),
		feedback: {
			count: Number(fbCount?.count ?? 0),
			recent: recent.map((f) => ({
				id: f.id,
				rating: f.rating,
				message: f.message,
				createdAt: f.createdAt.toISOString()
			}))
		},
		recentReviews: recentReviews.map((r) => ({
			id: r.id,
			name: r.name,
			stars: r.stars,
			text: r.text,
			date: r.date ? r.date.toISOString() : null
		})),
		reviewsSummary: {
			newLast7Days: newRows.length,
			newByStar: [5, 4, 3, 2, 1].map((stars) => ({ stars, count: newDist[stars - 1] })),
			growth: snaps.map((s) => ({ day: s.day, total: Number(s.total) }))
		}
	};
}
