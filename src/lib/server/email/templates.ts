/**
 * HTML email templates for the post-order review collection flow.
 * Pure functions (no env/db). Inline styles only — email clients ignore <style>.
 *
 * Ratings are NOT interactive inputs (unreliable in email). Each star/thumb is a
 * plain <a> link to the public landing page carrying a signed rating token.
 */

export interface RatingLink {
	value: number;
	url: string;
}

export interface FeedbackEmailParams {
	storeName: string;
	customerName?: string | null;
	ratingType: 'stars' | 'thumbs';
	/** One link per selectable rating (stars: 1–5; thumbs: down=1, up=5). */
	ratingLinks: RatingLink[];
	/** When true, use reminder copy. */
	isFollowup?: boolean;
	fromName?: string;
}

export interface MerchantNotifyParams {
	storeName: string;
	rating: number;
	message?: string | null;
	customerEmail?: string | null;
	orderId?: string | null;
}

export function escapeHtml(text: string): string {
	const map: Record<string, string> = {
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;',
		'"': '&quot;',
		"'": '&#039;'
	};
	return text.replace(/[&<>"']/g, (char) => map[char]);
}

function layout(
	bodyInner: string,
	footer = "You're receiving this because you placed an order. This is a one-off request."
): string {
	return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f5f7;">
	<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1a1a;line-height:1.6;max-width:560px;margin:0 auto;padding:24px;">
		<div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:32px;text-align:center;">
			${bodyInner}
		</div>
		<p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:16px;">
			${footer}
		</p>
	</div>
</body>
</html>`;
}

function starsRow(links: RatingLink[]): string {
	// 1..5 ascending stars, each a separate link.
	const sorted = [...links].sort((a, b) => a.value - b.value);
	const stars = sorted
		.map(
			(l) =>
				`<a href="${l.url}" style="text-decoration:none;font-size:40px;line-height:1;color:#fbbc04;margin:0 4px;" title="${l.value} star${l.value === 1 ? '' : 's'}">&#9733;</a>`
		)
		.join('');
	return `<div style="margin:24px 0;">${stars}</div>`;
}

function thumbsRow(links: RatingLink[]): string {
	const up = links.find((l) => l.value >= 4);
	const down = links.find((l) => l.value < 4);
	const btn = (url: string, label: string, bg: string) =>
		`<a href="${url}" style="display:inline-block;text-decoration:none;background:${bg};color:#fff;font-weight:600;font-size:16px;padding:14px 28px;border-radius:8px;margin:0 8px;">${label}</a>`;
	return `<div style="margin:24px 0;">
		${up ? btn(up.url, '👍 Good', '#16a34a') : ''}
		${down ? btn(down.url, '👎 Not great', '#dc2626') : ''}
	</div>`;
}

/** The post-order feedback request (and follow-up reminder) email. */
export function feedbackRequestEmail(params: FeedbackEmailParams): {
	subject: string;
	html: string;
} {
	const store = escapeHtml(params.storeName);
	const greeting = params.customerName ? `Hi ${escapeHtml(params.customerName)},` : 'Hi there,';
	const heading = params.isFollowup
		? `How was your experience with ${store}?`
		: `Thanks for your order from ${store}!`;
	const ask = params.isFollowup
		? `We'd still love to hear from you — it only takes a moment.`
		: `We'd love to hear how it went. ${params.ratingType === 'stars' ? 'Tap a star' : 'Pick one'} below.`;

	const ratingsRow =
		params.ratingType === 'stars' ? starsRow(params.ratingLinks) : thumbsRow(params.ratingLinks);

	const html = layout(`
		<h1 style="font-size:22px;margin:0 0 12px;">${heading}</h1>
		<p style="margin:0 0 4px;text-align:left;">${greeting}</p>
		<p style="margin:0 0 8px;text-align:left;">${ask}</p>
		${ratingsRow}
	`);

	const subject = params.isFollowup
		? `A quick favour — how was ${params.storeName}?`
		: `How was your order from ${params.storeName}?`;

	return { subject, html };
}

/** Notification to the merchant when a customer leaves low-rating private feedback. */
export function merchantNotifyEmail(params: MerchantNotifyParams): {
	subject: string;
	html: string;
} {
	const store = escapeHtml(params.storeName);
	const html = layout(`
		<h1 style="font-size:20px;margin:0 0 16px;">New customer feedback</h1>
		<div style="text-align:left;">
			<p style="margin:0 0 8px;"><strong>Rating:</strong> ${params.rating} / 5</p>
			${params.orderId ? `<p style="margin:0 0 8px;"><strong>Order:</strong> ${escapeHtml(String(params.orderId))}</p>` : ''}
			${params.customerEmail ? `<p style="margin:0 0 8px;"><strong>Customer:</strong> <a href="mailto:${escapeHtml(params.customerEmail)}">${escapeHtml(params.customerEmail)}</a></p>` : ''}
			<p style="margin:16px 0 4px;"><strong>Message:</strong></p>
			<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;white-space:pre-wrap;">${params.message ? escapeHtml(params.message) : '(no message)'}</div>
		</div>
	`);
	return { subject: `New feedback for ${store} (${params.rating}/5)`, html };
}

export interface OverLimitEmailParams {
	storeName: string;
	/** The free monthly email cap that was reached. */
	cap: number;
	/** Managed Pricing plan-selection URL (opened in a normal browser tab from email). */
	upgradeUrl: string;
}

/**
 * Sent to the merchant once per month when their free post-order review request
 * emails run out. Account notification (not a customer order email), so it uses a
 * neutral footer instead of the "you placed an order" one.
 */
export function overLimitEmail(params: OverLimitEmailParams): { subject: string; html: string } {
	const store = escapeHtml(params.storeName);
	const html = layout(
		`
		<h1 style="font-size:20px;margin:0 0 16px;">You've reached your free review request limit</h1>
		<div style="text-align:left;">
			<p style="margin:0 0 12px;">Your store <strong>${store}</strong> has sent all ${params.cap} free post-order review request emails for this month, so new requests are paused until next month. Follow-up reminders for orders already in progress will still go out.</p>
			<p style="margin:0 0 16px;">Upgrade to Premium to send unlimited review requests and keep collecting reviews automatically.</p>
		</div>
		<a href="${params.upgradeUrl}" style="display:inline-block;text-decoration:none;background:#1a1a1a;color:#ffffff;font-weight:600;font-size:16px;padding:14px 28px;border-radius:8px;margin-top:8px;">Upgrade to Premium</a>
	`,
		`This is an account notification for ${store}.`
	);
	return { subject: `You've hit your free review email limit for ${store}`, html };
}

export interface ContactEmailParams {
	shop: string;
	name: string;
	email: string;
	subject: string;
	message: string;
}

/** Internal support email built from the in-app contact form. */
export function contactEmail(params: ContactEmailParams): { subject: string; html: string } {
	const html = layout(
		`
		<h1 style="font-size:20px;margin:0 0 16px;">New support request</h1>
		<div style="text-align:left;">
			<p style="margin:0 0 8px;"><strong>Shop:</strong> ${escapeHtml(params.shop)}</p>
			<p style="margin:0 0 8px;"><strong>Name:</strong> ${escapeHtml(params.name)}</p>
			<p style="margin:0 0 8px;"><strong>Email:</strong> <a href="mailto:${escapeHtml(params.email)}">${escapeHtml(params.email)}</a></p>
			<p style="margin:0 0 8px;"><strong>Topic:</strong> ${escapeHtml(params.subject)}</p>
			<p style="margin:16px 0 4px;"><strong>Message:</strong></p>
			<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;white-space:pre-wrap;">${escapeHtml(params.message)}</div>
		</div>
	`,
		'Sent from the Order Reviews app support form.'
	);
	return { subject: `Support: ${params.subject} — ${params.shop}`, html };
}
