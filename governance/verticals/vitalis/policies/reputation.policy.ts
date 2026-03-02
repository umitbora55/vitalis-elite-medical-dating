/**
 * Reputation & Anti-Fraud Policy
 * Vitalis Elite Medical Dating — Governance v2.6.2
 *
 * Defines: fraud signal taxonomy, visibility throttle thresholds,
 * brigading detection rules, and the "punitive silence forbidden" principle
 * which mandates a resolution path for every friction action.
 */

// ── Fraud signal taxonomy ─────────────────────────────────────────────────────

/**
 * All recognized behavioral fraud signals.
 * Signals are produced by server-side risk scoring; never by client.
 */
export const FRAUD_SIGNALS = [
  'device_fingerprint_mismatch',
  'swipe_velocity',
  'message_velocity',
  'doc_upload_abuse',
  'chargeback_pattern',
  'mass_report_targeting',
  'impossible_travel',
  'disposable_email',
] as const;

export type FraudSignal = typeof FRAUD_SIGNALS[number];

/**
 * Returns true if the given string is a recognized fraud signal.
 */
export function isFraudSignal(value: string): value is FraudSignal {
  return (FRAUD_SIGNALS as readonly string[]).includes(value);
}

// ── Visibility throttle ───────────────────────────────────────────────────────

/**
 * Thresholds at which account visibility is automatically throttled.
 *
 * risk_score    — computed 0-100 score; exceeding this hides the profile from discovery
 * fraud_signals — count of distinct active fraud signals; exceeding this throttles
 */
export const VISIBILITY_THROTTLE_THRESHOLDS = {
  risk_score: 70,
  fraud_signals: 3,
} as const;

/**
 * Returns true if the account should have its discovery visibility throttled.
 *
 * @param riskScore         Current 0-100 risk score
 * @param activeFraudCount  Number of distinct active fraud signals
 */
export function shouldThrottleVisibility(
  riskScore: number,
  activeFraudCount: number,
): boolean {
  return (
    riskScore >= VISIBILITY_THROTTLE_THRESHOLDS.risk_score ||
    activeFraudCount >= VISIBILITY_THROTTLE_THRESHOLDS.fraud_signals
  );
}

// ── Punitive silence rule ─────────────────────────────────────────────────────

/**
 * Core policy: every friction action (throttle, restriction, warning) MUST
 * present the user with a clear resolution path.
 *
 * Shadow-banning, silent drops, or unexplained restrictions are FORBIDDEN.
 * This constant is intentionally true and must never be set to false.
 */
export const PUNITIVE_SILENCE_FORBIDDEN = true as const;

/**
 * Resolution paths for each fraud signal — shown to the affected user so
 * they know exactly how to clear the flag.
 */
export function getResolutionPath(fraudSignal: FraudSignal): string {
  const paths: Record<FraudSignal, string> = {
    device_fingerprint_mismatch:
      'Cihaz doğrulama adımını tamamla — Ayarlar → Güvenlik → Cihazlarım',
    swipe_velocity:
      'Normal swipe hızına döndüğünde kısıtlama otomatik kaldırılır (24 saat)',
    message_velocity:
      'Mesaj hızı normale döndüğünde kısıtlama otomatik kaldırılır (24 saat)',
    doc_upload_abuse:
      'Geçerli ve okunabilir belgeler yükle — Hesabım → Doğrulama',
    chargeback_pattern:
      'Ödeme yöntemini güncelle — Ayarlar → Abonelik → Ödeme Bilgileri',
    mass_report_targeting:
      'Bu bir hata olduğunu düşünüyorsan itiraz formunu doldur — Yardım → İtiraz Et',
    impossible_travel:
      'Farklı şehirde/ülkedeysen Trip Modunu aktifleştir — Keşfet → Trip Modu',
    disposable_email:
      'Kurumsal veya kalıcı e-posta adresi ekle — Hesabım → E-posta Değiştir',
  };
  return paths[fraudSignal];
}

// ── Mass-report brigading detection ──────────────────────────────────────────

/**
 * Minimum number of unique reporters required within the observation window
 * before a mass-report targeting signal is raised.
 * Prevents a single coordinated group from abusing the report system.
 */
export const MASS_REPORT_UNIQUE_REPORTER_THRESHOLD = 5;

/**
 * Observation window in hours for mass-report detection.
 * Reports from more than MASS_REPORT_UNIQUE_REPORTER_THRESHOLD distinct users
 * within this window trigger the 'mass_report_targeting' fraud signal.
 */
export const MASS_REPORT_WINDOW_HOURS = 24;

/**
 * Evaluate whether a burst of reports constitutes brigading.
 *
 * @param uniqueReporterCount  Number of distinct reporters within the window
 * @param windowHours          Elapsed time in hours being observed
 */
export function isBrigading(
  uniqueReporterCount: number,
  windowHours: number,
): boolean {
  return (
    windowHours <= MASS_REPORT_WINDOW_HOURS &&
    uniqueReporterCount >= MASS_REPORT_UNIQUE_REPORTER_THRESHOLD
  );
}

// ── Fraud severity scoring ────────────────────────────────────────────────────

/**
 * Risk weight contributed by each fraud signal to the account risk score.
 * Weights are additive; capped at 100 by the scoring engine.
 */
export const FRAUD_SIGNAL_WEIGHTS: Record<FraudSignal, number> = {
  device_fingerprint_mismatch: 20,
  swipe_velocity:              10,
  message_velocity:            10,
  doc_upload_abuse:            25,
  chargeback_pattern:          30,
  mass_report_targeting:       15,
  impossible_travel:           20,
  disposable_email:            15,
};

/**
 * Compute an additive fraud risk contribution from a list of active signals.
 * The result is capped at 100.
 *
 * @param activeSignals  Array of currently active FraudSignal values
 */
export function computeFraudRiskContribution(activeSignals: FraudSignal[]): number {
  const raw = activeSignals.reduce(
    (sum, signal) => sum + (FRAUD_SIGNAL_WEIGHTS[signal] ?? 0),
    0,
  );
  return Math.min(raw, 100);
}
