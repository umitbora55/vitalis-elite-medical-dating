/**
 * DateSafetyPanel — Özellik 4: Date Odaklı Akış
 *
 * Bottom-sheet panel that surfaces safety features before/during a date:
 *   • Share date details via WhatsApp, SMS, or clipboard
 *   • View/manage trusted contacts
 *   • Trigger SOS (last-resort emergency button)
 *   • Resolve / mark false-alarm on active alerts
 *
 * Designed to be opened from DatePlanCard or a persistent "Shield" FAB in chat.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Shield, Share2, Phone, UserPlus, AlertTriangle, CheckCircle2, X,
  MessageCircle, Copy, ChevronRight, Trash2, Star, Loader2,
} from 'lucide-react';
import type { DatePlan } from '../services/datePlanService';
import type { TrustedContact, SafetyAlert } from '../types';
import {
  dateSafetyService,
  buildShareText,
  shareViaWhatsApp,
  shareViaSMS,
  copyShareText,
} from '../services/dateSafetyService';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DateSafetyPanelProps {
  plan: DatePlan;
  partnerName: string;
  onClose: () => void;
}

type PanelView = 'main' | 'share' | 'contacts' | 'add_contact' | 'sos_confirm';

// ── Contact Form ──────────────────────────────────────────────────────────────

interface ContactFormState {
  name: string;
  phone: string;
  relation: string;
  isPrimary: boolean;
}

const INITIAL_FORM: ContactFormState = { name: '', phone: '', relation: 'friend', isPrimary: false };

const RELATION_OPTIONS = [
  { value: 'friend',    label: '👫 Arkadaş' },
  { value: 'family',   label: '👨‍👩‍👦 Aile' },
  { value: 'colleague', label: '🩺 İş Arkadaşı' },
];

// ── Main Component ────────────────────────────────────────────────────────────

export const DateSafetyPanel: React.FC<DateSafetyPanelProps> = ({ plan, partnerName, onClose }) => {
  const [view, setView] = useState<PanelView>('main');
  const [contacts, setContacts] = useState<TrustedContact[]>([]);
  const [alerts, setAlerts] = useState<SafetyAlert[]>([]);
  const [contactForm, setContactForm] = useState<ContactFormState>(INITIAL_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [isSos, setIsSos] = useState(false);
  const [sosError, setSosError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Build share payload from plan
  const sharePayload = {
    partnerName,
    venue: plan.location ?? 'Belirsiz mekan',
    dateTime: plan.selected_time ?? new Date().toISOString(),
  };
  const shareText = buildShareText(sharePayload);

  // ── Load data ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    void dateSafetyService.getTrustedContacts().then(setContacts);
    void dateSafetyService.getActiveAlerts().then(setAlerts);
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────────

  const handleCopy = useCallback(async () => {
    const ok = await copyShareText(shareText);
    if (ok) {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2500);
    }
  }, [shareText]);

  const handleAddContact = useCallback(async () => {
    setFormError(null);
    if (!contactForm.name.trim()) { setFormError('İsim zorunlu.'); return; }
    if (!contactForm.phone.trim()) { setFormError('Telefon zorunlu.'); return; }

    setIsSaving(true);
    try {
      await dateSafetyService.addTrustedContact({
        name:      contactForm.name.trim(),
        phone:     contactForm.phone.trim(),
        relation:  contactForm.relation,
        isPrimary: contactForm.isPrimary,
      });
      const updated = await dateSafetyService.getTrustedContacts();
      setContacts(updated);
      setContactForm(INITIAL_FORM);
      setView('contacts');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Kişi eklenemedi.');
    } finally {
      setIsSaving(false);
    }
  }, [contactForm]);

  const handleRemoveContact = useCallback(async (id: string) => {
    try {
      await dateSafetyService.removeTrustedContact(id);
      setContacts((prev) => prev.filter((c) => c.id !== id));
    } catch { /* silent */ }
  }, []);

  const handleSOS = useCallback(async () => {
    setIsSos(true);
    setSosError(null);
    try {
      const loc = await dateSafetyService.getCurrentLocation();
      await dateSafetyService.triggerSOS({
        planId: plan.id,
        lat:    loc?.lat,
        lng:    loc?.lng,
      });
      const updated = await dateSafetyService.getActiveAlerts();
      setAlerts(updated);
      setView('main');
    } catch (err) {
      // SOS failure must be visible — user needs to know to call emergency services directly.
      const message = err instanceof Error ? err.message : 'SOS gönderilemedi.';
      setSosError(`${message} — Lütfen 112'yi arayın.`);
    } finally {
      setIsSos(false);
    }
  }, [plan.id]);

  const handleResolveAlert = useCallback(async (alertId: string) => {
    try {
      await dateSafetyService.resolveAlert(alertId);
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    } catch { /* silent */ }
  }, []);

  // ── Active SOS indicator ──────────────────────────────────────────────────────

  const activeSOSAlerts = alerts.filter((a) => a.alert_type === 'sos');

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/90 backdrop-blur-xl">
      <div className="w-full sm:max-w-sm bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col max-h-[88vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 flex-shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            {view !== 'main' && (
              <button onClick={() => { setView('main'); setFormError(null); }} className="btn-icon -ml-1">
                <X size={18} className="text-slate-400" />
              </button>
            )}
            <Shield size={20} className={activeSOSAlerts.length > 0 ? 'text-red-400' : 'text-emerald-400'} />
            <h2 className="text-base font-semibold text-white">
              {view === 'main'        && 'Date Güvenliği'}
              {view === 'share'       && 'Konumu Paylaş'}
              {view === 'contacts'    && 'Güvenilir Kişiler'}
              {view === 'add_contact' && 'Kişi Ekle'}
              {view === 'sos_confirm' && 'SOS Gönder'}
            </h2>
          </div>
          {view === 'main' && (
            <button onClick={onClose} className="btn-icon text-slate-500 hover:text-white hover:bg-slate-800">
              <X size={20} />
            </button>
          )}
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* ── Main View ─────────────────────────────────────────────────────── */}
          {view === 'main' && (
            <>
              {/* Active SOS Alert Banner */}
              {activeSOSAlerts.length > 0 && (
                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={16} className="text-red-400" />
                    <p className="text-sm font-semibold text-red-300">Aktif SOS Uyarısı</p>
                  </div>
                  <p className="text-xs text-red-400/80">
                    Güvenilir kişilerin bilgilendirildi. Güvendeysen uyarıyı çöz.
                  </p>
                  {activeSOSAlerts.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => handleResolveAlert(a.id)}
                      className="w-full py-2 rounded-xl bg-red-500/20 border border-red-500/30 text-xs font-semibold text-red-300 hover:bg-red-500/30 transition-colors"
                    >
                      <CheckCircle2 size={12} className="inline mr-1.5" />
                      Güvendeyim – Uyarıyı Çöz
                    </button>
                  ))}
                </div>
              )}

              {/* Date info summary */}
              <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700">
                <p className="text-xs text-slate-500 mb-1">Buluşma bilgisi</p>
                <p className="text-sm font-semibold text-white">{partnerName} ile buluşma</p>
                {plan.location && <p className="text-xs text-slate-400 mt-0.5">📍 {plan.location}</p>}
                {plan.selected_time && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    🕐 {new Date(plan.selected_time).toLocaleString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>

              {/* Safety actions */}
              <div className="space-y-2">
                <button
                  onClick={() => setView('share')}
                  className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 hover:border-slate-600 hover:bg-slate-800 transition-all text-left"
                >
                  <Share2 size={20} className="text-blue-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">Konumu Paylaş</p>
                    <p className="text-xs text-slate-500">WhatsApp, SMS veya kopyala</p>
                  </div>
                  <ChevronRight size={16} className="text-slate-600" />
                </button>

                <button
                  onClick={() => setView('contacts')}
                  className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 hover:border-slate-600 hover:bg-slate-800 transition-all text-left"
                >
                  <Phone size={20} className="text-emerald-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">Güvenilir Kişiler</p>
                    <p className="text-xs text-slate-500">
                      {contacts.length > 0 ? `${contacts.length} kişi tanımlı` : 'Henüz kişi eklenmedi'}
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-slate-600" />
                </button>

                <button
                  onClick={() => setView('sos_confirm')}
                  className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl bg-red-500/8 border border-red-500/20 hover:bg-red-500/15 hover:border-red-500/40 transition-all text-left"
                >
                  <AlertTriangle size={20} className="text-red-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-red-300">SOS – Acil Yardım</p>
                    <p className="text-xs text-red-500/70">Güvenilir kişileri bilgilendir</p>
                  </div>
                  <ChevronRight size={16} className="text-red-600/50" />
                </button>
              </div>

              <p className="text-xs text-slate-600 text-center">
                Gerçek acil durumlarda 112'yi arayın.
              </p>
            </>
          )}

          {/* ── Share View ─────────────────────────────────────────────────────── */}
          {view === 'share' && (
            <>
              <p className="text-sm text-slate-400">
                Buluşma bilgilerini güvenilir birine ilet. Mesaj hazır — sadece göndermen yeterli.
              </p>
              <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700 text-xs text-slate-300 whitespace-pre-wrap leading-relaxed font-mono">
                {shareText}
              </div>
              <div className="space-y-2">
                {contacts.filter((c) => c.notify_on_date).map((c) => (
                  <div key={c.id} className="flex gap-2">
                    <button
                      onClick={() => shareViaWhatsApp(c.phone, shareText)}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600/90 hover:bg-emerald-600 text-white text-sm font-semibold transition-colors"
                    >
                      <MessageCircle size={16} />
                      WhatsApp – {c.name}
                    </button>
                    <button
                      onClick={() => shareViaSMS(c.phone, shareText)}
                      className="px-3 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm transition-colors"
                      aria-label="SMS gönder"
                    >
                      <Phone size={16} />
                    </button>
                  </div>
                ))}
              </div>
              {contacts.length === 0 && (
                <p className="text-xs text-slate-500 text-center">
                  Güvenilir kişi eklersen buradan hızla gönderebilirsin.
                </p>
              )}
              <button
                onClick={handleCopy}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-slate-700 text-slate-300 hover:bg-slate-800 transition-all text-sm font-medium"
              >
                {copySuccess ? (
                  <><CheckCircle2 size={16} className="text-emerald-400" /> Kopyalandı!</>
                ) : (
                  <><Copy size={16} /> Metni Kopyala</>
                )}
              </button>
            </>
          )}

          {/* ── Contacts View ──────────────────────────────────────────────────── */}
          {view === 'contacts' && (
            <>
              {contacts.length === 0 ? (
                <div className="flex flex-col items-center py-8 gap-3 text-center">
                  <Phone size={40} className="text-slate-600" strokeWidth={1.5} />
                  <p className="text-sm text-slate-400">Henüz güvenilir kişi eklemedin.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {contacts.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-slate-800/60 border border-slate-700"
                    >
                      {c.is_primary && <Star size={14} className="text-gold-400 flex-shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{c.name}</p>
                        <p className="text-xs text-slate-500">{c.phone}</p>
                      </div>
                      <button
                        onClick={() => handleRemoveContact(c.id)}
                        className="btn-icon text-slate-600 hover:text-red-400 hover:bg-red-500/10"
                        aria-label="Sil"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <button
                onClick={() => setView('add_contact')}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-dashed border-slate-600 text-slate-300 hover:border-slate-500 hover:bg-slate-800/60 transition-all text-sm font-medium"
              >
                <UserPlus size={16} /> Kişi Ekle
              </button>
            </>
          )}

          {/* ── Add Contact View ───────────────────────────────────────────────── */}
          {view === 'add_contact' && (
            <>
              {formError && (
                <div className="px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/25 text-xs text-red-400">{formError}</div>
              )}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Ad Soyad *</label>
                  <input
                    type="text"
                    value={contactForm.name}
                    onChange={(e) => setContactForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Ahmet Yılmaz"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-gold-500/60 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Telefon *</label>
                  <input
                    type="tel"
                    value={contactForm.phone}
                    onChange={(e) => setContactForm((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="+90 555 123 45 67"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-gold-500/60 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">İlişki</label>
                  <div className="flex gap-2">
                    {RELATION_OPTIONS.map((r) => (
                      <button
                        key={r.value}
                        onClick={() => setContactForm((p) => ({ ...p, relation: r.value }))}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-medium border transition-all ${
                          contactForm.relation === r.value
                            ? 'bg-gold-500/10 border-gold-500/40 text-gold-300'
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={contactForm.isPrimary}
                    onChange={(e) => setContactForm((p) => ({ ...p, isPrimary: e.target.checked }))}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-gold-500 focus:ring-gold-500/40"
                  />
                  <span className="text-sm text-slate-300">Birincil güvenilir kişi olarak işaretle</span>
                </label>
              </div>
            </>
          )}

          {/* ── SOS Confirm View ───────────────────────────────────────────────── */}
          {view === 'sos_confirm' && (
            <div className="flex flex-col items-center text-center py-4 gap-4">
              <div className="w-20 h-20 rounded-full bg-red-500/15 border-2 border-red-500/40 flex items-center justify-center">
                <AlertTriangle size={40} className="text-red-400" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-red-300">SOS Gönder</h3>
                <p className="text-sm text-slate-400 mt-1.5 leading-relaxed">
                  Güvenilir kişilerin bilgilendirilecek ve konumun paylaşılacak.
                  Bu işlem acil durumlara özeldir.
                </p>
              </div>
              {contacts.length === 0 && (
                <p className="text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 px-4 py-2.5 rounded-xl">
                  Hiç güvenilir kişi tanımlı değil. SOS gönderilirse kayıt oluşturulacak ama bildirim yapılamayacak.
                </p>
              )}
              <p className="text-sm font-semibold text-slate-500">
                Gerçek acil durumlarda <span className="text-white">112</span>'yi arayın.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-5 pb-5 pt-3 border-t border-slate-800 flex gap-3">
          {view === 'add_contact' && (
            <>
              <button
                onClick={() => { setView('contacts'); setFormError(null); }}
                className="px-5 py-3.5 rounded-2xl border border-slate-700 text-slate-300 text-sm font-medium hover:bg-slate-800 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleAddContact}
                disabled={isSaving}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gold-500 text-slate-900 font-bold text-sm hover:bg-gold-400 transition-all disabled:opacity-50"
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                {isSaving ? 'Kaydediliyor…' : 'Kaydet'}
              </button>
            </>
          )}

          {view === 'sos_confirm' && (
            <>
              {sosError && (
                <div className="w-full mb-2 px-4 py-3 rounded-xl bg-red-900/60 border border-red-500 text-red-200 text-sm font-medium text-center">
                  <AlertTriangle size={14} className="inline mr-1.5 mb-0.5" />
                  {sosError}
                </div>
              )}
              <button
                onClick={() => { setView('main'); setSosError(null); }}
                disabled={isSos}
                className="px-5 py-3.5 rounded-2xl border border-slate-700 text-slate-300 text-sm font-medium hover:bg-slate-800 transition-colors disabled:opacity-40"
              >
                İptal
              </button>
              <button
                onClick={handleSOS}
                disabled={isSos}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-red-500 text-white font-bold text-sm hover:bg-red-400 transition-all disabled:opacity-50"
              >
                {isSos ? <Loader2 size={16} className="animate-spin" /> : <AlertTriangle size={16} />}
                {isSos ? 'Gönderiliyor…' : 'SOS Gönder'}
              </button>
            </>
          )}

          {(view === 'main' || view === 'share' || view === 'contacts') && view !== 'main' && (
            <button
              onClick={() => setView('main')}
              className="w-full py-3.5 rounded-2xl border border-slate-700 text-slate-300 text-sm font-medium hover:bg-slate-800 transition-colors"
            >
              Geri
            </button>
          )}

          {view === 'main' && (
            <button
              onClick={onClose}
              className="w-full py-3.5 rounded-2xl border border-slate-700 text-slate-300 text-sm font-medium hover:bg-slate-800 transition-colors"
            >
              Kapat
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
