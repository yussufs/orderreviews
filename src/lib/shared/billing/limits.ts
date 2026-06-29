/**
 * Free-tier limits. Framework-agnostic — imported by both the SvelteKit app and
 * the standalone worker. NO $lib/* or $env/* imports.
 */

/** Max initial feedback request emails a free shop may send per calendar month. */
export const FREE_EMAIL_CAP = 10;

/** Max reviews a free shop's storefront widget displays. */
export const FREE_DISPLAY_CAP = 10;
