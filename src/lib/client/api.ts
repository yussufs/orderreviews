/**
 * Client-side helper for calling the merchant API with an App Bridge session
 * token (never a cookie). JSON bodies are stringified + content-typed for you.
 */
export async function apiFetch<T = unknown>(
	path: string,
	options: { method?: string; body?: unknown; signal?: AbortSignal } = {}
): Promise<T> {
	if (!window.shopify) throw new Error('Shopify App Bridge not loaded');
	const token = await window.shopify.idToken();

	const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
	let body: string | undefined;
	if (options.body !== undefined) {
		headers['Content-Type'] = 'application/json';
		body = JSON.stringify(options.body);
	}

	const res = await fetch(path, {
		method: options.method ?? 'GET',
		headers,
		body,
		signal: options.signal
	});
	const data = (await res.json().catch(() => ({}))) as T & { error?: string };
	if (!res.ok) {
		throw new Error((data as { error?: string })?.error || `Request failed (${res.status})`);
	}
	return data;
}
