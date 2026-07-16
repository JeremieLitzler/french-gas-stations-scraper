// Builds Netlify HandlerResponse objects for JSON bodies and redirects.
import type { HandlerResponse } from '@netlify/functions'

export function jsonResponse(
  statusCode: number,
  body: unknown,
  setCookieValues: readonly string[] = [],
): HandlerResponse {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    multiValueHeaders: cookieHeaders(setCookieValues),
    body: JSON.stringify(body),
  }
}

export function redirectResponse(
  location: string,
  setCookieValues: readonly string[] = [],
): HandlerResponse {
  return {
    statusCode: 302,
    headers: { Location: location },
    multiValueHeaders: cookieHeaders(setCookieValues),
    body: '',
  }
}

// Set-Cookie can't be comma-joined into a single header value like other headers;
// multiValueHeaders is the Lambda/Netlify mechanism for sending several of them at once.
function cookieHeaders(
  setCookieValues: readonly string[],
): Record<string, readonly string[]> | undefined {
  if (setCookieValues.length === 0) {
    return undefined
  }
  return { 'Set-Cookie': setCookieValues }
}
