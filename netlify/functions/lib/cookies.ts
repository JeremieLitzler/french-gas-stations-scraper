// Cookie parsing/building shared by all GitHub OAuth Netlify functions.
import type { HandlerEvent } from '@netlify/functions'

type SameSitePolicy = 'Strict' | 'Lax'

interface SessionCookieOptions {
  maxAgeSeconds: number
  isSecureRequest: boolean
  sameSite: SameSitePolicy
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
    `SameSite=${options.sameSite}`,
    'Path=/',
    `Max-Age=${options.maxAgeSeconds}`,
  ]
  if (options.isSecureRequest) {
    attributes.push('Secure')
  }
  return attributes.join('; ')
}

// SameSite has no bearing on cookie deletion (the browser matches name/domain/path
// only), so the expired cookie always clears regardless of the policy used here.
export function buildExpiredCookie(name: string, isSecureRequest: boolean): string {
  return buildSessionCookie(name, '', { maxAgeSeconds: 0, isSecureRequest, sameSite: 'Strict' })
}

export function isHttpsRequest(event: HandlerEvent): boolean {
  return event.headers['x-forwarded-proto'] === 'https'
}
