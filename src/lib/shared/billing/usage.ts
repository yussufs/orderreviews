/**
 * Plan + usage helpers backing the free-tier caps. Framework-agnostic — imported
 * by the worker (queue handlers) and the SvelteKit app (proxy, API). NO $lib/* or
 * $env/* imports; callers pass in their own `Database` instance so we reuse the
 * existing connection pool (worker: `getWorkerDb()`, web: `$lib/server/db`).
 */
import { eq, and, sql } from 'drizzle-orm';
import { shopPreferences, shopUsage, type Database, type ShopPlan } from '../db';

/** Current calendar period as 'YYYY-MM' (UTC). */
export function currentPeriod(now = new Date()): string {
	const y = now.getUTCFullYear();
	const m = String(now.getUTCMonth() + 1).padStart(2, '0');
	return `${y}-${m}`;
}

/** Resolve a shop's pricing tier; defaults to 'free' when no preferences row exists. */
export async function getShopPlan(db: Database, shop: string): Promise<ShopPlan> {
	const row = await db.query.shopPreferences.findFirst({
		where: eq(shopPreferences.shop, shop),
		columns: { plan: true }
	});
	return row?.plan ?? 'free';
}

export interface ShopUsage {
	emailsSent: number;
	overLimitNotifiedAt: Date | null;
}

/** Read a shop's usage counters for a period (zeroed when no row exists). */
export async function getUsage(db: Database, shop: string, period: string): Promise<ShopUsage> {
	const row = await db.query.shopUsage.findFirst({
		where: and(eq(shopUsage.shop, shop), eq(shopUsage.period, period))
	});
	return {
		emailsSent: row?.emailsSent ?? 0,
		overLimitNotifiedAt: row?.overLimitNotifiedAt ?? null
	};
}

/** Atomically increment the period's sent-email counter; returns the new total. */
export async function incrementEmailsSent(
	db: Database,
	shop: string,
	period: string
): Promise<number> {
	const [row] = await db
		.insert(shopUsage)
		.values({ shop, period, emailsSent: 1 })
		.onConflictDoUpdate({
			target: [shopUsage.shop, shopUsage.period],
			set: { emailsSent: sql`${shopUsage.emailsSent} + 1`, updatedAt: new Date() }
		})
		.returning({ emailsSent: shopUsage.emailsSent });
	return row?.emailsSent ?? 0;
}

/** Flag that the over-limit merchant email was sent for this period (idempotent). */
export async function markOverLimitNotified(
	db: Database,
	shop: string,
	period: string
): Promise<void> {
	const now = new Date();
	await db
		.insert(shopUsage)
		.values({ shop, period, overLimitNotifiedAt: now })
		.onConflictDoUpdate({
			target: [shopUsage.shop, shopUsage.period],
			set: { overLimitNotifiedAt: now, updatedAt: now }
		});
}
