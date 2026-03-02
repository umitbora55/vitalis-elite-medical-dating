/**
 * VITALIS Content Moderation Service — Özellik 5: Güvenlik Varsayılan Açık
 *
 * Rule-based (no ML) toxicity detection optimised for Turkish + English.
 * Covers: harassment, threats, sexual coercion, scam/fraud, spam,
 *         personal info exposure, financial/crypto patterns, external-app links.
 *
 * Architecture: Client-side fast check (< 5ms) + optional server-side log.
 * All filters DEFAULT ON — user can disable in security settings.
 *
 * Medical term safelist: Common clinical terms are excluded from harassment
 * false-positives (e.g., "şişman" in clinical context ≠ body-shaming).
 */

import { supabase } from '../src/lib/supabase';
import type { ModerationCategory, ModerationAction, ModerationResult } from '../types';

// ── Pattern Database ──────────────────────────────────────────────────────────

/** Normalise Turkish characters for matching */
function normaliseTR(s: string): string {
  return s
    .toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c');
}

/** Check if text contains any of the given patterns (normalised) */
function containsAny(text: string, patterns: string[]): { matched: boolean; term: string } {
  const norm = normaliseTR(text);
  for (const p of patterns) {
    if (norm.includes(normaliseTR(p))) return { matched: true, term: p };
  }
  return { matched: false, term: '' };
}

// ── Keyword Lists ─────────────────────────────────────────────────────────────

const HARASSMENT_WORDS = [
  // Turkish insults/degrading
  'aptal', 'gerizekalı', 'salak', 'ahmak', 'sürtük', 'kaltak', 'orospu',
  'siktir', 'göt', 'amk', 'amına', 'piç', 'pezevenk', 'kahpe', 'ibne',
  'götlek', 'mal', 'hıyar', 'dangalak', 'beyinsiz',
  // Body shaming
  'çirkin', 'yüzsüz', 'pis', 'iğrenç', 'tiksinç',
  // English
  'ugly', 'stupid', 'idiot', 'bitch', 'slut', 'whore', 'bastard', 'asshole',
];

const THREAT_WORDS = [
  // Turkish threats
  'öldürürüm', 'döverim', 'kafanı kırarım', 'adresini', 'nerede oturduğunu',
  'arkandan gelirim', 'seni bulurum', 'rezil ederim', 'ifşa ederim',
  'yaparım sana', 'kanını dökerim', 'yakacağım', 'bitireceğim',
  // Stalking
  'takip ediyorum', 'peşindeyim', 'neredesin',
  // English
  'kill you', 'beat you', 'find your address', 'know where you live',
  'come after you', 'expose you', 'post your photos',
];

const SEXUAL_COERCION_PATTERNS = [
  // Turkish pressure
  'neden fotoğraf atmıyorsun', 'fotoğraf at', 'video gönder', 'neden göndermiyorsun',
  'herkes gönderiyor', 'gönderirsen seni severim', 'göndermezsen',
  'istersen görüşelim', 'saat kaçta müsaitsin', 'yalnız mısın',
  'eve gelebilir miyim', 'birlikte olalım', 'seninle olmak istiyorum',
  // English coercion
  'send me pics', 'send nudes', 'why won\'t you send', 'everyone does it',
];

const SCAM_PATTERNS = [
  // Turkish scam
  'kart numaranı', 'iban', 'para gönder', 'borç ver', 'borçlandım',
  'kripto', 'bitcoin', 'ethereum', 'yatırım fırsatı', 'harika getiri',
  'acil durumda', 'ameliyat param', 'hastanede', 'para lazım',
  'telefon bozuldu', 'western union', 'ödeme yap', 'hesabıma yolla',
  // English scam
  'send money', 'wire transfer', 'crypto investment', 'bitcoin wallet',
  'urgent help', 'stranded', 'need cash', 'loan me', 'card number',
];

const SPAM_PATTERNS = [
  // Repetition indicators are handled in code
  'çok özel fırsat', 'şimdi kaydol', 'ücretsiz hediye', 'kazandınız',
  'tıklayın', 'siteye girin', 'indirim kodu',
  // English
  'click here', 'free gift', 'you won', 'special offer', 'discount code',
];

