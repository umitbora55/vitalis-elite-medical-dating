/**
 * CommunityGuidelines — Özellik 7: Şeffaf Moderasyon
 *
 * Topluluk kuralları sayfası.
 * Tüm reason code'lar kategorize edilmiş halde.
 * Sıfır tolerans bölümü vurgulanmış.
 * İtiraz süreci açıklaması dahil.
 */

import React, { useState } from 'react';
import {
  Shield,
  AlertTriangle,
  MessageSquareX,
  UserX,
  ImageOff,
  Cpu,
  ChevronDown,
  ChevronUp,
  Scale,
  FileText,
} from 'lucide-react';
import {
  transparentModerationService,
  CATEGORY_LABELS,
} from '../../services/transparentModerationService';
import type { ModerationReasonCategory, ModerationReasonCodeInfo } from '../../types';

// ── Category icon map ──────────────────────────────────────────────────────

const CATEGORY_ICONS: Record<ModerationReasonCategory, React.ReactNode> = {
  harassment:    <MessageSquareX size={16} />,
  scam:          <AlertTriangle size={16} />,
  identity:      <UserX size={16} />,
  content:       <ImageOff size={16} />,
  zero_tolerance:<Shield size={16} />,
  system:        <Cpu size={16} />,
};

const CATEGORY_COLORS: Record<ModerationReasonCategory, string> = {
  harassment:    'text-orange-400 bg-orange-500/10 border-orange-500/25',
  scam:          'text-yellow-400 bg-yellow-500/10 border-yellow-500/25',
  identity:      'text-violet-400 bg-violet-500/10 border-violet-500/25',
  content:       'text-rose-400 bg-rose-500/10 border-rose-500/25',
  zero_tolerance:'text-red-400 bg-red-500/10 border-red-500/25',
  system:        'text-slate-400 bg-slate-500/10 border-slate-500/25',
};

// ── Rule card ──────────────────────────────────────────────────────────────

