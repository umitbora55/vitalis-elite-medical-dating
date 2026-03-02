/**
 * VITALIS Healthcare Verification Service
 *
 * Handles:
 * 1. Turkish healthcare domain lookup & name-email matching
 * 2. Liveness check session management
 * 3. Face embedding comparison
 * 4. Fraud signal recording
 * 5. Risk score calculation
 * 6. Trust badge management
 * 7. Appeal submission
 */

import { supabase } from '../src/lib/supabase';

// ── Types ─────────────────────────────────────────────────────────────────────

export type NameMatchDecision = 'auto_approved' | 'manual_review' | 'rejected';
export type LivenessStatus = 'pending' | 'processing' | 'passed' | 'failed' | 'manual_review' | 'rejected';
export type FraudSignalType =
  | 'duplicate_face' | 'stolen_photo' | 'vpn_detected' | 'datacenter_ip'
  | 'velocity_device' | 'velocity_ip' | 'velocity_phone' | 'ban_evasion'
  | 'deepfake_detected' | 'spoof_detected' | 'name_mismatch';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical' | 'unknown';
export type AppealType =
  | 'liveness_failed' | 'face_mismatch' | 'document_rejected'
  | 'duplicate_detected' | 'account_suspended' | 'other';

export interface HealthcareDomain {
  id: string;
  domain: string;
  institution_name: string;
  institution_type: string;
  city: string | null;
  tier: number;
  is_verified: boolean;
}

export interface NameMatchResult {
  score: number;
  decision: NameMatchDecision;
  details: {
    emailLocal: string;
    normalizedFirst: string;
    normalizedLast: string;
    matchType: string;
  };
}

export interface LivenessCheckSession {
  id: string;
  sessionToken: string;
  status: LivenessStatus;
  livenessScore: number | null;
  challengesCompleted: string[];
  failureReason: string | null;
  attemptCount: number;
}

export interface TrustBadges {
  livenessVerified: boolean;
  livenessVerifiedAt: string | null;
  healthcareVerified: boolean;
  healthcareVerifiedAt: string | null;
  institutionVerified: boolean;
  institutionVerifiedAt: string | null;
  institutionName: string | null;
  photoChangedSinceLiveness: boolean;
}

export interface RiskScores {
  livenessScore: number;
  faceMatchScore: number;
  duplicateRisk: number;
  deviceRisk: number;
  networkRisk: number;
  totalRisk: number;
  riskLevel: RiskLevel;
}

// ── 1. HEALTHCARE DOMAIN LOOKUP ───────────────────────────────────────────────

const normalizeDomainStr = (email: string): string => {
  const idx = email.lastIndexOf('@');
  if (idx === -1) return '';
  return email.slice(idx + 1).toLowerCase().trim();
};

const buildDomainCandidates = (domain: string): string[] => {
  const set = new Set<string>([domain]);
  const parts = domain.split('.');
  for (let i = 0; i < parts.length - 1; i++) {
    const suffix = parts.slice(i).join('.');
    if (suffix.includes('.')) {
      set.add(`*.${suffix}`);
    }
  }
  return Array.from(set);
};

export const lookupHealthcareDomain = async (
  email: string,
): Promise<{ domain: HealthcareDomain | null; error: Error | null }> => {
  const domain = normalizeDomainStr(email);
  if (!domain) return { domain: null, error: new Error('Geçersiz e-posta adresi') };

  const candidates = buildDomainCandidates(domain);

  const { data, error } = await supabase
    .from('healthcare_domains')
    .select('*')
    .in('domain', candidates)
    .eq('is_verified', true)
    .returns<HealthcareDomain[]>();

  if (error) return { domain: null, error: error as unknown as Error };

  const matches = (data || []).filter((row) => {
    if (row.domain.startsWith('*.')) {
      const suffix = row.domain.replace('*.', '');
      return domain === suffix || domain.endsWith(`.${suffix}`);
    }
    return domain === row.domain;
  });

  if (matches.length === 0) return { domain: null, error: null };

  // Best match: highest tier, then longest domain (most specific)
  const best = [...matches].sort((a, b) => {
    if (b.tier !== a.tier) return b.tier - a.tier;
    return b.domain.length - a.domain.length;
  })[0];

  return { domain: best ?? null, error: null };
};

export const requestDomainAddition = async (payload: {
  domain: string;
  institutionName: string;
  institutionType?: string;
  city?: string;
}): Promise<{ error: Error | null }> => {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return { error: new Error('Oturum açık değil') };

  const { error } = await supabase.from('domain_addition_requests').insert({
    user_id: authData.user.id,
    domain: payload.domain.toLowerCase().trim(),
    institution_name: payload.institutionName.trim(),
    institution_type: payload.institutionType ?? 'diger',
    city: payload.city ?? null,
  });

  return { error: error ? (error as unknown as Error) : null };
};

