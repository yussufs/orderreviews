# TODO

Follow-ups from the Shopify Protected Customer Data data-protection questionnaire.
None of these are implemented yet.

## 1. Skip non-consented customers in the order webhook

**File:** `src/lib/server/webhooks/order-trigger.ts`

Check the order/customer marketing-consent state (e.g. `buyer_accepts_marketing` /
the customer's email marketing consent in the order payload) and **skip creating a
review request** when the customer hasn't accepted marketing.

Needed to truthfully answer **"respect customers' consent decisions = Yes"** on the
questionnaire.

## 2. Add a retention purge to the daily cron

**File:** the `daily-refresh` cron handler (`src/lib/server/queue/handlers/dailyRefresh.ts`)
or a new scheduled job.

Purge old PII after a retention window — e.g. delete `review_requests` (and, via
cascade, `feedback_submissions`) that are `responded`/`cancelled`/`failed` and older
than ~90 days. PII is already deleted on `customers/redact` / `shop/redact`; this adds
time-based retention.

Lets us answer **"retention periods = Yes"**. Also state the retention period in the
privacy policy.

## 3. Write a proper privacy policy

Publish at a public URL; reference it in the Shopify app listing + questionnaire.

Suggested contents:

- **Who we are:** app name (Order Reviews & Google Ratings), legal entity, contact email.
- **What personal data we process:** customer first/last name + email address, and order
  id — obtained via Shopify `orders/paid` & `orders/fulfilled` webhooks. Note: the Google
  Reviews widget uses publicly available Google review data, not Shopify customer data.
- **Why (purpose & legal basis):** to send post-purchase review-request and follow-up
  emails on behalf of the merchant; legal basis = legitimate interest / merchant
  instruction, subject to customer marketing consent.
- **Sub-processors:** AWS SES (email delivery), Apify (Google reviews import — no customer
  PII), the hosting/Postgres provider. List each.
- **Retention:** state the period (align with #2, e.g. deleted after 90 days, and on app
  uninstall / GDPR redaction).
- **Data subject rights:** access, deletion, opt-out; how to exercise (email + that we
  honor Shopify `customers/redact`, `customers/data_request`, `shop/redact` webhooks).
- **Security:** encryption in transit/at rest, access controls.
- International transfers, cookies (embedded admin uses none), how we notify of changes.
- **Effective date.**

Keep it accurate — don't claim data we don't collect (no phone, no address).

## 4. Write a security incident response policy

Short (1–2 page) internal doc so we can answer **"security incident response policy = Yes"**.

Suggested contents:

- **Scope & definitions:** what counts as a security incident / personal-data breach
  (unauthorized access, leak, loss of the Postgres DB or AWS/Apify credentials, etc.).
- **Roles:** incident lead / contact (name + email).
- **Detection & reporting:** how incidents are detected (host alerts, logs, error
  monitoring) and the internal channel to report them.
- **Response steps:** (1) contain — rotate leaked `SHOPIFY_API_SECRET` / DB / AWS / Apify
  creds, revoke sessions; (2) assess scope & affected data/merchants; (3) eradicate &
  recover from backups; (4) document the timeline.
- **Notification:** notify affected merchants and, where required, Shopify and
  data-protection authorities within **72 hours** of becoming aware (GDPR). Include
  template wording.
- **Post-incident:** root-cause review and remediation actions.
- **Review cadence:** re-review at least annually.