interface RuleCardProps {
  rule: ModerationReasonCodeInfo;
}
const RuleCard: React.FC<RuleCardProps> = ({ rule }) => {
  const [expanded, setExpanded] = useState(false);
  const colorCls = CATEGORY_COLORS[rule.category];

  const actionLabel: Record<string, string> = {
    warning:  '⚠️ Uyarı',
    temp_ban: '⏳ Geçici Askıya Alma',
    perm_ban: '🚫 Kalıcı Engel',
  };

  return (
    <div className={`rounded-xl border ${colorCls} overflow-hidden`}>
      <button
        onClick={() => setExpanded((p) => !p)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors"
      >
        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-800 ${colorCls.split(' ')[0]}`}>
          {rule.code}
        </span>
        <span className="flex-1 text-sm font-semibold text-slate-200">{rule.title_tr}</span>
        <div className="flex items-center gap-2 flex-shrink-0">
          {rule.is_zero_tolerance && (
            <span className="text-[9px] font-bold text-red-400 bg-red-500/15 border border-red-500/30 px-1.5 py-0.5 rounded-full">
              SIFIR TOLERANS
            </span>
          )}
          <span className="text-[10px] text-slate-500">{actionLabel[rule.typical_action] ?? rule.typical_action}</span>
          {expanded ? <ChevronUp size={12} className="text-slate-500" /> : <ChevronDown size={12} className="text-slate-500" />}
        </div>
      </button>
      {expanded && (
        <div className="px-4 pb-4 space-y-2.5 border-t border-white/5">
          <p className="text-xs text-slate-400 leading-relaxed pt-3">{rule.description_tr}</p>
          <div className="flex items-start gap-2 px-3 py-2 bg-slate-800/50 rounded-lg">
            <span className="text-[10px] text-emerald-400 flex-shrink-0 font-semibold">💡</span>
            <p className="text-[11px] text-slate-400 leading-relaxed">{rule.user_guidance}</p>
          </div>
          {rule.dsa_article && (
            <p className="text-[10px] text-slate-600">{rule.dsa_article}</p>
          )}
        </div>
      )}
    </div>
  );
};

// ── Category section ───────────────────────────────────────────────────────

interface CategorySectionProps {
  category: ModerationReasonCategory;
  rules: ModerationReasonCodeInfo[];
}
const CategorySection: React.FC<CategorySectionProps> = ({ category, rules }) => {
  const [collapsed, setCollapsed] = useState(category !== 'zero_tolerance');
  const colorCls = CATEGORY_COLORS[category];

  return (
    <div className="space-y-2">
      <button
        onClick={() => setCollapsed((p) => !p)}
        className="w-full flex items-center gap-2 text-left"
      >
        <div className={`w-7 h-7 rounded-lg border flex items-center justify-center ${colorCls}`}>
          {CATEGORY_ICONS[category]}
        </div>
        <span className="flex-1 text-sm font-bold text-slate-200">{CATEGORY_LABELS[category]}</span>
        <span className="text-[10px] text-slate-500">{rules.length} kural</span>
        {collapsed ? <ChevronDown size={13} className="text-slate-500" /> : <ChevronUp size={13} className="text-slate-500" />}
      </button>

      {!collapsed && (
        <div className="space-y-1.5 ml-2">
          {rules.map((rule) => <RuleCard key={rule.code} rule={rule} />)}
        </div>
      )}
    </div>
  );
};

// ── Main component ─────────────────────────────────────────────────────────

export interface CommunityGuidelinesProps {
  className?: string;
}

export const CommunityGuidelines: React.FC<CommunityGuidelinesProps> = ({ className = '' }) => {
  const allRules = transparentModerationService.getAllReasonCodes();

  const categories: ModerationReasonCategory[] = [
    'zero_tolerance',
    'harassment',
    'scam',
    'identity',
    'content',
    'system',
  ];

  const byCategory = categories.map((cat) => ({
    cat,
    rules: allRules.filter((r) => r.category === cat),
  })).filter((g) => g.rules.length > 0);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <Shield size={18} className="text-emerald-400" />
        <h2 className="text-base font-bold text-white">Topluluk Kuralları</h2>
      </div>

      {/* Intro */}
      <div className="px-4 py-3.5 bg-emerald-500/8 border border-emerald-500/20 rounded-xl">
        <p className="text-xs text-slate-300 leading-relaxed">
          Vitalis, sağlık çalışanları için güvenli ve saygılı bir ortam sağlamayı taahhüt eder.
          Aşağıdaki kurallar topluluk standartlarımızı tanımlar ve DSA (Dijital Hizmetler Yasası)
          kapsamında şeffaf bir şekilde paylaşılmaktadır.
        </p>
      </div>

      {/* Rule categories */}
      <div className="space-y-5">
        {byCategory.map(({ cat, rules }) => (
          <CategorySection key={cat} category={cat} rules={rules} />
        ))}
      </div>

      {/* Appeal process explanation */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center gap-2">
          <Scale size={15} className="text-blue-400" />
          <h3 className="text-sm font-bold text-slate-200">İtiraz Süreci</h3>
        </div>
        <div className="space-y-2">
          {[
            { step: '1', text: 'Moderasyon bildirimi aldığınızda "İtiraz Et" butonuna tıklayın.' },
            { step: '2', text: 'Kararın neden hatalı olduğunu en az 100 karakterle açıklayın.' },
            { step: '3', text: 'İtirazınız 48 saat içinde bir insan moderatör tarafından incelenir.' },
            { step: '4', text: 'Karar ve gerekçesi size bildirim olarak iletilir.' },
          ].map((item) => (
            <div key={item.step} className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-blue-400">
                {item.step}
              </div>
              <p className="text-xs text-slate-400 leading-relaxed pt-0.5">{item.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* DSA references */}
      <div className="px-4 py-3 bg-slate-800/30 border border-slate-700/30 rounded-xl">
        <div className="flex items-start gap-2">
          <FileText size={12} className="text-slate-500 flex-shrink-0 mt-0.5" />
          <p className="text-[10px] text-slate-500 leading-relaxed">
            Bu kurallar <span className="text-slate-400">Dijital Hizmetler Yasası (DSA)</span>{' '}
            Madde 14, 17 ve 20 kapsamında yayımlanmaktadır.
            Ücretsiz elektronik şikayet hakkınız DSA Madde 20 kapsamında güvence altındadır.
          </p>
        </div>
      </div>
    </div>
  );
};