// ── 2. NAME-EMAIL MATCHING ────────────────────────────────────────────────────

const TR_CHAR_MAP: Record<string, string> = {
  'ı': 'i', 'İ': 'i', 'ğ': 'g', 'Ğ': 'g',
  'ü': 'u', 'Ü': 'u', 'ş': 's', 'Ş': 's',
  'ö': 'o', 'Ö': 'o', 'ç': 'c', 'Ç': 'c',
};

const normalizeTurkish = (str: string): string => {
  let result = str.toLowerCase();
  for (const [tr, en] of Object.entries(TR_CHAR_MAP)) {
    result = result.replaceAll(tr, en);
  }
  // Remove special chars except letters
  return result.replace(/[^a-z]/g, '');
};

const levenshtein = (a: string, b: string): number => {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
};

const extractLocalParts = (email: string): string[] => {
  const atIdx = email.lastIndexOf('@');
  if (atIdx === -1) return [];
  const local = email.slice(0, atIdx).toLowerCase();
  // Split on . _ - and normalize
  return local.split(/[._\-]/)
    .map(normalizeTurkish)
    .filter(p => p.length > 0 && !/^\d+$/.test(p)); // Remove pure numeric parts
};

export const matchNameWithEmail = (
  email: string,
  firstName: string,
  lastName: string,
): NameMatchResult => {
  const normFirst = normalizeTurkish(firstName);
  const normLast = normalizeTurkish(lastName);
  const parts = extractLocalParts(email);
  const emailLocal = email.split('@')[0] ?? '';

  if (parts.length === 0) {
    // Numeric-only local part -> can't match
    return {
      score: 0,
      decision: 'rejected',
      details: { emailLocal, normalizedFirst: normFirst, normalizedLast: normLast, matchType: 'numeric_only' },
    };
  }

  let score = 0;
  let matchType = 'no_match';

  // Check each combination
  // Scenario 1: mehmet.yilmaz -> [mehmet, yilmaz] -> exact
  if (parts.includes(normFirst) && parts.includes(normLast)) {
    score = 100;
    matchType = 'full_name_parts';
  }
  // Scenario 2: myilmaz -> first char + last name
  else if (parts.some(p => p === normFirst[0] + normLast || p === normFirst.charAt(0) + normLast)) {
    score = 90;
    matchType = 'initial_lastname';
  }
  // Scenario 3: mehmetm -> first + last initial  OR  mehmet.y
  else if (parts.some(p => p === normFirst + normLast[0])) {
    score = 90;
    matchType = 'firstname_initial_last';
  }
  // Scenario 4: mehmetyilmaz -> concatenated
  else if (parts.some(p => p === normFirst + normLast || p === normLast + normFirst)) {
    score = 95;
    matchType = 'concatenated';
  }
  // Scenario 5: only last name
  else if (parts.some(p => p === normLast)) {
    score = 70;
    matchType = 'lastname_only';
  }
  // Scenario 6: only first name
  else if (parts.some(p => p === normFirst)) {
    score = 65;
    matchType = 'firstname_only';
  }
  // Scenario 7: Levenshtein fuzzy
  else {
    const combined = normFirst + normLast;
    const bestDist = Math.min(
      ...parts.map(p => levenshtein(p, combined)),
      ...parts.map(p => levenshtein(p, normLast)),
      ...parts.map(p => levenshtein(p, normFirst)),
    );
    if (bestDist <= 1) {
      score = 80;
      matchType = 'fuzzy_close';
    } else if (bestDist <= 2) {
      score = 65;
      matchType = 'fuzzy_distant';
    }
  }

  const decision: NameMatchDecision =
    score >= 70 ? 'auto_approved' :
    score >= 50 ? 'manual_review' :
    'rejected';

  return {
    score,
    decision,
    details: { emailLocal, normalizedFirst: normFirst, normalizedLast: normLast, matchType },
  };
};

export const logNameEmailMatch = async (
  email: string,
  firstName: string,
  lastName: string,
  result: NameMatchResult,
): Promise<{ error: Error | null }> => {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return { error: new Error('Oturum açık değil') };

  const { error } = await supabase.from('name_email_match_logs').insert({
    user_id: authData.user.id,
    email,
    first_name: firstName,
    last_name: lastName,
    match_score: result.score,
    match_details: result.details,
    decision: result.decision,
  });

  return { error: error ? (error as unknown as Error) : null };
};

// ── 3. LIVENESS CHECK SESSIONS ────────────────────────────────────────────────

