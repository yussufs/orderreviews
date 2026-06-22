/**
 * Database schema for the Order Reviews Shopify app
 * Uses Drizzle ORM with PostgreSQL
 *
 * Run `pnpm run db:generate` to create a migration, then `pnpm run db:migrate`.
 * Run `pnpm run db:studio` to browse data.
 *
 * NOTE: This module is framework-agnostic — NO $lib/* or $env/* imports.
 * It is imported by both SvelteKit ($lib/server/db) and the standalone worker.
 *
 * pg-boss manages its OWN `pgboss.*` schema at runtime (boss.start()). Do NOT
 * model pg-boss tables here — Drizzle owns `public.*`, pg-boss owns `pgboss.*`.
 */
import {
	pgTable,
	text,
	boolean,
	timestamp,
	real,
	integer,
	jsonb,
	index,
	unique
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// =============================================================================
// SESSION TABLE (Shopify OAuth)
// =============================================================================

/**
 * Session table for Shopify OAuth session storage
 * Stores both online (user-specific) and offline (store-wide) sessions
 */
export const session = pgTable('session', {
	// Primary key - session ID format: "offline_{shop}" or "online_{shop}_{userId}"
	id: text('id').primaryKey(),

	// Shop domain, e.g., "example.myshopify.com"
	shop: text('shop').notNull(),

	// OAuth state parameter for CSRF protection
	state: text('state').notNull(),

	// Whether this is an online (user-specific) or offline (store-wide) session
	isOnline: boolean('is_online').default(false).notNull(),

	// Comma-separated list of granted scopes
	scope: text('scope'),

	// When the access token expires (for online sessions)
	expires: timestamp('expires', { mode: 'date' }),

	// The OAuth access token
	accessToken: text('access_token').notNull(),

	// Online session user info (from OnlineAccessInfo)
	userId: text('user_id'),
	firstName: text('first_name'),
	lastName: text('last_name'),
	email: text('email'),
	accountOwner: boolean('account_owner').default(false),
	locale: text('locale'),
	collaborator: boolean('collaborator').default(false),
	emailVerified: boolean('email_verified').default(false),

	// Refresh token support (for expiring offline access tokens)
	refreshToken: text('refresh_token'),
	refreshTokenExpires: timestamp('refresh_token_expires', { mode: 'date' })
});

// =============================================================================
// SHOP PREFERENCES TABLE
// =============================================================================

/**
 * Shop preferences - store-specific settings beyond OAuth session.
 * `email` is the merchant contact used for low-rating feedback notifications.
 */
export const shopPreferences = pgTable('shop_preferences', {
	// Shop domain as primary key
	shop: text('shop').primaryKey(),

	// Store owner email
	email: text('email'),

	// Shopify App Installation GID (e.g., "gid://shopify/AppInstallation/833491665210")
	appGid: text('app_gid'),

	createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
	updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull()
});

// =============================================================================
// LOCATIONS TABLE (Google Places)
// =============================================================================

/**
 * Review filter options stored per location
 */
export interface ReviewFilters {
	sortBy: 'most_recent' | 'highest_rating' | 'lowest_rating';
	reviewFilter: 'all' | '5_only' | '4_and_up' | '3_and_up';
	filterKeywords: string[];
}

/**
 * Locations - Google Places locations linked to shops
 */
export const locations = pgTable(
	'locations',
	{
		// Google Place ID as primary key
		placeId: text('place_id').primaryKey(),

		// Shop domain (owner)
		shop: text('shop').notNull(),

		// Location details
		title: text('title').notNull(),
		address: text('address'),
		phone: text('phone'),
		website: text('website'),

		// Google rating data
		totalScore: real('total_score').default(0),
		reviewsCount: integer('reviews_count').default(0),

		// Location image URL (from Apify / Places photos)
		imageUrl: text('image_url'),

		// Review filter settings
		reviewFilters: jsonb('review_filters').$type<ReviewFilters>().default({
			sortBy: 'most_recent',
			reviewFilter: 'all',
			filterKeywords: []
		}),

		// Last time reviews were fetched (for incremental updates)
		lastReviewFetchAt: timestamp('last_review_fetch_at', { mode: 'date' }),

		// Last time a manual refresh was triggered (for rate limiting)
		lastManualRefreshAt: timestamp('last_manual_refresh_at', { mode: 'date' }),

		createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull()
	},
	(table) => [index('locations_shop_idx').on(table.shop)]
);

// =============================================================================
// REVIEWS TABLE
// =============================================================================

/**
 * Reviews - individual Google reviews for locations
 */
export const reviews = pgTable(
	'reviews',
	{
		// Google Review ID as primary key
		reviewId: text('review_id').primaryKey(),

		// Shop domain (owner)
		shop: text('shop').notNull(),

		// Location this review belongs to
		placeId: text('place_id')
			.notNull()
			.references(() => locations.placeId, { onDelete: 'cascade' }),

		// Review content
		text: text('text'),
		name: text('name'),
		stars: real('stars').default(0),
		publishedAtDate: timestamp('published_at_date', { mode: 'date' }),
		reviewerPhotoUrl: text('reviewer_photo_url'),
		reviewImageUrls: jsonb('review_image_urls').$type<string[]>().default([]),

		// Display overrides
		hidden: boolean('hidden').default(false), // Manually hidden by merchant
		filtered: boolean('filtered').default(false), // Filtered out by current filters
		displayOrder: integer('display_order').default(0), // Manual ordering

		createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull()
	},
	(table) => [
		index('reviews_shop_idx').on(table.shop),
		index('reviews_place_id_idx').on(table.placeId),
		index('reviews_published_at_idx').on(table.publishedAtDate)
	]
);

// =============================================================================
// WIDGET SETTINGS TABLE
// =============================================================================

/**
 * Widget style options (v1 ships grid + carousel; the rest are reserved).
 */
export type WidgetStyle = 'order_reviews_grid' | 'order_reviews_carousel';

/**
 * Widget settings - configuration for each widget type per shop
 */
export const widgetSettings = pgTable(
	'widget_settings',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),

		// Shop domain
		shop: text('shop').notNull(),

		// Widget style identifier
		widgetStyle: text('widget_style').$type<WidgetStyle>().notNull(),

		// HTML tag for the widget (e.g., "order-reviews-grid")
		widgetHtmlTag: text('widget_html_tag').notNull(),

		// Which imported location this widget shows (null = first location for the shop)
		locationPlaceId: text('location_place_id'),

		// JSON display settings overrides
		displaySettings: jsonb('display_settings').$type<Record<string, unknown>>().default({}),

		// Custom CSS overrides
		customCss: text('custom_css').default(''),

		createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull()
	},
	(table) => [index('widget_settings_shop_idx').on(table.shop)]
);

