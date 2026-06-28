/**
 * Renders the public review form. Used in two places with the SAME code so the
 * editor preview is faithful to what customers see:
 *   - server: served on the storefront via App Proxy (/proxy/review, /proxy/r/[token])
 *   - client: the visual editor's iframe preview (/app/feedback/form)
 *
 * Framework-agnostic (no $lib/$env). Self-contained HTML: inline CSS + vanilla
 * JS. Customer free-text is never reflected back into the DOM; merchant content
 * and store name are escaped on render.
 */

export interface FormContent {
	rating: { heading: string; subtext: string };
	positive: { heading: string; body: string; buttonLabel: string };
	negative: {
		heading: string;
		body: string;
		messagePlaceholder: string;
		emailRequired: boolean;
		emailPlaceholder: string;
		submitLabel: string;
	};
	thanks: { heading: string; body: string };
}

/** Use {store} in any text to insert the store name. */
export const DEFAULT_FORM_CONTENT: FormContent = {
	rating: {
		heading: 'How was your experience with {store}?',
		subtext: 'Tap a rating to let us know.'
	},
	positive: {
		heading: 'Thanks so much!',
		body: 'We’re glad you had a great experience with {store}. Would you mind sharing it on Google?',
		buttonLabel: 'Leave a Google review'
	},
	negative: {
		heading: 'How can we do better?',
		body: 'Your feedback goes straight to the {store} team — please tell us what went wrong.',
		messagePlaceholder: 'Tell us what happened…',
		emailRequired: false,
		emailPlaceholder: 'Your email (optional)',
		submitLabel: 'Send feedback'
	},
	thanks: {
		heading: 'Thank you for your feedback',
		body: 'We’ve shared it with the {store} team.'
	}
};

export type PreviewStep = 'rating' | 'positive' | 'negative' | 'thanks';

export interface ReviewFormConfig {
	storeName: string;
	ratingType: 'stars' | 'thumbs';
	threshold: number;
	writeReviewUrl: string | null;
	content: FormContent;
	/** When set (email one-click flow), skip the picker and branch on this rating. */
	preRating?: number | null;
	/** Editor preview: render this single step statically (no interaction). */
	previewStep?: PreviewStep | null;
}

