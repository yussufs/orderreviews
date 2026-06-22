/**
 * Shared helper for authenticating merchant API requests via App Bridge session
 * tokens. Returns the authenticated context, or an error Response to return.
 *
 * Usage:
 *   const auth = await authApi(request);
 *   if (auth instanceof Response) return auth;
 *   const { session, admin } = auth;
 */
import { json } from '@sveltejs/kit';
import { authenticateRequest, AuthError } from '$lib/server/shopify/auth';

export type AuthContext = Awaited<ReturnType<typeof authenticateRequest>>;

export async function authApi(request: Request): Promise<AuthContext | Response> {
	try {
		return await authenticateRequest(request);
	} catch (err) {
		const status = err instanceof AuthError ? 401 : 500;
		return json(
			{ error: 'Unauthorized' },
			{ status, headers: { 'X-Shopify-Retry-Invalid-Session-Request': '1' } }
		);
	}
}