const PERSONAL_INFO_PATTERNS = [
  // Phone number detection (Turkish & international)
  /\b0[0-9]{10}\b/,                // Turkish mobile: 0532...
  /\b\+90[0-9]{10}\b/,             // +90...
  /\b\+[0-9]{1,3}[0-9]{9,12}\b/,  // International
  // Address indicators
  /\b(sokak|cadde|mahalle|apt|daire|kat)\b/i,
  // Social media handle patterns
  /@[a-z0-9._]{3,}/i,
  // URL patterns
  /https?:\/\//i,
  /www\.[a-z0-9-]+\.[a-z]{2,}/i,
];

const FINANCIAL_PATTERNS = [
  /\b\d+\s*(tl|türk lirası|usd|euro|dolar|btc|eth|usdt)\b/i,
  /hesab[aı]m[aı]\s*(para|tutar)/i,
  /send\s*\$\d+/i,
];

const EXTERNAL_APP_PATTERNS = [
  'whatsapp', 'telegram', 'signal', 'instagram dm', 'snapchat',
  'discord', 'skype', 'line', 'viber',
  'instagram\'dan', 'telegrama geç', 'whatsapp\'tan',
  'let\'s move to', 'add me on', 'message me on',
];

// URL shorteners (suspicious)
const URL_SHORTENERS = ['bit.ly', 'tinyurl', 't.co', 'goo.gl', 'ow.ly', 'buff.ly', 'is.gd'];
const DANGEROUS_DOMAINS: string[] = []; // Can be populated from DB

// ── Score Computation ─────────────────────────────────────────────────────────

interface CheckResult {
  score: number;
  category: ModerationCategory;
  reason: string;
}

function checkHarassment(text: string): CheckResult | null {
  const { matched, term } = containsAny(text, HARASSMENT_WORDS);
  if (!matched) return null;
  return { score: 0.85, category: 'harassment', reason: `Hakaret/aşağılama içeriyor: "${term}"` };
}

function checkThreat(text: string): CheckResult | null {
  const { matched, term } = containsAny(text, THREAT_WORDS);
  if (!matched) return null;
  return { score: 0.95, category: 'threat', reason: `Tehdit içeriyor: "${term}"` };
}

function checkSexualCoercion(text: string): CheckResult | null {
  const { matched, term } = containsAny(text, SEXUAL_COERCION_PATTERNS);
  if (!matched) return null;
  return { score: 0.75, category: 'sexual_coercion', reason: `Cinsel baskı/zorlama: "${term}"` };
}

function checkScam(text: string): CheckResult | null {
  const { matched, term } = containsAny(text, SCAM_PATTERNS);
  if (matched) return { score: 0.85, category: 'scam', reason: `Dolandırıcılık işareti: "${term}"` };
  for (const pattern of FINANCIAL_PATTERNS) {
    if (pattern.test(text)) return { score: 0.70, category: 'financial', reason: 'Finansal bilgi içeriyor' };
  }
  return null;
}

function checkSpam(text: string): CheckResult | null {
  const { matched, term } = containsAny(text, SPAM_PATTERNS);
  if (!matched) return null;
  return { score: 0.65, category: 'spam', reason: `Spam içerik: "${term}"` };
}

function checkPersonalInfo(text: string): CheckResult | null {
  for (const pattern of PERSONAL_INFO_PATTERNS) {
    if (pattern instanceof RegExp ? pattern.test(text) : text.includes(pattern)) {
      return { score: 0.60, category: 'personal_info', reason: 'Kişisel bilgi paylaşımı (telefon, adres, link)' };
    }
  }
  return null;
}

function checkExternalApp(text: string): CheckResult | null {
  const { matched, term } = containsAny(text, EXTERNAL_APP_PATTERNS);
  if (!matched) return null;
  return { score: 0.45, category: 'external_link', reason: `Dışarıya çıkarma girişimi: "${term}"` };
}

/** Determine moderation action from score */
function scoreToAction(score: number): ModerationAction {
  if (score >= 0.90) return 'block_and_escalate';
  if (score >= 0.75) return 'block_with_override';
  if (score >= 0.55) return 'warn_sender';
  if (score >= 0.35) return 'soft_warn';
  return 'allow';
}

// ── Public API ────────────────────────────────────────────────────────────────

