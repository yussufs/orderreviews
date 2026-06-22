/**
 * Widget settings service — one widget configuration row per shop (v1).
 * SvelteKit-side (uses `$lib/server/db`).
 */
import { db } from '$lib/server/db';
import { widgetSettings, type WidgetStyle } from '$lib/shared/db';
import { eq } from 'drizzle-orm';

export type WidgetSettingsRow = typeof widgetSettings.$inferSelect;

export interface WidgetSettingsInput {
	widgetStyle: WidgetStyle;
	locationPlaceId?: string | null;
	displaySettings?: Record<string, unknown>;
	customCss?: string;
}

const HTML_TAG: Record<WidgetStyle, string> = {
	order_reviews_grid: 'order-reviews-grid',
	order_reviews_carousel: 'order-reviews-carousel'
};

/** Get the shop's widget settings, or null if not configured yet. */
export async function getWidgetSettings(shop: string): Promise<WidgetSettingsRow | null> {
	const rows = await db.select().from(widgetSettings).where(eq(widgetSettings.shop, shop)).limit(1);
	return rows[0] || null;
}

/** Insert or update the shop's widget settings. */
export async function saveWidgetSettings(
	shop: string,
	input: WidgetSettingsInput
): Promise<WidgetSettingsRow> {
	const now = new Date();
	const existing = await getWidgetSettings(shop);

	const values = {
		shop,
		widgetStyle: input.widgetStyle,
		widgetHtmlTag: HTML_TAG[input.widgetStyle],
		locationPlaceId: input.locationPlaceId ?? null,
		displaySettings: input.displaySettings ?? {},
		customCss: input.customCss ?? '',
		updatedAt: now
	};

	if (existing) {
		const result = await db
			.update(widgetSettings)
			.set(values)
			.where(eq(widgetSettings.id, existing.id))
			.returning();
		return result[0];
	}

	const result = await db
		.insert(widgetSettings)
		.values({ ...values, createdAt: now })
		.returning();
	return result[0];
}
