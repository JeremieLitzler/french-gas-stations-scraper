/**
 * Display state of the GitHub reconnect notice (issue #158).
 *
 * - `countdown`: the 2-second notice shown just before the app redirects
 *   automatically to the GitHub OAuth start endpoint; carries a cancel button.
 * - `fallback`: the banner shown once the automatic attempt is used up, or
 *   after a 401 later in the session; carries a reconnect button and a
 *   dismiss control.
 */
export type ReconnectNoticeState = 'countdown' | 'fallback'
