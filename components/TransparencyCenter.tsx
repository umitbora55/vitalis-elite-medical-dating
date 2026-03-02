/**
 * VITALIS Transparency Center
 * DSA Article 27 — Recommender System Transparency
 *
 * Kullanıcıya öneri sisteminin nasıl çalıştığını açıklar.
 * Kullanılmayan veriler, kullanıcı hakları ve opt-out seçeneği gösterilir.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown, ChevronUp, ShieldCheck, User, RefreshCcw,
  X, BookOpen, Heart, BarChart3, EyeOff
} from 'lucide-react';
import { FACTOR_META } from '../services/explanationService';
import type { FactorKey } from '../services/explanationService';

// ── Types ─────────────────────────────────────────────────────────────────────

interface SectionProps {
  id: string;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

// ── Section (collapsible) ──────────────────────────────────────────────────────

const Section: React.FC<SectionProps> = ({ id, title, icon, children, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-xl border border-slate-700/50 overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-800/70 text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-slate-400">{icon}</span>
          <span className="text-sm font-semibold text-white">{title}</span>
        </div>
        {open
          ? <ChevronUp className="w-4 h-4 text-slate-500 shrink-0" />
          : <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
        }
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            key={`${id}-body`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 py-3 bg-slate-900/40 text-sm text-slate-300 space-y-2">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Bullet item ───────────────────────────────────────────────────────────────

const Bullet: React.FC<{ icon?: string; label: string; sub?: string }> = ({ icon, label, sub }) => (
  <div className="flex items-start gap-2">
    <span className="text-base shrink-0 w-5">{icon ?? '•'}</span>
    <div>
      <span className="text-sm text-white">{label}</span>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </div>
  </div>
);

// ── Main Component ─────────────────────────────────────────────────────────────

interface Props {
  onClose?: () => void;
  onNavigateToSettings?: () => void;
}

export const TransparencyCenter: React.FC<Props> = ({ onClose, onNavigateToSettings }) => {
  const allFactors = Object.entries(FACTOR_META) as [FactorKey, typeof FACTOR_META[FactorKey]][];

  return (
    <div className="flex flex-col h-full bg-slate-950 text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-blue-400" />
          <div>
            <h1 className="text-base font-bold text-white">Öneriler Nasıl Çalışır?</h1>
            <p className="text-xs text-slate-400">DSA Madde 27 Şeffaflık Merkezi</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">

        {/* Intro */}
        <div className="px-4 py-3 bg-blue-900/20 border border-blue-700/30 rounded-xl">
          <p className="text-sm text-blue-200 leading-relaxed">
            Vitalis, size önerdiği profillerde hangi faktörleri kullandığını şeffaf biçimde
            açıklamakla yükümlüdür. Aşağıda tüm süreci ayrıntılı bulabilirsiniz.
          </p>
        </div>

        {/* What we use */}
        <Section id="uses" title="Kullandığımız Bilgiler" icon={<User className="w-4 h-4" />} defaultOpen>
          <p className="text-xs text-slate-400 mb-3">
            Öneriler yalnızca aşağıdaki bilgilere dayanır — bunların tamamını siz profilinizde
            paylaşmışsınızdır:
          </p>
          {allFactors.map(([key, meta]) => (
            <Bullet
              key={key}
              icon={meta.icon}
              label={meta.label}
              sub={meta.description}
            />
          ))}
        </Section>

        {/* Interaction signals */}
        <Section id="interaction" title="Etkileşim Sinyalleri" icon={<RefreshCcw className="w-4 h-4" />}>
          <Bullet icon="👍" label="Beğendiğiniz profiller" sub="Hangi faktörlerin eşleştiğini pozitif sinyal olarak kullanırız." />
          <Bullet icon="👎" label="Geçtiğiniz profiller" sub="Hangi faktörlerin eşleşmediğini negatif sinyal olarak kullanırız." />
          <Bullet icon="⚙️" label="Faktör geri bildirimleriniz" sub='"Daha fazla bunun gibi" ve "Daha az bunun gibi" butonları faktör ağırlıklarınızı günceller.' />
          <Bullet icon="🎛️" label="Manuel ağırlık ayarları" sub="Ayarlar > Eşleşme Tercihlerim bölümünden her faktörü kontrol edebilirsiniz." />
        </Section>

        {/* NOT used */}
        <Section id="notused" title="Kullanmadığımız Veriler" icon={<EyeOff className="w-4 h-4" />}>
          <div className="space-y-1.5">
            <Bullet icon="❌" label="Fotoğraf analizi veya yüzden çıkarım" />
            <Bullet icon="❌" label="Siyasi görüş veya inanç çıkarımı" />
            <Bullet icon="❌" label="Gelir veya sosyoekonomik tahmin" />
            <Bullet icon="❌" label="Konum geçmişi veya hareket analizi" />
            <Bullet icon="❌" label="Üçüncü parti veri satın alımı" />
            <Bullet icon="❌" label="Aktif olduğunuz saat analizi (gece/gündüz)" />
            <Bullet icon="❌" label="Embedding benzerlik skoru gösterimi" />
          </div>
        </Section>

        {/* User rights */}
        <Section id="rights" title="Haklarınız" icon={<BookOpen className="w-4 h-4" />}>
          <Bullet icon="👁️" label="Neden bu öneriyi aldığımı görebilirim" sub="Her profil kartinda Neden onerildi? baglantisi mevcuttur." />
          <Bullet icon="🎛️" label="Faktörleri değiştirebilirim" sub="Ayarlar &gt; Eşleşme Tercihlerim bölümünden her faktörü açabilir, kapatabilir veya ağırlığını ayarlayabilirsiniz." />
          <Bullet icon="🔕" label="Kişiselleştirilmiş öneriyi kapatabilirim" sub="Ayarları kapatırsanız yalnızca yaş, cinsiyet ve konum filtreleri uygulanır." />
          <Bullet icon="🗑️" label="Verilerimi silebilirim" sub="Hesabı sil seçeneği tüm profilinizi, eşleşmelerinizi ve tercihlerinizi kalıcı olarak siler." />
          <Bullet icon="📧" label="Veri taşıma hakkım vardır" sub="Destek ekibiyle iletişime geçerek verilerinizin bir kopyasını talep edebilirsiniz." />
        </Section>

        {/* Scoring */}
        <Section id="score" title="Uyumluluk Skoru" icon={<BarChart3 className="w-4 h-4" />}>
          <p className="text-xs text-slate-400 mb-2">
            Profil kartındaki % skoru aşağıdaki faktörlerin ağırlıklı toplamından oluşur:
          </p>
          <div className="space-y-1">
            {[
              { label: 'Ortak İlgi Alanları', weight: '%20' },
              { label: 'Çalışma Düzeni Uyumu', weight: '%15' },
              { label: 'Konum Yakınlığı', weight: '%15' },
              { label: 'Meslek Uyumu', weight: '%10' },
              { label: 'İlişki Amacı Uyumu', weight: '%10' },
              { label: 'Profil Tamamlanma', weight: '%10' },
              { label: 'Yaşam Tarzı Uyumu', weight: '%10' },
              { label: 'Kariyer Aşaması', weight: '%10' },
            ].map(r => (
              <div key={r.label} className="flex items-center justify-between text-xs">
                <span className="text-slate-400">{r.label}</span>
                <span className="text-slate-300 font-medium">{r.weight}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Minimum skor 45%, maksimum 99%'dir (UX nedeniyle düşük skor gösterilmez).
          </p>
        </Section>

        {/* Preferences CTA */}
        {onNavigateToSettings && (
          <div className="mt-2 px-4 py-3 bg-slate-800/50 rounded-xl border border-slate-700/40 flex items-center gap-3">
            <Heart className="w-5 h-5 text-rose-400 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-white">Tercihlerinizi ayarlayın</p>
              <p className="text-xs text-slate-400">Hangi faktörlerin önemli olduğuna siz karar verin.</p>
            </div>
            <button
              onClick={onNavigateToSettings}
              className="text-xs font-semibold text-blue-400 hover:text-blue-300 shrink-0"
            >
              Aç →
            </button>
          </div>
        )}

        {/* Legal note */}
        <p className="text-[10px] text-slate-700 text-center pb-2 leading-relaxed">
          Bu sayfa Digital Services Act (AB 2022/2065) Madde 27 kapsamında hazırlanmıştır.
          Şikâyet için: support@vitalis.app
        </p>
      </div>
    </div>
  );
};