// =============================================================================
// REVIEW COLLECTION SETTINGS TABLE (Feature 2 config, per shop)
// =============================================================================

export type ReviewTrigger = 'orders/paid' | 'orders/fulfilled';
export type RatingType = 'stars' | 'thumbs';

/**
 * Per-shop configuration for the post-order review collection flow.
 */
export const reviewCollectionSettings = pgTable('review_collection_settings', {
	// Shop domain as primary key
	shop: text('shop').primaryKey(),

	// Master on/off switch
	enabled: boolean('enabled').default(false).notNull(),

	// Which order event triggers the feedback email
	trigger: text('trigger').$type<ReviewTrigger>().default('orders/fulfilled').notNull(),

	// Days to wait after the trigger before sending the first email
	delayDays: integer('delay_days').default(5).notNull(),

	// Whether the email asks for stars (1-5) or thumbs (up/down)
	ratingType: text('rating_type').$type<RatingType>().default('stars').notNull(),

	// Rating >= threshold routes to Google review; below routes to private feedback.
	// For thumbs: down is encoded as 1, up as 5 (so threshold 4 = "up goes to Google").
	threshold: integer('threshold').default(4).notNull(),

	// Which location's writereview link to use (null = first location for the shop)
	placeId: text('place_id'),

	// Follow-up reminder configuration
	followupEnabled: boolean('followup_enabled').default(true).notNull(),
	followupDelayDays: integer('followup_delay_days').default(3).notNull(),
	maxFollowups: integer('max_followups').default(1).notNull(),

	// Notify the merchant when a customer leaves low-rating private feedback
	notifyMerchantOnLowRating: boolean('notify_merchant_on_low_rating').default(true).notNull(),
	// Override recipient; falls back to shopPreferences.email
	merchantEmail: text('merchant_email'),

	// Email presentation
	fromName: text('from_name'),
	subject: text('subject'),

	createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
	updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull()
});

