// UUID pattern (any version) — the server validates v4 specifically.
const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/**
 * Extracts an invite token from a Universal Link or custom-scheme URL.
 *
 * Accepted formats:
 *   https://trysyncup.org/i/<token>   (Universal Link)
 *   syncup://invite/<token>            (custom scheme fallback)
 *
 * Returns null if the URL doesn't match either format or contains no valid UUID.
 */
export function extractInviteToken(url: string): string | null {
  const universalMatch = new RegExp(`trysyncup\\.org/i/(${UUID_RE.source})`, 'i').exec(url);
  if (universalMatch?.[1]) return universalMatch[1];

  const schemeMatch = new RegExp(`syncup://invite/(${UUID_RE.source})`, 'i').exec(url);
  if (schemeMatch?.[1]) return schemeMatch[1];

  return null;
}
