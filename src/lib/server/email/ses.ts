/**
 * AWS SES email sending. Framework-agnostic (no `$lib`/`$env`): used by the
 * worker (feedback + follow-up emails) and by SvelteKit (merchant notification).
 *
 * Set EMAIL_DRYRUN=true in dev to log emails to the console instead of sending.
 */
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

export interface SendEmailInput {
	to: string;
	subject: string;
	html: string;
	text?: string;
	/** Optional display name for the From header. */
	fromName?: string;
	replyTo?: string;
}

export interface SendEmailResult {
	success: boolean;
	error?: string;
	dryRun?: boolean;
}

let _client: SESClient | null = null;
function client(): SESClient {
	if (!_client) {
		_client = new SESClient({
			region: process.env.AWS_SES_REGION || 'us-east-1',
			credentials: {
				accessKeyId: process.env.AWS_SES_ACCESS_KEY_ID || '',
				secretAccessKey: process.env.AWS_SES_SECRET_ACCESS_KEY || ''
			}
		});
	}
	return _client;
}

function formatFrom(email: string, name?: string): string {
	return name ? `${name} <${email}>` : email;
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
	const fromEmail = process.env.AWS_SES_FROM_EMAIL;

	if (process.env.EMAIL_DRYRUN === 'true') {
		console.log('[email:dryrun] to=%s subject=%s', input.to, input.subject);
		console.log('[email:dryrun] html:\n%s', input.html);
		return { success: true, dryRun: true };
	}

	if (!fromEmail || !process.env.AWS_SES_ACCESS_KEY_ID || !process.env.AWS_SES_SECRET_ACCESS_KEY) {
		console.error(
			'[email] AWS SES is not configured (set AWS_SES_* env vars or EMAIL_DRYRUN=true)'
		);
		return { success: false, error: 'Email service not configured' };
	}

	try {
		await client().send(
			new SendEmailCommand({
				Source: formatFrom(fromEmail, input.fromName),
				Destination: { ToAddresses: [input.to] },
				ReplyToAddresses: input.replyTo ? [input.replyTo] : undefined,
				Message: {
					Subject: { Data: input.subject, Charset: 'UTF-8' },
					Body: {
						Html: { Data: input.html, Charset: 'UTF-8' },
						...(input.text ? { Text: { Data: input.text, Charset: 'UTF-8' } } : {})
					}
				}
			})
		);
		return { success: true };
	} catch (error) {
		console.error('[email] SES send failed:', error);
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Failed to send email'
		};
	}
}
