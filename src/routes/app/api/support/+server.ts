import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';
import { authApi } from '$lib/server/api-auth';
import { contactEmail } from '$lib/server/email/templates';
import { sendEmail } from '$lib/server/email/ses';

function isValidEmail(email: string): boolean {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** POST /app/api/support — send a support request to the support inbox. */
export const POST: RequestHandler = async ({ request }) => {
	const auth = await authApi(request);
	if (auth instanceof Response) return auth;

	let body: { name?: string; email?: string; subject?: string; message?: string };
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const name = (body.name || '').trim();
	const email = (body.email || '').trim();
	const subject = (body.subject || '').trim();
	const message = (body.message || '').trim();

	if (!name) return json({ error: 'Please enter your name.' }, { status: 400 });
	if (!email) return json({ error: 'Please enter your email.' }, { status: 400 });
	if (!isValidEmail(email)) return json({ error: 'Please enter a valid email.' }, { status: 400 });
	if (!subject) return json({ error: 'Please choose a topic.' }, { status: 400 });
	if (!message) return json({ error: 'Please enter a message.' }, { status: 400 });

	const to = env.AWS_SES_TO_EMAIL || 'help@dragonapps.io';
	const { subject: emailSubject, html } = contactEmail({
		shop: auth.session.shop,
		name,
		email,
		subject,
		message
	});

	// Reply-To the merchant so support can respond directly.
	const result = await sendEmail({ to, subject: emailSubject, html, replyTo: email });
	if (!result.success) {
		return json({ error: result.error || 'Could not send your message.' }, { status: 502 });
	}
	return json({ ok: true, dryRun: result.dryRun });
};