function escapeHtml(text: string): string {
	const map: Record<string, string> = {
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;',
		'"': '&quot;',
		"'": '&#039;'
	};
	return text.replace(/[&<>"']/g, (c) => map[c]);
}

export function renderReviewForm(cfg: ReviewFormConfig): string {
	const cfgJson = JSON.stringify({
		storeName: cfg.storeName,
		ratingType: cfg.ratingType,
		threshold: cfg.threshold,
		writeReviewUrl: cfg.writeReviewUrl,
		content: cfg.content,
		preRating: cfg.preRating ?? null,
		previewStep: cfg.previewStep ?? null
	}).replace(/</g, '\\u003c');

	const title = escapeHtml(cfg.storeName);

	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" />
<title>${title} — Leave a review</title>
<style>
  body { margin:0; background:#f4f5f7; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; color:#1a1a1a; }
  .wrap { min-height:100vh; display:flex; align-items:center; justify-content:center; padding:24px; box-sizing:border-box; }
  .card { background:#fff; border:1px solid #e5e7eb; border-radius:16px; padding:40px 32px; max-width:480px; width:100%; text-align:center; box-shadow:0 1px 3px rgba(0,0,0,.08); }
  .emoji { font-size:48px; line-height:1; margin-bottom:12px; }
  h1 { font-size:24px; margin:0 0 12px; }
  p { color:#4b5563; line-height:1.6; margin:0 0 16px; }
  .stars { display:flex; justify-content:center; gap:6px; margin:12px 0 4px; }
  .star { background:none; border:none; cursor:pointer; color:#d1d5db; transition:color .1s ease; padding:0 2px; line-height:0; }
  .star-svg { width:44px; height:44px; display:block; fill:currentColor; }
  .star .p-fill { display:none; }
  .star.on { color:#fbbc04; }
  .star.on .p-border { display:none; }
  .star.on .p-fill { display:inline; }
  .thumbs { display:flex; gap:12px; justify-content:center; margin:16px 0; }
  .thumb { flex:1; max-width:180px; cursor:pointer; font:inherit; font-weight:600; padding:16px; border-radius:10px; border:1px solid #e5e7eb; background:#fff; }
  textarea, .email { width:100%; box-sizing:border-box; border:1px solid #d1d5db; border-radius:8px; padding:12px; font:inherit; margin-bottom:12px; }
  textarea { resize:vertical; }
  .btn { display:inline-block; text-decoration:none; border:none; cursor:pointer; font:inherit; font-weight:600; padding:14px 28px; border-radius:8px; background:#1a73e8; color:#fff; }
  .btn[disabled] { opacity:.6; cursor:default; }
  .reset { display:block; margin:18px auto 0; background:none; border:none; color:#6b7280; cursor:pointer; font:inherit; font-size:.9rem; }
  .preview .star, .preview .thumb, .preview .btn, .preview .reset, .preview textarea, .preview .email { pointer-events:none; }
</style>
</head>
<body>
  <div class="wrap"><div class="card" id="root"></div></div>
  <script>window.__REVIEW_CFG__ = ${cfgJson};</script>
  <script>
  (function () {
    var cfg = window.__REVIEW_CFG__;
    var C = cfg.content;
    var preview = !!cfg.previewStep;
    var root = document.getElementById('root');
    if (preview) root.parentNode.parentNode.classList.add('preview');

    function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]; }); }
    function t(s){ return esc(String(s == null ? '' : s).replace(/\\{store\\}/g, cfg.storeName)); }

    function showPick() {
      var html = '<div class="emoji">⭐</div><h1>' + t(C.rating.heading) + '</h1><p>' + t(C.rating.subtext) + '</p>';
      if (cfg.ratingType === 'thumbs') {
        html += '<div class="thumbs"><button class="thumb" data-r="5">👍 Good</button><button class="thumb" data-r="1">👎 Not great</button></div>';
        root.innerHTML = html;
        if (!preview) Array.prototype.forEach.call(root.querySelectorAll('.thumb'), function (b) {
          b.addEventListener('click', function () { pick(parseInt(b.getAttribute('data-r'), 10)); });
        });
      } else {
        html += '<div class="stars">';
        for (var i = 1; i <= 5; i++) html += '<button class="star" data-r="' + i + '" aria-label="' + i + ' star' + (i === 1 ? '' : 's') + '">' +
          '<svg class="star-svg" viewBox="0 0 24 24" aria-hidden="true">' +
          '<path class="p-border" d="m22 9.24-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03zM12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28z"></path>' +
          '<path class="p-fill" d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"></path>' +
          '</svg></button>';
        html += '</div>';
        root.innerHTML = html;
        if (!preview) {
          var stars = root.querySelectorAll('.star');
          Array.prototype.forEach.call(stars, function (b, idx) {
            b.addEventListener('mouseenter', function () { paint(idx + 1); });
            b.addEventListener('click', function () { pick(idx + 1); });
          });
          root.querySelector('.stars').addEventListener('mouseleave', function () { paint(0); });
        }
      }
    }
    function paint(n) {
      var stars = root.querySelectorAll('.star');
      Array.prototype.forEach.call(stars, function (b, idx) { if (idx < n) b.classList.add('on'); else b.classList.remove('on'); });
    }

    function pick(rating) {
      if (rating >= cfg.threshold) showPositive();
      else showPrivate(rating);
    }

    function showPositive() {
      var html = '<div class="emoji">🎉</div><h1>' + t(C.positive.heading) + '</h1><p>' + t(C.positive.body) + '</p>';
      if (cfg.writeReviewUrl) html += '<a class="btn" href="' + esc(cfg.writeReviewUrl) + '" target="_blank" rel="noopener noreferrer">' + t(C.positive.buttonLabel) + '</a>';
      if (!preview) html += '<button class="reset">← Choose a different rating</button>';
      root.innerHTML = html;
      if (!preview) root.querySelector('.reset').addEventListener('click', showPick);
    }

    function showPrivate(rating) {
      var reqd = C.negative.emailRequired ? ' required' : '';
      root.innerHTML = '<div class="emoji">💬</div><h1>' + t(C.negative.heading) + '</h1><p>' + t(C.negative.body) + '</p>' +
        '<form id="fb"><textarea name="message" rows="5" placeholder="' + t(C.negative.messagePlaceholder) + '" required></textarea>' +
        '<input class="email" type="email" name="email" placeholder="' + t(C.negative.emailPlaceholder) + '"' + reqd + ' />' +
        '<button class="btn" type="submit">' + t(C.negative.submitLabel) + '</button></form>' +
        (preview ? '' : '<button class="reset">← Choose a different rating</button>');
      if (preview) return;
      root.querySelector('.reset').addEventListener('click', showPick);
      var form = root.querySelector('#fb');
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var btn = form.querySelector('.btn');
        btn.setAttribute('disabled', 'true'); btn.textContent = 'Sending…';
        fetch(window.location.pathname, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rating: rating, message: form.message.value, email: form.email.value })
        }).then(function (r) { return r.ok ? r.json() : Promise.reject(r); })
          .then(showThanks)
          .catch(function () { btn.removeAttribute('disabled'); btn.textContent = t(C.negative.submitLabel); alert('Sorry, something went wrong. Please try again.'); });
      });
    }

    function showThanks() {
      root.innerHTML = '<div class="emoji">🙏</div><h1>' + t(C.thanks.heading) + '</h1><p>' + t(C.thanks.body) + '</p>';
    }

    if (cfg.previewStep === 'rating') showPick();
    else if (cfg.previewStep === 'positive') showPositive();
    else if (cfg.previewStep === 'negative') showPrivate(1);
    else if (cfg.previewStep === 'thanks') showThanks();
    else if (typeof cfg.preRating === 'number') pick(cfg.preRating);
    else showPick();
  })();
  </script>
</body>
</html>`;
}