export const createLivenessSession = async (): Promise<{
  session: LivenessCheckSession | null;
  error: Error | null;
}> => {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return { session: null, error: new Error('Oturum açık değil') };

  const { data, error } = await supabase
    .from('liveness_checks')
    .insert({
      user_id: authData.user.id,
      status: 'pending',
      attempt_count: 0,
    })
    .select('id,session_token,status,liveness_score,challenges_completed,failure_reason,attempt_count')
    .single();

  if (error || !data) return { session: null, error: error as unknown as Error ?? new Error('Oturum oluşturulamadı') };

  return {
    session: {
      id: data.id as string,
      sessionToken: data.session_token as string,
      status: data.status as LivenessStatus,
      livenessScore: data.liveness_score as number | null,
      challengesCompleted: (data.challenges_completed as string[]) ?? [],
      failureReason: data.failure_reason as string | null,
      attemptCount: data.attempt_count as number,
    },
    error: null,
  };
};

export const uploadLivenessVideo = async (
  sessionId: string,
  videoBlob: Blob,
): Promise<{ storagePath: string | null; error: Error | null }> => {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return { storagePath: null, error: new Error('Oturum açık değil') };

  const path = `${authData.user.id}/${sessionId}/${Date.now()}.webm`;

  const { error } = await supabase.storage
    .from('liveness-videos')
    .upload(path, videoBlob, { contentType: 'video/webm', upsert: false });

  if (error) return { storagePath: null, error: error as unknown as Error };
  return { storagePath: path, error: null };
};

/**
 * Update liveness session after on-device analysis.
 * Only the authenticated owner of the session may update it.
 * In production, final verdict should be confirmed by a Supabase Edge Function.
 */
export const updateLivenessSession = async (
  sessionId: string,
  update: {
    status: LivenessStatus;
    livenessScore?: number;
    challengesCompleted?: string[];
    failureReason?: string;
    videoStoragePath?: string;
    antiSpoofSignals?: Record<string, unknown>;
  },
): Promise<{ error: Error | null }> => {
  // Auth check — only the session owner may update their own liveness record.
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return { error: new Error('Oturum açık değil') };
  }

  const { error } = await supabase
    .from('liveness_checks')
    .update({
      status: update.status,
      liveness_score: update.livenessScore ?? null,
      challenges_completed: update.challengesCompleted ?? [],
      failure_reason: update.failureReason ?? null,
      video_storage_path: update.videoStoragePath ?? null,
      anti_spoof_signals: update.antiSpoofSignals ?? null,
      completed_at: ['passed', 'failed', 'rejected'].includes(update.status) ? new Date().toISOString() : null,
    })
    .eq('id', sessionId)
    .eq('user_id', authData.user.id); // Prevent cross-user update

  return { error: error ? (error as unknown as Error) : null };
};

export const getLivenessSession = async (
  sessionId: string,
): Promise<{ session: LivenessCheckSession | null; error: Error | null }> => {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return { session: null, error: new Error('Oturum açık değil') };

  const { data, error } = await supabase
    .from('liveness_checks')
    .select('id,session_token,status,liveness_score,challenges_completed,failure_reason,attempt_count')
    .eq('id', sessionId)
    .eq('user_id', authData.user.id)
    .single();

  if (error || !data) return { session: null, error: error as unknown as Error ?? new Error('Oturum bulunamadı') };

  return {
    session: {
      id: data.id as string,
      sessionToken: data.session_token as string,
      status: data.status as LivenessStatus,
      livenessScore: data.liveness_score as number | null,
      challengesCompleted: (data.challenges_completed as string[]) ?? [],
      failureReason: data.failure_reason as string | null,
      attemptCount: data.attempt_count as number,
    },
    error: null,
  };
};

// ── 4. TRUST BADGES ──────────────────────────────────────────────────────────

export const getTrustBadges = async (): Promise<{
  badges: TrustBadges | null;
  error: Error | null;
}> => {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return { badges: null, error: new Error('Oturum açık değil') };

  const { data, error } = await supabase
    .from('user_trust_badges')
    .select('*')
    .eq('user_id', authData.user.id)
    .maybeSingle();

  if (error) return { badges: null, error: error as unknown as Error };

  if (!data) {
    return {
      badges: {
        livenessVerified: false,
        livenessVerifiedAt: null,
        healthcareVerified: false,
        healthcareVerifiedAt: null,
        institutionVerified: false,
        institutionVerifiedAt: null,
        institutionName: null,
        photoChangedSinceLiveness: false,
      },
      error: null,
    };
  }

  return {
    badges: {
      livenessVerified: Boolean(data.liveness_verified),
      livenessVerifiedAt: (data.liveness_verified_at as string) ?? null,
      healthcareVerified: Boolean(data.healthcare_verified),
      healthcareVerifiedAt: (data.healthcare_verified_at as string) ?? null,
      institutionVerified: Boolean(data.institution_verified),
      institutionVerifiedAt: (data.institution_verified_at as string) ?? null,
      institutionName: (data.institution_name as string) ?? null,
      photoChangedSinceLiveness: Boolean(data.photo_changed_since_liveness),
    },
    error: null,
  };
};