// =============================================================================
// REVIEW REQUESTS TABLE (one row per triggered order — PII-bearing)
// =============================================================================

export type ReviewRequestStatus = 'scheduled' | 'sent' | 'responded' | 'cancelled' | 'failed';

/**
 * Review requests - one per order that triggered the collection flow.
 * Holds customer PII; deleted on customers/redact + shop/redact.
 */
export const reviewRequests = pgTable(
	'review_requests',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),

		shop: text('shop').notNull(),

		// Shopify order id (numeric or GID, stored as text)
		orderId: text('order_id').notNull(),

		// Customer PII
		customerEmail: text('customer_email').notNull(),
		customerName: text('customer_name'),

		status: text('status').$type<ReviewRequestStatus>().default('scheduled').notNull(),

		// Rating the customer gave once they respond (1-5)
		rating: integer('rating'),

		// pg-boss job id for the initial feedback email (for cancellation)
		sendJobId: text('send_job_id'),
		// pg-boss job ids for scheduled follow-ups (cancelled on response)
		followupJobIds: jsonb('followup_job_ids').$type<string[]>().default([]),
		followupsSent: integer('followups_sent').default(0).notNull(),

		scheduledFor: timestamp('scheduled_for', { mode: 'date' }),
		sentAt: timestamp('sent_at', { mode: 'date' }),
		respondedAt: timestamp('responded_at', { mode: 'date' }),

		createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull()
	},
	(table) => [
		index('review_requests_shop_idx').on(table.shop),
		// Idempotency: at most one request per order per shop (duplicate webhooks no-op)
		unique('review_requests_shop_order_uq').on(table.shop, table.orderId),
		index('review_requests_status_idx').on(table.status)
	]
);

// =============================================================================
// FEEDBACK SUBMISSIONS TABLE (private below-threshold feedback)
// =============================================================================

export const feedbackSubmissions = pgTable(
	'feedback_submissions',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),

		shop: text('shop').notNull(),

		reviewRequestId: text('review_request_id')
			.notNull()
			.references(() => reviewRequests.id, { onDelete: 'cascade' }),

		rating: integer('rating').notNull(),
		message: text('message'),

		// Denormalized for the merchant inbox (PII)
		customerEmail: text('customer_email'),

		emailedMerchant: boolean('emailed_merchant').default(false).notNull(),

		createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull()
	},
	(table) => [index('feedback_submissions_shop_idx').on(table.shop)]
);

// =============================================================================
// JOB STATUS TABLE (lightweight UI progress — replaces source `tasks`)
// =============================================================================

export type JobStatusState = 'pending' | 'processing' | 'completed' | 'failed';
export type JobStatusType = 'fetch_reviews';

/**
 * Job status - merchant-visible progress for review-import jobs.
 * pg-boss owns scheduling/retries; this is purely for surfacing progress in the UI.
 */
export const jobStatus = pgTable(
	'job_status',
	{
		// Matches the pg-boss job id (generated app-side and passed to boss.send)
		id: text('id').primaryKey(),

		shop: text('shop').notNull(),

		type: text('type').$type<JobStatusType>().notNull(),
		status: text('status').$type<JobStatusState>().default('pending').notNull(),

		// Progress (0-100)
		progress: integer('progress').default(0).notNull(),

		// Associated entity (placeId for review fetching)
		entityId: text('entity_id'),

		result: jsonb('result').$type<Record<string, unknown>>(),
		error: text('error'),

		createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
		completedAt: timestamp('completed_at', { mode: 'date' })
	},
	(table) => [
		index('job_status_shop_idx').on(table.shop),
		index('job_status_status_idx').on(table.status)
	]
);

// =============================================================================
// RELATIONS
// =============================================================================

export const locationsRelations = relations(locations, ({ many }) => ({
	reviews: many(reviews)
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
	location: one(locations, {
		fields: [reviews.placeId],
		references: [locations.placeId]
	})
}));

export const reviewRequestsRelations = relations(reviewRequests, ({ many }) => ({
	feedback: many(feedbackSubmissions)
}));

export const feedbackSubmissionsRelations = relations(feedbackSubmissions, ({ one }) => ({
	reviewRequest: one(reviewRequests, {
		fields: [feedbackSubmissions.reviewRequestId],
		references: [reviewRequests.id]
	})
}));
