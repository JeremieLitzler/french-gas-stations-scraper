// Cookie parsing/building shared by all GitHub OAuth Netlify functions.
import type { HandlerEvent } from '@netlify/functions'

interface SessionCookieOptions {
  maxAgeSeconds: number
  isSecureRequest: boolean
}

export function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) {
    return {}
  }
  const cookies: Record<string, string> = {}
  for (const pair of cookieHeader.split(';')) {
    const [name, ...valueParts] = pair.trim().split('=')
    if (name) {
      cookies[name] = valueParts.join('=')
    }
  }
  return cookies
}

export function buildSessionCookie(
  name: string,
  value: string,
  options: SessionCookieOptions,
): string {
  const attributes = [
    `${name}=${value}`,
    'HttpOnly',
    'SameSite=Strict',
    'Path=/',
    `Max-Age=${options.maxAgeSeconds}`,
  ]
  if (options.isSecureRequest) {
    attributes.push('Secure')
  }
  return attributes.join('; ')
}

export function buildExpiredCookie(name: string, isSecureRequest: boolean): string {
  return buildSessionCookie(name, '', { maxAgeSeconds: 0, isSecureRequest })
}

export function isHttpsRequest(event: HandlerEvent): boolean {
  return event.headers['x-forwarded-proto'] === 'https'
}
