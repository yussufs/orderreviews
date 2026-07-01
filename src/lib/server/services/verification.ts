/**
 * Account-level ownership verification.
 *
 * A shop must prove it owns the Google Business it imported before its reviews
 * are shown on the storefront widget. State lives on `shopPreferences.locationVerified`
 * (account-level, not per-location) and is flipped manually by support today.
 *
 * The whole gate is controlled by the `REQUIRE_LOCATION_VERIFICATION` env flag:
 * it is ON by default (for App Store review). Set it to `false` after approval and
 * every shop is treated as verified everywhere — banners disappear and the
 * storefront widget shows all reviews — with no data migration.
 */
import { db } from '$lib/server/db';
import { shopPreferences } from '$lib/shared/db';
import { eq } from 'drizzle-orm';
import { env } from '$env/dynamic/private';

/** Whether the ownership-verification gate is active. Default ON. */
export function verificationRequired(): boolean {
	return env.REQUIRE_LOCATION_VERIFICATION !== 'false';
}

export interface AccountVerification {
	/** Whether the gate is active at all (mirrors the env flag). */
	required: boolean;
	/** Whether this shop is verified (always true when the gate is off). */
	verified: boolean;
	/** True only when the gate is on AND the shop is not yet verified. */
	needsVerification: boolean;
}

/** Resolve a shop's effective verification state (gate flag + stored flag). */
export async function getAccountVerification(shop: string): Promise<AccountVerification> {
	if (!verificationRequired()) {
		return { required: false, verified: true, needsVerification: false };
	}
	const prefs = await db.query.shopPreferences.findFirst({
		where: eq(shopPreferences.shop, shop),
		columns: { locationVerified: true }
	});
	const verified = prefs?.locationVerified ?? false;
	return { required: true, verified, needsVerification: !verified };
}
