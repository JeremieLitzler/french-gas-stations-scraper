/**
 * Shared DOMPurify sanitization configuration.
 *
 * Extends DOMPurify's default allowlist to preserve the HTML structure
 * produced by the blog engine's fenced-code-block renderer
 * (div.highlight > div.chroma > table.lntable > tr > td > pre > code > span).
 *
 * Active content (script, iframe, object, embed, form, event handlers,
 * javascript: URIs) remains blocked — ADD_TAGS and ADD_ATTR extend the
 * default allowlist rather than replacing it, so the default security
 * barrier is intact.
 *
 * Both PlatformMedium and PlatformSubstack import this module so that
 * the configuration is defined once and cannot drift between the two
 * components (security-guidelines.md rule 5).
 */

import DOMPurify, { type Config } from 'dompurify'

/**
 * HTML element tags required by the blog fenced-code-block structure
 * that DOMPurify does not permit by default.
 *
 * Traceable to the live article fixture
 * (tests/fixtures/organizing-specifications-with-claude-code.html):
 *   div.highlight > div.chroma > table.lntable > tr > td > pre > code > span
 *
 * button is included because the blog engine may emit
 * <button class="copyCodeButton"> inside the wrapper.
 */
const FENCED_CODE_EXTRA_TAGS: readonly string[] = [
  'table',
  'tr',
  'td',
  'button',
]

/**
 * HTML attributes required by the blog fenced-code-block structure
 * that DOMPurify does not permit by default.
 *
 * - tabindex: present on <pre tabindex="0" class="chroma">
 * - data-lang: present on <code data-lang="plaintext">
 *
 * class is already permitted by DOMPurify's default configuration.
 * style is intentionally excluded (security-guidelines.md rule 3).
 * All on* event handler attributes remain blocked by DOMPurify defaults.
 */
const FENCED_CODE_EXTRA_ATTRS: readonly string[] = [
  'tabindex',
  'data-lang',
]

/**
 * DOMPurify configuration that extends the default allowlist with
 * the minimal set of tags and attributes required by fenced code blocks.
 *
 * Using ADD_TAGS / ADD_ATTR (not ALLOWED_TAGS) preserves DOMPurify's
 * default active-content blocking.
 */
/**
 * Tags that DOMPurify allows by default but must be blocked here.
 *
 * - form: allowed by DOMPurify defaults; blocked to prevent phishing via
 *   injected forms that submit user data to attacker-controlled endpoints.
 */
const BLOCKED_TAGS: readonly string[] = ['form']

/**
 * Attributes that DOMPurify allows by default but must be blocked here.
 *
 * - style: allowed by DOMPurify defaults; blocked to prevent CSS injection
 *   (e.g. hiding content, overlaying elements) even when class is permitted.
 */
const BLOCKED_ATTRS: readonly string[] = ['style']

const SANITIZE_CONFIG: Config & { RETURN_DOM?: false; RETURN_DOM_FRAGMENT?: false } = {
  ADD_TAGS: [...FENCED_CODE_EXTRA_TAGS],
  ADD_ATTR: [...FENCED_CODE_EXTRA_ATTRS],
  FORBID_TAGS: [...BLOCKED_TAGS],
  FORBID_ATTR: [...BLOCKED_ATTRS],
}

/**
 * Sanitize an HTML string using the shared fenced-code-aware configuration.
 *
 * The result is safe for binding to Vue's v-html and for writing to the
 * clipboard. Sanitization is synchronous and runs in the current call frame.
 *
 * @param rawHtml - Unsanitized HTML string (may be user-edited)
 * @returns Sanitized HTML string with active content removed
 */
export function sanitizeBodyHtml(rawHtml: string): string {
  return DOMPurify.sanitize(rawHtml, SANITIZE_CONFIG)
}
