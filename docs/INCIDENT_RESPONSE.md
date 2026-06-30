# Security Incident Response Policy

**App:** Order Reviews & Google Ratings (DragonApps)
**Owner / incident lead:** [NAME], [EMAIL]
**Last reviewed:** 2026-06-30 · **Review cadence:** at least annually

This is the internal procedure for handling a security incident or personal-data
breach affecting the app, its database, or its third-party credentials. It exists
so we can respond quickly and meet our notification obligations.

## 1. Scope & definitions

A **security incident** is any event that compromises the confidentiality,
integrity, or availability of the app or the data it processes. A **personal-data
breach** is an incident affecting customer or merchant personal data. Examples:

- Unauthorized access to the PostgreSQL database or to merchant/customer data.
- Leak or exposure of credentials: `SHOPIFY_API_SECRET`, the Shopify API
  client secret, `DATABASE_URL`, AWS SES keys, `APIFY_API_TOKEN`,
  `GOOGLE_PLACES_API_KEY`, or `FEEDBACK_TOKEN_SECRET`.
- Compromise of the web or worker host, or of a maintainer account with deploy
  access.
- Unintended disclosure of customer PII (name, email, order id) or private
  feedback.
- Loss or corruption of the database.

## 2. Roles

- **Incident lead** — coordinates response, decisions, and communications:
  [NAME], [EMAIL].
- **Backup contact** — [NAME], [EMAIL].
- The incident lead may delegate specific tasks (containment, comms) but remains
  accountable for the timeline and notifications.

## 3. Detection & reporting

Incidents may surface via host/platform alerts (Railway), application and error
logs, AWS/Apify/Google usage anomalies, or a report from a merchant, customer,
or Shopify. Anyone who suspects an incident reports it **immediately** to the
incident lead at [EMAIL]. Err on the side of reporting.

## 4. Response steps

1. **Contain.** Rotate any exposed secrets immediately (Shopify API secret, DB
   credentials, AWS SES keys, Apify token, Google Places key,
   `FEEDBACK_TOKEN_SECRET`). Revoke active sessions / offline tokens as needed.
   Restrict access to the affected system; take it offline if required.
2. **Assess.** Determine what happened, which systems and credentials are
   involved, and the scope of affected data, merchants, and customers.
3. **Eradicate & recover.** Remove the cause (patch, revoke, redeploy), restore
   from known-good backups if data was lost or tampered with, and verify
   integrity before returning to normal operation.
4. **Document.** Keep a running timeline: when detected, actions taken, data
   involved, and decisions made.

## 5. Notification

- **Affected merchants** — notify without undue delay once scope is understood,
  describing what happened, what data was involved, and what they should do.
- **Shopify** — notify Shopify Partner support of any breach involving Shopify
  merchant or customer data, per the Partner Program Agreement / API Terms.
- **Data-protection authorities & data subjects** — where legally required
  (e.g. GDPR), notify the relevant authority within **72 hours** of becoming
  aware of a personal-data breach, and affected individuals where the risk
  warrants it.

**Template (merchant/customer notice):**

> We're writing to inform you of a security incident that may have affected
> [data] on [date]. We discovered it on [date] and have since [actions taken].
> [What you should do]. We sincerely apologize. Contact us at [EMAIL] with any
> questions.

## 6. Post-incident review

Within a reasonable period after resolution, the incident lead conducts a
root-cause review and records remediation actions (process or code changes) to
prevent recurrence. Findings feed the next annual review of this policy.
