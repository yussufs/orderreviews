# Review Collection & Feedback

The "review collection" feature turns customers into reviews after they order,
and routes unhappy customers to a **private feedback** form instead of a public
review. There are three customer entry points — post-order email, a shared
link, and a QR code — and they all open the **same hosted rating form** on the
merchant's storefront.

## The core idea (rating → branch)

```
Customer rates (stars or thumbs)
        │
        ├─ rating >= threshold  ──►  "Leave a Google review" (public)
        └─ rating <  threshold  ──►  private feedback form  ──►  merchant inbox
```

The threshold and rating type (stars vs thumbs) are per-shop settings. Thumbs
encode down = 1, up = 5.

## Entry points (all on the storefront via App Proxy)

Every customer-facing surface lives on `https://{shop}/apps/order-reviews/...`
so it's on the merchant's own domain. One renderer
(`src/lib/shared/review-form-html.ts`) produces a self-contained HTML form for
all of them.

| Entry point             | URL                             | Route                                   |
| ----------------------- | ------------------------------- | --------------------------------------- |
| Post-order email links  | `/apps/order-reviews/r/{token}` | `src/routes/proxy/r/[token]/+server.ts` |
| Shared link / QR code   | `/apps/order-reviews/review`    | `src/routes/proxy/review/+server.ts`    |
| Widget "Leave a Review" | `/apps/order-reviews/review`    | (same)                                  |

- **`/proxy/r/[token]`** is per-order: the signed token (`src/lib/server/tokens.ts`)
  encodes the review-request id + the rating the customer clicked in the email, so
  it lands **pre-rated** (one click). On GET it records the response and cancels
  follow-ups; auth is the token (not the proxy signature).
- **`/proxy/review`** is generic (no order). Shop identity comes from the
  **signed App Proxy params** — the signature is **required** (it's a public
  write that stores feedback + emails the merchant). Customers pick a rating on
  the page.

Private feedback is submitted as a **JSON POST** to the same path (bypasses
SvelteKit's form-CSRF check). Feedback is stored in `feedback_submissions` with
`source = 'order' | 'link'` (the order one links to a `reviewRequest`; the link
one is standalone — `reviewRequestId` is nullable).

## Post-order email flow

1. **Trigger** — `orders/paid` or `orders/fulfilled` (merchant picks one).
   Both webhooks are always subscribed; the handler
   (`src/lib/server/webhooks/order-trigger.ts`) no-ops unless collection is
   enabled and the firing topic matches the configured trigger.
2. **Schedule** — it creates a `review_requests` row (idempotent on
   `(shop, orderId)`) and enqueues a **delayed** `feedback-email` pg-boss job
   (`delayDays`). Requires `read_orders` scope (and Shopify **Protected Customer
   Data** approval in production — order payloads carry customer email/name).
3. **Send** — `src/lib/server/queue/handlers/feedbackEmail.ts` (worker) renders
   the email (AWS SES) with one link per rating value pointing at
   `https://{shop}/apps/order-reviews/r/{token}`, marks the request `sent`, and
   schedules the first **follow-up**.
4. **Follow-ups** — `followupEmail.ts` reminds non-responders up to
   `maxFollowups`, and bails if the customer already responded.
5. **Response** — when the customer clicks, `/proxy/r/[token]` marks the request
   `responded`, cancels any pending follow-up jobs, and branches (Google vs
   private form).

Email links use the storefront domain, so **no `APP_URL` is needed** — the worker
builds `https://{shop}/apps/order-reviews/r/...` directly. SES dry-run:
`EMAIL_DRYRUN=true` logs emails instead of sending.

## The Feedback page (`/app/feedback`)

The merchant's private-feedback inbox:

- Paginated, searchable `DataTableView` (most recent first): rating, message,
  customer, source (Order email / Shared link), date.
- **Delete** per row with a destructive `ConfirmDialog`
  (`DELETE /app/api/feedback/[id]`, shop-scoped).
- A "Smart actions" card + header actions linking to collection methods and the
  form editor.
- Low-rating submissions optionally email the merchant
  (`notifyMerchantOnLowRating` + `merchantEmail`).

## The form editor (`/app/feedback/form`)

A **split visual editor**: controls on the left, a **live iframe preview** on the
right that uses the _same_ `renderReviewForm` so it's pixel-faithful.

- **Layout toggle** — stars vs thumbs (this is the shop's `ratingType`).
- **Step tabs** — Rating, Positive, Private feedback, Thank you. Each step's
  text (headings, body, button labels, placeholders, email-required toggle) is
  editable. `{store}` inserts the store name.
- Saved as `formContent` (JSONB) on `review_collection_settings`; the renderer
  uses it everywhere the form appears.

The preview renders one step **statically** (non-interactive) via the renderer's
`previewStep` option; the live form ignores `previewStep` and runs the full flow.

## Settings (`/app/review-collection`)

Per-shop config in `review_collection_settings`: `enabled`, `trigger`,
`delayDays`, `ratingType`, `threshold`, `placeId` (which location's Google
review link), follow-up config, `notifyMerchantOnLowRating` + `merchantEmail`,
sender name/subject, and the `formContent` blob.

## Data model (key tables)

| Table                        | Notes                                                                                                                                                 |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `review_collection_settings` | PK `shop`; all collection config + `formContent`                                                                                                      |
| `review_requests`            | one per triggered order (PII); unique `(shop, orderId)`; status `scheduled`/`sent`/`responded`/`cancelled`/`failed`; pg-boss job ids for cancellation |
| `feedback_submissions`       | private feedback; `source` order/link; nullable `reviewRequestId`                                                                                     |

## GDPR

The compliance webhook (`src/routes/webhooks/compliance/+server.ts`) deletes
`review_requests` + `feedback_submissions` (and cancels their queued jobs) on
`customers/redact`, and wipes all shop data on `shop/redact`. App uninstall
cancels pending feedback/follow-up jobs.

## Security notes

- `/proxy/review` **requires** a valid App Proxy signature (no fail-open, no
  unsigned `myshopify_domain` fallback) — it's a public write.
- `/proxy/r/[token]` is authenticated by the signed feedback token; the effect
  is idempotent (first response wins) so replayed links are harmless.
- The form renderer escapes all merchant text + store name; customer free-text is
  never reflected back into the page (only POSTed).
