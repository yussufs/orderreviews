# TODO

Follow-ups from the Shopify Protected Customer Data data-protection questionnaire.
**All four are now complete.**

## 1. Skip non-consented customers in the order webhook ✅ DONE

**File:** `src/lib/server/webhooks/order-trigger.ts`

`customerConsented()` checks the customer's marketing-consent state
(`customer.email_marketing_consent.state === 'subscribed'`, falling back to the
legacy `buyer_accepts_marketing` flag) and **skips creating a review request**
when the customer hasn't opted in.

Supports answering **"respect customers' consent decisions = Yes"**.

## 2. Add a retention purge to the daily cron ✅ DONE

**File:** `src/lib/server/queue/handlers/dailyRefresh.ts`

`purgeExpiredPii()` runs in the `daily-refresh` cron and hard-deletes
`review_requests` older than `RETENTION_DAYS` (90) — cascading to their linked
`feedback_submissions` — plus standalone link/QR `feedback_submissions` older
than the same window. PII is also deleted on `customers/redact` / `shop/redact`.

Supports answering **"retention periods = Yes"**. The 90-day window is stated in
the privacy policy (#3).

## 3. Privacy policy ✅ DONE

Published at: https://dragonapps.io/order-reviews-privacy-policy/
Reference this URL in the Shopify app listing + Protected Customer Data
questionnaire. Keep the stated retention period aligned with #2 (90 days).

## 4. Security incident response policy ✅ DONE

**File:** `docs/INCIDENT_RESPONSE.md`

Internal 1–2 page policy: scope/definitions, roles, detection & reporting,
response steps (contain → assess → eradicate/recover → document), notification
(merchants, Shopify, 72-hour GDPR), and post-incident review.

**Action:** fill in the `[NAME]` / `[EMAIL]` placeholders (incident lead +
backup contact) before relying on it.
