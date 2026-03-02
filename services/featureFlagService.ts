/**
 * Feature Flag Service — reads from app_settings table.
 *
 * Key prefix:  'ff_'
 * Value format: 'true' | 'false' | 'rollout:N'  (N = integer percentage 0-100)
 *
 * Server-truth: All flag values are fetched from Supabase app_settings.
 * An in-memory cache (60-second TTL) prevents excessive DB round-trips.
 *
 * Security note: Security-critical gate decisions (e.g. admin access, rate
 * limits) must NEVER be made solely on client-evaluated feature flags.
 * This service is for progressive rollout of UI features and non-security
 * functionality only.
 *
 * @module featureFlagService
 */

import { supabase } from '../src/lib/supabase';

// ── Flag name catalog ─────────────────────────────────────────────────────────

/**
 * All recognized feature flag names.
 * Add new flags here AND in the migration seed (app_settings table) together.
 */
export type FeatureFlagName =
  | 'ff_institution_auto_verify'
  | 'ff_license_upload_flow'
  | 'ff_admin_verification_panel'
  | 'ff_account_safety_center'
  | 'ff_safety_escalation_v2'
  | 'ff_fraud_risk_scoring'
  | 'ff_professional_claims';

// ── Cache types ───────────────────────────────────────────────────────────────

interface FlagCache {
  /** Raw string value from app_settings.value */
  value: string;
  /** Unix timestamp (ms) when this entry was fetched */
  fetchedAt: number;
}

// ── Module-level state ────────────────────────────────────────────────────────

/** In-memory flag cache. Keyed by FeatureFlagName. */
const cache = new Map<FeatureFlagName, FlagCache>();

/** Cache TTL in milliseconds (60 seconds). */
const CACHE_TTL_MS = 60_000;

// ── Internal helpers ──────────────────────────────────────────────────────────

/**
 * Fetch the raw flag value from app_settings, using the in-memory cache
 * when the cached entry is still within TTL.
 *
 * Returns 'false' if the flag does not exist in the database (safe default).
 */
async function getRawFlag(name: FeatureFlagName): Promise<string> {
  const cached = cache.get(name);
  if (cached !== undefined && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.value;
  }

  const { data, error } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', name)
    .maybeSingle();

  if (error) {
    // On read error, return safe default and do not update cache.
    // Caller will retry on the next call.
    console.warn(`[featureFlagService] Failed to fetch flag "${name}":`, error.message);
    return 'false';
  }

  const value = (data as { value: string } | null)?.value ?? 'false';

  cache.set(name, { value, fetchedAt: Date.now() });
  return value;
}

/**
 * Deterministically bucket a userId into a 0–99 cohort.
 *
 * Uses a simple polynomial hash (djb2-style) over the character codes of
 * the userId string. The result is stable for a given userId and bucket
 * size, ensuring a user sees a consistent experience across sessions.
 *
 * @param userId  The authenticated user's UUID
 * @returns       An integer in [0, 99]
 */
function userBucket(userId: string): number {
  let hash = 5381;
  for (let i = 0; i < userId.length; i++) {
    // Unsigned right-shift keeps the value within 32-bit integer range.
    hash = ((hash * 33) ^ userId.charCodeAt(i)) >>> 0;
  }
  return hash % 100;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns true if the named feature flag is enabled for the given user.
 *
 * Supported value formats:
 *   'true'       — enabled for everyone
 *   'false'      — disabled for everyone
 *   'rollout:N'  — enabled for N% of users (deterministic bucketing by userId)
 *
 * When the flag value is 'rollout:N' and no userId is supplied, the function
 * returns false (conservative default — do not enable for anonymous callers).
 *
 * @param name    The feature flag name (must be a FeatureFlagName literal)
 * @param userId  Optional authenticated user UUID for rollout bucketing
 */
export async function isEnabled(
  name: FeatureFlagName,
  userId?: string,
): Promise<boolean> {
  const raw = await getRawFlag(name);

  if (raw === 'true') return true;
  if (raw === 'false') return false;

  if (raw.startsWith('rollout:')) {
    const pctStr = raw.slice(8);
    const pct = parseInt(pctStr, 10);

    if (isNaN(pct) || pct < 0 || pct > 100) {
      console.warn(
        `[featureFlagService] Invalid rollout value for "${name}": "${raw}". Treating as disabled.`,
      );
      return false;
    }

    if (!userId) return false;

    return userBucket(userId) < pct;
  }

  // Unrecognized format — safe default is disabled.
  console.warn(
    `[featureFlagService] Unrecognized flag value for "${name}": "${raw}". Treating as disabled.`,
  );
  return false;
}

/**
 * Invalidate the cached value for a specific flag.
 *
 * Call this after an admin updates a flag value so the next read reflects
 * the new configuration immediately rather than waiting for TTL expiry.
 *
 * @param name  The flag to invalidate
 */
export function invalidateFlag(name: FeatureFlagName): void {
  cache.delete(name);
}

/**
 * Invalidate all cached flag values.
 *
 * Useful after a bulk flag update (e.g. rollout pause, emergency disable).
 */
export function invalidateAllFlags(): void {
  cache.clear();
}

/**
 * Prefetch a set of flags into the cache in a single round-trip.
 * Reduces latency when a component needs to check multiple flags on mount.
 *
 * @param names  Array of flag names to prefetch
 */
export async function prefetchFlags(names: FeatureFlagName[]): Promise<void> {
  if (names.length === 0) return;

  const { data, error } = await supabase
    .from('app_settings')
    .select('key, value')
    .in('key', names);

  if (error) {
    console.warn('[featureFlagService] prefetchFlags error:', error.message);
    return;
  }

  const now = Date.now();
  const fetched = new Set<FeatureFlagName>();

  for (const row of data ?? []) {
    const key = row.key as FeatureFlagName;
    const value = (row.value as string | null) ?? 'false';
    cache.set(key, { value, fetchedAt: now });
    fetched.add(key);
  }

  // Any requested flag not returned by the query does not exist in the DB.
  // Cache it as 'false' so subsequent reads don't hit the DB again.
  for (const name of names) {
    if (!fetched.has(name)) {
      cache.set(name, { value: 'false', fetchedAt: now });
    }
  }
}
