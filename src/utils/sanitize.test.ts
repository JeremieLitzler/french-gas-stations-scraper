/**
 * Tests for the shared DOMPurify sanitization utility (sanitize.ts).
 *
 * Covers:
 *  - TC-01: fenced code block structure survives sanitization
 *  - TC-06: article with no fenced code produces unchanged output
 *  - TC-08: script tag is stripped after allowlist extension
 *  - TC-09: inline event handler on a pre element is stripped
 *  - TC-10: event handler on the copy button element is stripped
 *  - TC-11: iframe is stripped after allowlist extension
 *  - TC-12: javascript: URI is stripped after allowlist extension
 *  - TC-13: style attribute is not allowed even when class is allowed
 *  - TC-16: HTML-like text inside a code block is rendered as plain text
 *  - TC-17: multiple fenced code blocks are all preserved
 *  - TC-18: introduction mixing fenced code with other element types is fully preserved
 *  - TC-19: Medium and Substack produce identical sanitized output (shared config)
 *  - TC-22: object and embed elements are stripped
 *  - TC-23: form element is stripped
 */

import { describe, it, expect } from 'vitest'
import { sanitizeBodyHtml } from './sanitize'

const FENCED_BLOCK_HTML =
  '<div class="highlight"><div class="chroma">' +
  '<table class="lntable"><tr><td class="lntd">' +
  '<pre tabindex="0" class="chroma"><code><span class="lnt">1\n</span></code></pre></td>' +
  '<td class="lntd">' +
  '<pre tabindex="0" class="chroma"><code class="language-plaintext" data-lang="plaintext">' +
  '<span class="line"><span class="cl">suggest plan to record specifications</span></span>' +
  '</code></pre></td></tr></table>' +
  '</div></div>'