// ── 5. RISK SCORES ────────────────────────────────────────────────────────────

export const getUserRiskScores = async (): Promise<{
  scores: RiskScores | null;
  error: Error | null;
}> => {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return { scores: null, error: new Error('Oturum açık değil') };

  const { data, error } = await supabase
    .from('user_risk_scores')
    .select('*')
    .eq('user_id', authData.user.id)
    .maybeSingle();

  if (error) return { scores: null, error: error as unknown as Error };
  if (!data) return { scores: null, error: null };

  return {
    scores: {
      livenessScore: data.liveness_score as number,
      faceMatchScore: data.face_match_score as number,
      duplicateRisk: data.duplicate_risk as number,
      deviceRisk: data.device_risk as number,
      networkRisk: data.network_risk as number,
      totalRisk: data.total_risk as number,
      riskLevel: data.risk_level as RiskLevel,
    },
    error: null,
  };
};

// ── 6. FRAUD SIGNALS ──────────────────────────────────────────────────────────

export const recordFraudSignal = async (
  userId: string,
  signalType: FraudSignalType,
  severity: 'low' | 'medium' | 'high' | 'critical',
  details?: Record<string, unknown>,
): Promise<{ error: Error | null }> => {
  // Auth check — only authenticated sessions may record fraud signals.
  // Signals about OTHER users (e.g. duplicate face detection) are written
  // by the system on behalf of the caller; RLS on fraud_signals restricts
  // INSERT to service-role or the authenticated user's own record.
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return { error: new Error('Oturum açık değil') };
  }

  // Prevent a regular user from framing another user with arbitrary signals.
  // Only self-signals are allowed from the client; admin signals use service role.
  if (userId !== authData.user.id) {
    return { error: new Error('Başka bir kullanıcı adına sinyal kaydedilemez') };
  }

  const { error } = await supabase.from('fraud_signals').insert({
    user_id: userId,
    signal_type: signalType,
    severity,
    details: details ?? null,
    detected_by: authData.user.id,
  });

  return { error: error ? (error as unknown as Error) : null };
};

// ── 7. APPEALS ────────────────────────────────────────────────────────────────

export const submitAppeal = async (payload: {
  appealType: AppealType;
  description?: string;
  additionalDocPath?: string;
}): Promise<{ appealId: string | null; error: Error | null }> => {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return { appealId: null, error: new Error('Oturum açık değil') };

  const { data, error } = await supabase
    .from('verification_appeals')
    .insert({
      user_id: authData.user.id,
      appeal_type: payload.appealType,
      description: payload.description ?? null,
      additional_doc_path: payload.additionalDocPath ?? null,
    })
    .select('id')
    .single();

  if (error || !data) return { appealId: null, error: error as unknown as Error ?? new Error('İtiraz gönderilemedi') };
  return { appealId: data.id as string, error: null };
};

export const getUserAppeals = async (): Promise<{
  appeals: {
    id: string;
    appealType: AppealType;
    status: string;
    createdAt: string;
    slaDate: string;
  }[];
  error: Error | null;
}> => {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return { appeals: [], error: new Error('Oturum açık değil') };

  const { data, error } = await supabase
    .from('verification_appeals')
    .select('id,appeal_type,status,created_at,sla_due_at')
    .eq('user_id', authData.user.id)
    .order('created_at', { ascending: false });

  if (error) return { appeals: [], error: error as unknown as Error };

  return {
    appeals: (data ?? []).map((row) => ({
      id: row.id as string,
      appealType: row.appeal_type as AppealType,
      status: row.status as string,
      createdAt: row.created_at as string,
      slaDate: row.sla_due_at as string,
    })),
    error: null,
  };
};

export const uploadAppealDocument = async (
  file: File,
  appealId: string,
): Promise<{ storagePath: string | null; error: Error | null }> => {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return { storagePath: null, error: new Error('Oturum açık değil') };

  const allowed = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
  if (!allowed.has(file.type)) return { storagePath: null, error: new Error('Desteklenmeyen format') };
  if (file.size > 10 * 1024 * 1024) return { storagePath: null, error: new Error('Dosya 10 MB\'dan büyük olamaz') };

  const safe = file.name.toLowerCase().replace(/[^a-z0-9.\-_]/g, '-').slice(0, 100);
  const path = `${authData.user.id}/${appealId}/${Date.now()}-${safe}`;

  const { error } = await supabase.storage
    .from('verification-docs')
    .upload(path, file, { contentType: file.type, upsert: false });

  return { storagePath: error ? null : path, error: error ? (error as unknown as Error) : null };
};
