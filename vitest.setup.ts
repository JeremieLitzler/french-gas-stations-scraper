/**
 * Vitest global setup.
 *
 * Workaround for a happy-dom deviation from the DOM spec that silently
 * disables DOMPurify, and with it every assertion in src/utils/sanitize.test.ts.
 *
 * In a browser, `nodeName` is defined once as a getter on `Node.prototype` and
 * returns the correct name for every node type. happy-dom instead puts a stub
 * on `Node.prototype` that returns an empty string, and overrides it on each
 * subclass (`Element`, `Text`, `Comment`, `Document`).
 *
 * Since 3.4.0, DOMPurify caches the getter it finds on `Node.prototype` at
 * import time and calls it on every visited node (clobbering protection —
 * a page-supplied `nodeName` property must not be trusted). Under happy-dom
 * that read returns '' for every element, so no tag ever matches ALLOWED_TAGS
 * and DOMPurify strips the document instead of sanitizing it.
 *
 * Real browsers are unaffected — this restores spec behaviour for tests only,
 * by delegating `Node.prototype.nodeName` to the subclass getter, which is what
 * a browser's single canonical getter already does.
 *
 * Remove once happy-dom defines `nodeName` correctly on `Node.prototype`.
 */

type NodeConstructorLike = { prototype: object }

const nodeProto = (globalThis as unknown as { Node?: NodeConstructorLike }).Node?.prototype

if (nodeProto) {
  const stubDescriptor = Object.getOwnPropertyDescriptor(nodeProto, 'nodeName')

  Object.defineProperty(nodeProto, 'nodeName', {
    configurable: true,
    get(this: object): unknown {
      // Walk the receiver's own prototype chain and stop before Node.prototype,
      // so the subclass getter (Element, Text, Comment, Document) wins.
      let proto = Object.getPrototypeOf(this)
      while (proto && proto !== nodeProto) {
        const descriptor = Object.getOwnPropertyDescriptor(proto, 'nodeName')
        if (descriptor?.get) return descriptor.get.call(this)
        proto = Object.getPrototypeOf(proto)
      }
      // No subclass override (e.g. DocumentFragment): keep happy-dom's value.
      return stubDescriptor?.get?.call(this)
    },
  })
}
