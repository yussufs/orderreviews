/**
 * Signed feedback tokens for the public review-collection landing page.
 *
 * No cookies (reviewer-test rule): the rating + review-request id travel in a
 * signed, expiring URL token. HMAC-SHA256 over a base64url JSON payload, using
 * the same crypto idiom as `shopify/webhooks.ts`.
 *
 * Framework-agnostic (no `$lib`/`$env`): used by the worker (to build email
 * links) and by SvelteKit (to verify them).
 */
import { createHmac, timingSafeEqual } from 'crypto';

export interface FeedbackTokenPayload {
	/** reviewRequests.id */
	rid: string;
	/** rating 1–5 (thumbs: down=1, up=5) */
	r: number;
	/** expiry, epoch seconds */
	exp: number;
}

/** Default token lifetime: 30 days. */
const DEFAULT_TTL_SECONDS = 30 * 24 * 60 * 60;

function secret(): string {
	const s = process.env.FEEDBACK_TOKEN_SECRET || process.env.SHOPIFY_API_SECRET;
	if (!s) throw new Error('FEEDBACK_TOKEN_SECRET or SHOPIFY_API_SECRET must be set');
	return s;
}

function b64url(input: Buffer | string): string {
	return Buffer.from(input).toString('base64url');
}

function sign(body: string): string {
	return createHmac('sha256', secret()).update(body).digest('base64url');
}

/** Build a signed token for a given review request + rating. */
export function signFeedbackToken(
	rid: string,
	rating: number,
	nowSeconds: number,
	ttlSeconds = DEFAULT_TTL_SECONDS
): string {
	const payload: FeedbackTokenPayload = { rid, r: rating, exp: nowSeconds + ttlSeconds };
	const body = b64url(JSON.stringify(payload));
	return `${body}.${sign(body)}`;
}

/** Verify a token; returns the payload or null if invalid/expired. */
export function verifyFeedbackToken(
	token: string,
	nowSeconds: number
): FeedbackTokenPayload | null {
	const dot = token.lastIndexOf('.');
	if (dot <= 0) return null;

	const body = token.slice(0, dot);
	const sig = token.slice(dot + 1);

	const expected = sign(body);
	const sigBuf = Buffer.from(sig);
	const expBuf = Buffer.from(expected);
	if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return null;

	try {
		const payload = JSON.parse(
			Buffer.from(body, 'base64url').toString('utf8')
		) as FeedbackTokenPayload;
		if (typeof payload.exp !== 'number' || payload.exp < nowSeconds) return null;
		if (!payload.rid || typeof payload.r !== 'number') return null;
		return payload;
	} catch {
		return null;
	}
}
