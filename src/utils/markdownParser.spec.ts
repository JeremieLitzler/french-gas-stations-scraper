/**
 * Tests for the markdownParser utility (markdownParser.ts).
 *
 * TC-01: Valid Markdown produces sanitized HTML with expected elements
 * TC-02: XSS payload is stripped from the output
 * TC-03: Empty string input returns empty string
 * TC-07: parseMarkdown is a pure function — multiple calls return the same result
 */

import { describe, it, expect } from 'vitest'
import { parseMarkdown } from './markdownParser'

// ---------------------------------------------------------------------------
// TC-01: valid Markdown produces sanitized HTML
// ---------------------------------------------------------------------------

describe('TC-01: valid Markdown produces sanitized HTML with expected elements', () => {
  it('converts a heading to an <h1> element', async () => {
    const result = await parseMarkdown('# Hello')
    expect(result).toContain('<h1>')
    expect(result).toContain('Hello')
  })

  it('converts a paragraph to a <p> element', async () => {
    const result = await parseMarkdown('A simple paragraph.')
    expect(result).toContain('<p>')
    expect(result).toContain('A simple paragraph.')
  })

  it('converts a Markdown link to an <a> element', async () => {
    const result = await parseMarkdown('[Click here](https://example.com)')
    expect(result).toContain('<a')
    expect(result).toContain('href="https://example.com"')
    expect(result).toContain('Click here')
  })

  it('does not contain <script> elements in the output', async () => {
    const result = await parseMarkdown('# Safe heading\n\nSafe paragraph.')
    expect(result).not.toContain('<script')
  })

  it('does not contain event handler attributes in the output', async () => {
    const result = await parseMarkdown('# Safe heading\n\nSafe paragraph.')
    expect(result).not.toMatch(/on\w+="/)
  })
})

// ---------------------------------------------------------------------------
// TC-02: XSS payload is stripped
// ---------------------------------------------------------------------------

describe('TC-02: XSS payload is stripped from the output', () => {
  it('strips a <script> tag embedded in the Markdown', async () => {
    const maliciousMarkdown = "# Title\n\n<script>alert('xss')</script>\n\nSafe content."
    const result = await parseMarkdown(maliciousMarkdown)
    expect(result).not.toContain('<script>')
    expect(result).not.toContain("alert('xss')")
    expect(result).toContain('Safe content')
  })

  it('strips an inline onerror attribute', async () => {
    const maliciousMarkdown = '<img src="x" onerror="stealData()">'
    const result = await parseMarkdown(maliciousMarkdown)
    expect(result).not.toContain('onerror')
    expect(result).not.toContain('stealData')
  })
})

// ---------------------------------------------------------------------------
// TC-03: empty string input
// ---------------------------------------------------------------------------

describe('TC-03: empty string input returns empty string without throwing', () => {
  it('returns an empty string when given an empty input', async () => {
    const result = await parseMarkdown('')
    expect(typeof result).toBe('string')
    expect(result.trim()).toBe('')
  })
})

// ---------------------------------------------------------------------------
// TC-07: parseMarkdown is deterministic (no side effects)
// ---------------------------------------------------------------------------

describe('TC-07: parseMarkdown is a pure function — multiple calls return the same result', () => {
  it('returns the same HTML on repeated calls with the same input', async () => {
    const markdown = '# Heading\n\nA paragraph with a [link](https://example.com).'
    const firstCall = await parseMarkdown(markdown)
    const secondCall = await parseMarkdown(markdown)
    const thirdCall = await parseMarkdown(markdown)
    expect(firstCall).toBe(secondCall)
    expect(secondCall).toBe(thirdCall)
  })
})