describe('sanitizeBodyHtml', () => {
  describe('fenced code block structure — TC-01', () => {
    it('preserves div.highlight wrapper', () => {
      const result = sanitizeBodyHtml(FENCED_BLOCK_HTML)
      expect(result).toContain('class="highlight"')
    })

    it('preserves div.chroma wrapper', () => {
      const result = sanitizeBodyHtml(FENCED_BLOCK_HTML)
      expect(result).toContain('class="chroma"')
    })

    it('preserves table element', () => {
      const result = sanitizeBodyHtml(FENCED_BLOCK_HTML)
      expect(result).toContain('<table')
    })

    it('preserves tr element', () => {
      const result = sanitizeBodyHtml(FENCED_BLOCK_HTML)
      expect(result).toContain('<tr')
    })

    it('preserves td elements', () => {
      const result = sanitizeBodyHtml(FENCED_BLOCK_HTML)
      expect(result).toContain('<td')
    })

    it('preserves pre elements', () => {
      const result = sanitizeBodyHtml(FENCED_BLOCK_HTML)
      expect(result).toContain('<pre')
    })

    it('preserves code text content', () => {
      const result = sanitizeBodyHtml(FENCED_BLOCK_HTML)
      expect(result).toContain('suggest plan to record specifications')
    })

    it('preserves tabindex attribute on pre', () => {
      const result = sanitizeBodyHtml(FENCED_BLOCK_HTML)
      expect(result).toContain('tabindex="0"')
    })

    it('preserves data-lang attribute on code', () => {
      const result = sanitizeBodyHtml(FENCED_BLOCK_HTML)
      expect(result).toContain('data-lang="plaintext"')
    })
  })

  describe('article with no fenced code — TC-06', () => {
    it('plain paragraph content is preserved unchanged', () => {
      const input = '<p>Hello world.</p><p>Second paragraph.</p>'
      const result = sanitizeBodyHtml(input)
      expect(result).toContain('<p>Hello world.</p>')
      expect(result).toContain('<p>Second paragraph.</p>')
    })
  })

  describe('active content stripping — TC-08', () => {
    it('strips script element while preserving fenced code content', () => {
      const input = FENCED_BLOCK_HTML + "<script>alert('xss')</script>"
      const result = sanitizeBodyHtml(input)
      expect(result).not.toContain('<script>')
      expect(result).not.toContain('alert(')
      expect(result).toContain('suggest plan to record specifications')
    })
  })

  describe('event handler on pre element — TC-09', () => {
    it('strips onclick attribute from pre while preserving text content', () => {
      const input = '<pre onclick="stealCookies()">code content</pre>'
      const result = sanitizeBodyHtml(input)
      expect(result).not.toContain('onclick')
      expect(result).toContain('<pre')
      expect(result).toContain('code content')
    })
  })

  describe('event handler on button element — TC-10', () => {
    it('strips onclick attribute from button element', () => {
      const input =
        '<div class="highlight"><button class="copyCodeButton" onclick="doCopy()">Copy</button></div>'
      const result = sanitizeBodyHtml(input)
      expect(result).not.toContain('onclick')
    })
  })

  describe('iframe stripping — TC-11', () => {
    it('strips iframe while preserving fenced code content', () => {
      const input = FENCED_BLOCK_HTML + '<iframe src="https://evil.example"></iframe>'
      const result = sanitizeBodyHtml(input)
      expect(result).not.toContain('<iframe')
      expect(result).toContain('suggest plan to record specifications')
    })
  })

  describe('javascript URI stripping — TC-12', () => {
    it('strips javascript: URI from href attribute', () => {
      const input = '<a href="javascript:stealData()">click me</a>'
      const result = sanitizeBodyHtml(input)
      expect(result).not.toContain('javascript:')
    })
  })

  describe('style attribute blocked — TC-13', () => {
    it('strips style attribute while preserving class attribute', () => {
      const input = '<div class="highlight" style="color:red">content</div>'
      const result = sanitizeBodyHtml(input)
      expect(result).not.toContain('style=')
      expect(result).toContain('class="highlight"')
    })
  })

  describe('HTML-like text inside code block — TC-16', () => {
    it('preserves HTML entities inside code block as visible text', () => {
      const input =
        '<div class="highlight"><div class="chroma">' +
        '<pre class="chroma"><code>&lt;div&gt;example&lt;/div&gt;</code></pre>' +
        '</div></div>'
      const result = sanitizeBodyHtml(input)
      expect(result).toContain('&lt;div&gt;')
    })
  })

  describe('multiple fenced code blocks — TC-17', () => {
    it('preserves all fenced code blocks, not only the first', () => {
      const secondBlock =
        '<div class="highlight"><div class="chroma">' +
        '<pre class="chroma"><code>second block content</code></pre>' +
        '</div></div>'
      const input = FENCED_BLOCK_HTML + secondBlock
      const result = sanitizeBodyHtml(input)
      expect(result).toContain('suggest plan to record specifications')
      expect(result).toContain('second block content')
    })
  })

  describe('mixed element types — TC-18', () => {
    it('preserves p, ul, blockquote, and fenced code structure together', () => {
      const input =
        '<p>Introduction paragraph.</p>' +
        '<ul><li>List item one</li></ul>' +
        '<blockquote><p>A quote.</p></blockquote>' +
        FENCED_BLOCK_HTML
      const result = sanitizeBodyHtml(input)
      expect(result).toContain('<p>Introduction paragraph.</p>')
      expect(result).toContain('<ul>')
      expect(result).toContain('<blockquote>')
      expect(result).toContain('suggest plan to record specifications')
    })
  })

  describe('identical output for same input — TC-19', () => {
    it('sanitizeBodyHtml is deterministic: two calls produce the same output', () => {
      const firstCall = sanitizeBodyHtml(FENCED_BLOCK_HTML)
      const secondCall = sanitizeBodyHtml(FENCED_BLOCK_HTML)
      expect(firstCall).toBe(secondCall)
    })
  })

  describe('object and embed stripping — TC-22', () => {
    it('strips object element while preserving fenced code content', () => {
      const input = FENCED_BLOCK_HTML + '<object data="https://evil.example/payload"></object>'
      const result = sanitizeBodyHtml(input)
      expect(result).not.toContain('<object')
      expect(result).toContain('suggest plan to record specifications')
    })

    it('strips embed element while preserving fenced code content', () => {
      const input = FENCED_BLOCK_HTML + '<embed src="https://evil.example/payload" />'
      const result = sanitizeBodyHtml(input)
      expect(result).not.toContain('<embed')
      expect(result).toContain('suggest plan to record specifications')
    })
  })

  describe('form stripping — TC-23', () => {
    it('strips form element while preserving fenced code content', () => {
      const input =
        FENCED_BLOCK_HTML + '<form action="https://evil.example"><input name="data"/></form>'
      const result = sanitizeBodyHtml(input)
      expect(result).not.toContain('<form')
      expect(result).toContain('suggest plan to record specifications')
    })
  })
})
