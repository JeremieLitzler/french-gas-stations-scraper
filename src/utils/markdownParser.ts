import { marked, type RendererObject } from 'marked'
import { sanitizeBodyHtml } from './sanitize'

/**
 * A marked renderer override that adds `rel="noopener noreferrer"` to every
 * anchor element, preventing tab-napping via `window.opener`.
 *
 * Only the `link` renderer is overridden; all other elements use the default
 * rendering provided by `marked`.
 */
const safeLinksRenderer: RendererObject = {
  link({ href, title, tokens }): string {
    const titleAttr = title ? ` title="${title}"` : ''
    const text = this.parser.parseInline(tokens)
    return `<a href="${href}"${titleAttr} rel="noopener noreferrer">${text}</a>`
  },
}

marked.use({ renderer: safeLinksRenderer })

/**
 * Parse a Markdown string into sanitized HTML.
 *
 * The pipeline is: marked (Markdown → raw HTML) → sanitizeBodyHtml (DOMPurify).
 * The result is safe for binding to Vue's `v-html`.
 *
 * @param markdown - Raw Markdown string (typically from a bundled `?raw` import)
 * @returns Promise resolving to sanitized HTML string
 */
export async function parseMarkdown(markdown: string): Promise<string> {
  const rawHtml = await marked(markdown)
  return sanitizeBodyHtml(rawHtml)
}
