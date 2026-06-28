/**
 * Clean review text coming from Google/Apify, which can contain HTML like
 * `<br>` tags and entities. Converts <br> to newlines, strips other tags, and
 * decodes common entities so the text renders cleanly (the widget uses
 * white-space: pre-line to show the line breaks). Framework-agnostic.
 */
export function cleanReviewText<T extends string | null | undefined>(input: T): T {
	if (input == null) return input;
	let s = String(input);

	// <br>, <br/>, <br /> (any case) -> newline
	s = s.replace(/<\s*br\s*\/?\s*>/gi, '\n');
	// strip any remaining HTML tags
	s = s.replace(/<\/?[a-z][^>]*>/gi, '');
	// decode the common entities Google emits
	s = s
		.replace(/&nbsp;/gi, ' ')
		.replace(/&amp;/gi, '&')
		.replace(/&lt;/gi, '<')
		.replace(/&gt;/gi, '>')
		.replace(/&quot;/gi, '"')
		.replace(/&#0?39;|&apos;/gi, "'");
	// tidy whitespace: trailing spaces per line, collapse 3+ newlines to 2
	s = s
		.replace(/[ \t]+\n/g, '\n')
		.replace(/\n{3,}/g, '\n\n')
		.trim();

	return s as T;
}