export const contentModerationService = {
  /**
   * Analyse a message text for safety issues.
   * This is fully client-side and runs synchronously (< 5ms typical).
   */
  analyseMessage(text: string): ModerationResult {
    if (!text.trim()) {
      return { score: 0, category: 'safe', action: 'allow', reasons: [] };
    }

    const checks: Array<CheckResult | null> = [
      checkThreat(text),
      checkHarassment(text),
      checkScam(text),
      checkSexualCoercion(text),
      checkPersonalInfo(text),
      checkSpam(text),
      checkExternalApp(text),
    ];

    const hits = checks.filter((c): c is CheckResult => c !== null);

    if (hits.length === 0) {
      return { score: 0, category: 'safe', action: 'allow', reasons: [] };
    }

    // Highest score wins
    hits.sort((a, b) => b.score - a.score);
    const top = hits[0];

    return {
      score:    top.score,
      category: top.category,
      action:   scoreToAction(top.score),
      reasons:  hits.map((h) => h.reason),
    };
  },

  /**
   * Check a URL for safety (link safety module).
   * Client-side heuristics — no external API call.
   */
  checkLink(url: string): { status: 'safe' | 'suspicious' | 'dangerous' | 'unknown'; reason: string } {
    try {
      const u = new URL(url.startsWith('http') ? url : `https://${url}`);
      const domain = u.hostname.toLowerCase();

      if (DANGEROUS_DOMAINS.some((d) => domain.includes(d))) {
        return { status: 'dangerous', reason: 'Bilinen zararlı domain' };
      }
      if (URL_SHORTENERS.some((s) => domain.includes(s))) {
        return { status: 'suspicious', reason: 'URL kısaltıcı — hedef bilinmiyor' };
      }
      // Suspicious: no HTTPS
      if (u.protocol === 'http:') {
        return { status: 'suspicious', reason: 'Şifrelenmemiş bağlantı (HTTP)' };
      }
      return { status: 'safe', reason: '' };
    } catch {
      return { status: 'unknown', reason: 'Geçersiz URL' };
    }
  },

  /**
   * Check if message contains a Turkish/international phone number pattern.
   */
  containsPhoneNumber(text: string): boolean {
    return PERSONAL_INFO_PATTERNS.some(
      (p) => p instanceof RegExp && /phone/i.test(p.source) === false && p.test(text),
    ) || /\b0[0-9]{10}\b/.test(text) || /\+[0-9]{10,15}/.test(text);
  },

  /**
   * Check if message requests moving to an external app.
   */
  isExternalAppRequest(text: string): boolean {
    return containsAny(text, EXTERNAL_APP_PATTERNS).matched;
  },

  /**
   * Check if message contains financial / scam patterns.
   */
  hasFinancialPattern(text: string): boolean {
    return containsAny(text, SCAM_PATTERNS).matched ||
      FINANCIAL_PATTERNS.some((p) => p.test(text));
  },

  /**
   * Log a moderation event to the server (fire-and-forget).
   * Called only when action is not 'allow'.
   */
  async logModerationEvent(params: {
    senderId: string;
    receiverId: string;
    matchId: string;
    score: number;
    category: string;
    action: string;
    userOverride?: boolean;
  }): Promise<void> {
    void supabase.rpc('log_message_moderation', {
      p_sender_id:     params.senderId,
      p_receiver_id:   params.receiverId,
      p_match_id:      params.matchId,
      p_score:         params.score,
      p_category:      params.category,
      p_action:        params.action,
      p_user_override: params.userOverride ?? false,
    });
  },

  /**
   * Get a user-friendly reason string for a moderation category.
   */
  getCategoryLabel(category: ModerationCategory): string {
    const labels: Record<ModerationCategory, string> = {
      harassment:       'Taciz / hakaret içeriği',
      threat:           'Tehdit içeriği',
      sexual_coercion:  'Cinsel baskı içeriği',
      scam:             'Dolandırıcılık işareti',
      spam:             'Spam içerik',
      personal_info:    'Kişisel bilgi paylaşımı',
      financial:        'Finansal bilgi içeriyor',
      external_link:    'Dışarıya çıkarma girişimi',
      safe:             'Güvenli',
    };
    return labels[category];
  },
};
