/**
 * Deep links into the in-app support form (`/app/support`) with prefilled fields.
 * The support page reads `?subject=` and `?message=` query params on load.
 */

function supportUrl(subject: string, message: string): string {
	const params = new URLSearchParams({ subject, message });
	return `/app/support?${params.toString()}`;
}

/** Prefilled request for account/business ownership verification. */
export const VERIFY_ACCOUNT_SUPPORT_URL = supportUrl(
	'Location verification',
	'Please help me verify that I own this Google My Business account.'
);
