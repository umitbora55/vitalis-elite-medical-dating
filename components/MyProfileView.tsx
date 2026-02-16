import React, { useEffect, useState } from 'react';
import { Profile, ProfileQuestion } from '../types';
import { PREDEFINED_QUESTIONS } from '../constants';
import { Camera, X, Check, ChevronRight, BadgeCheck, CheckCheck, Settings, AlertTriangle, PauseCircle, Trash2, ShieldCheck, Mail, Smartphone, CheckCircle, Scale, KeyRound, MessageSquare, Users, UserCheck, SlidersHorizontal, Stethoscope, Clock } from 'lucide-react';
import { CommunityGuidelines } from './CommunityGuidelines';
import { VerificationCenter } from './profile/VerificationCenter';
import { AccountSettings } from './profile/AccountSettings';
import { SafetyCenter } from './profile/SafetyCenter';
import { ReferralModal } from './profile/ReferralModal';
import { ProfileStats } from './profile/ProfileStats';
import { requestPushPermission } from '../src/lib/pushNotifications';
import { requestAccountDeletion, requestDataExport } from '../services/accountService';

interface MyProfileViewProps {
    profile: Profile;
    onUpdateProfile: (updatedProfile: Profile) => void;
    isPremium: boolean;
    onOpenDiscoverySettings: () => void;
}

export const MyProfileView: React.FC<MyProfileViewProps> = ({
    profile,
    onUpdateProfile,
    isPremium,
    onOpenDiscoverySettings
}) => {
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    // Freeze Modal State
    const [showFreezeModal, setShowFreezeModal] = useState(false);
    const [freezeReason, setFreezeReason] = useState<string>('');

    // Account Management State
    const [showAccountMgmt, setShowAccountMgmt] = useState(false);
    const [dataRequestStatus, setDataRequestStatus] = useState<'IDLE' | 'PROCESSING' | 'DONE'>('IDLE');
    const [pushStatus, setPushStatus] = useState<'IDLE' | 'ENABLED' | 'ERROR'>('IDLE');

    // Delete Account State
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteReason, setDeleteReason] = useState<string>('');
    const [deletePassword, setDeletePassword] = useState<string>('');
    const [isDeleteSubmitting, setIsDeleteSubmitting] = useState(false);
    const [isFreezeSubmitting, setIsFreezeSubmitting] = useState(false);

    // Referral Modal State
    const [showReferralModal, setShowReferralModal] = useState(false);

    // Verification Modal State
    const [verificationType, setVerificationType] = useState<'PHOTO' | 'PHONE' | 'EMAIL' | null>(null);
    const [verificationStep, setVerificationStep] = useState<'INIT' | 'PROCESS' | 'SUCCESS'>('INIT');

    // Security Center State
    const [showSafetyCenter, setShowSafetyCenter] = useState(false);
    const [expandedTip, setExpandedTip] = useState<string | null>(null);
    const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
    const [feedbackText, setFeedbackText] = useState('');

    // Guidelines State
    const [showGuidelines, setShowGuidelines] = useState(false);

    // Q&A State
    const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
    const [selectedQuestion, setSelectedQuestion] = useState<string>('');
    const [newAnswer, setNewAnswer] = useState<string>('');

    // Mock Stats Data
    const stats = {
        views: 47,
        likes: 12,
        matches: 8,
        trend: 23, // percent
        chartData: [5, 8, 4, 12, 7, 9, 2] // Mon-Sun
    };

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 2500);
    };

    // --- Account Management Logic ---
    const handleDataRequest = async () => {
        setDataRequestStatus('PROCESSING');
        const { error } = await requestDataExport();
        if (error) {
            setDataRequestStatus('IDLE');
            showToast("Veri talebi alınamadı. Lütfen tekrar deneyin.");
            return;
        }
        setDataRequestStatus('DONE');
        showToast("Veri indirme talebin alındı. E-postanı kontrol et.");
    };

    const handleDeleteAccount = async () => {
        if (deletePassword.length < 8) {
            showToast("Lütfen en az 8 karakterli bir şifre giriniz.");
            return;
        }
        setIsDeleteSubmitting(true);
        const { error } = await requestAccountDeletion(deleteReason || undefined);
        setIsDeleteSubmitting(false);
        if (error) {
            showToast("Silme talebi oluşturulamadı. Lütfen tekrar deneyin.");
            return;
        }
        setShowDeleteConfirm(false);
        setShowAccountMgmt(false);
        setDeleteReason('');
        setDeletePassword('');
        showToast("Silme talebiniz alındı. Hesabınız 30 gün içinde kaldırılacaktır.");
    };

    const handleEnablePush = async () => {
        try {
            await requestPushPermission();
            setPushStatus('ENABLED');
            showToast('Bildirimler acildi.');
        } catch (error) {
            setPushStatus('ERROR');
            showToast('Bildirim izni alinmadi.');
        }
    };

    // --- Verification Logic ---
    const startVerification = (type: 'PHOTO' | 'PHONE' | 'EMAIL') => {
        setVerificationType(type);
        setVerificationStep('INIT');
    };

    const handleVerificationProcess = () => {
        setVerificationStep('PROCESS');
        // Simulate API call
        setTimeout(() => {
            setVerificationStep('SUCCESS');

            // Update profile badges
            const currentBadges = profile.verificationBadges || { photo: false, phone: false, email: false, license: true };
            const updatedBadges = { ...currentBadges };

            if (verificationType === 'PHOTO') updatedBadges.photo = true;
            if (verificationType === 'PHONE') updatedBadges.phone = true;
            if (verificationType === 'EMAIL') updatedBadges.email = true;

            onUpdateProfile({ ...profile, verificationBadges: updatedBadges });
        }, 2000);
    };

    const closeVerificationModal = () => {
        setVerificationType(null);
        setVerificationStep('INIT');
    };

    // --- Safety Center Logic ---
    const handleSafetyToggle = (id: string, type: 'TIP' | 'FAQ') => {
        if (type === 'TIP') {
            setExpandedTip(expandedTip === id ? null : id);
        } else {
            setExpandedFaq(expandedFaq === id ? null : id);
        }
    };

    const handleSendFeedback = () => {
        if (!feedbackText.trim()) return;
        showToast("Geri bildiriminiz alındı. Teşekkürler!");
        setFeedbackText('');
    };

    const handleEmergencyReport = () => {
        showToast("🚨 İhbar alındı. Güvenlik ekibimiz inceliyor.");
        setShowSafetyCenter(false);
    };

    // --- Q&A Management ---
    const handleSaveQuestion = () => {
        if (!selectedQuestion || !newAnswer.trim()) return;

        const newQ: ProfileQuestion = {
            id: `q-${Date.now()}`,
            question: selectedQuestion,
            answer: newAnswer.trim()
        };

        onUpdateProfile({
            ...profile,
            questions: [...(profile.questions || []), newQ]
        });

        setSelectedQuestion('');
        setNewAnswer('');
        setIsQuestionModalOpen(false);
    };

    // --- Referral Logic ---
    const handleCopyCode = () => {
        if (profile.referralData?.code) {
            navigator.clipboard.writeText(profile.referralData.code);
            showToast("Code copied to clipboard!");
        }
    };

    const handleShareWhatsApp = () => {
        if (profile.referralData?.code) {
            const text = `Join Vitalis, the exclusive dating app for healthcare pros! Use my code ${profile.referralData.code} for 3 days of Premium! https://vitalis.app`;
            window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
        }
    };

    const handleShareSMS = () => {
        if (profile.referralData?.code) {
            const text = `Join Vitalis! Use my code ${profile.referralData.code} for 3 days of Premium! https://vitalis.app`;
            // Note: '&body' is standard for many devices but '?body' works on iOS. Using '&body' for broader web support.
            window.open(`sms:?&body=${encodeURIComponent(text)}`, '_self');
        }
    };

    const handleFreezeAccount = () => {
        setIsFreezeSubmitting(true);
        onUpdateProfile({
            ...profile,
            isFrozen: true,
            freezeReason: freezeReason
        });
        setShowFreezeModal(false);
        setShowAccountMgmt(false);
        setFreezeReason('');
        window.setTimeout(() => setIsFreezeSubmitting(false), 400);
    };

    useEffect(() => {
        const handleEscape = (event: KeyboardEvent): void => {
            if (event.key !== 'Escape') return;
            if (showDeleteConfirm) setShowDeleteConfirm(false);
            if (showFreezeModal) setShowFreezeModal(false);
            if (verificationType) closeVerificationModal();
            if (isQuestionModalOpen) setIsQuestionModalOpen(false);
            if (showGuidelines) setShowGuidelines(false);
            if (showReferralModal) setShowReferralModal(false);
            if (showAccountMgmt) setShowAccountMgmt(false);
            if (showSafetyCenter) setShowSafetyCenter(false);
        };
        window.addEventListener('keydown', handleEscape);
        return (): void => window.removeEventListener('keydown', handleEscape);
    }, [
        isQuestionModalOpen,
        showAccountMgmt,
        showDeleteConfirm,
        showFreezeModal,
        showGuidelines,
        showReferralModal,
        showSafetyCenter,
        verificationType,
    ]);


    return (
        <div className="w-full h-full max-w-md mx-auto pt-20 px-4 pb-24 overflow-y-auto hide-scrollbar">

            {/* Toast Notification */}
            {toastMessage && (
                <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[80] animate-fade-in" role="status" aria-live="polite" aria-atomic="true">
                    <div className="bg-slate-900 border border-gold-500/50 text-white px-4 py-2 rounded-full shadow-2xl flex items-center gap-2">
                        <CheckCheck size={16} className="text-gold-500" />
                        <span className="text-sm font-medium">{toastMessage}</span>
                    </div>
                </div>
            )}

            <div className="pl-2 mb-4 flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-serif text-slate-900 dark:text-white mb-2">My Profile</h2>
                    {/* Verification Status */}
                    <div className="flex items-center gap-1.5 bg-green-500/10 px-2 py-0.5 rounded-md border border-green-500/20 w-fit">
                        <BadgeCheck size={14} className="text-green-500" fill="currentColor" stroke="black" />
                        <span className="text-[10px] font-bold text-green-600 dark:text-green-400 uppercase tracking-wide">Verified Healthcare Pro</span>
                    </div>
                </div>

                <button
                    onClick={() => setShowSafetyCenter(true)}
                    className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                    <ShieldCheck size={18} />
                    <span className="text-xs font-bold hidden sm:inline">Güvenlik</span>
                </button>
            </div>

            {/* ... (Existing code for Stats, Verification, Theme options remains the same) ... */}

            <ProfileStats stats={stats} isPremium={isPremium} />

            {/* --- First Message Preference --- */}
            <div className="mb-6 bg-white dark:bg-slate-900/50 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                    <MessageSquare size={16} className="text-gold-500" />
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Sohbet Kuralları</h3>
                </div>

                <div className="flex flex-col gap-2">
                    {[
                        { id: 'ANYONE', label: 'Herkes Başlatabilir', desc: 'Standart akış, her iki taraf da mesaj atabilir.', icon: <Users size={14} /> },
                        { id: 'ME_FIRST', label: 'Önce Ben Başlatayım', desc: 'Eşleşme sonrası ilk mesajı sen atmalısın.', icon: <UserCheck size={14} /> },
                        { id: 'THEM_FIRST', label: 'Önce Onlar Başlatsın', desc: 'Onlar mesaj atana kadar sohbet kapalı kalır.', icon: <ShieldCheck size={14} /> }
                    ].map((option) => (
                        <button
                            key={option.id}
                            onClick={() => onUpdateProfile({ ...profile, firstMessagePreference: option.id as any })}
                            className={`w-full flex items-start gap-3 p-3 rounded-xl border transition-all text-left ${(profile.firstMessagePreference || 'ANYONE') === option.id
                                ? 'bg-gold-500/10 border-gold-500 shadow-[0_0_10px_rgba(234,179,8,0.05)]'
                                : 'bg-transparent border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                                }`}
                        >
                            <div className={`mt-0.5 p-1.5 rounded-lg ${(profile.firstMessagePreference || 'ANYONE') === option.id
                                ? 'bg-gold-500 text-white'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                                }`}>
                                {option.icon}
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center justify-between">
                                    <span className={`text-sm font-bold ${(profile.firstMessagePreference || 'ANYONE') === option.id ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}>
                                        {option.label}
                                    </span>
                                    {(profile.firstMessagePreference || 'ANYONE') === option.id && (
                                        <Check size={14} className="text-gold-500" />
                                    )}
                                </div>
                                <p className="text-[10px] text-slate-500 leading-tight mt-0.5">{option.desc}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* --- Nöbet Modu (On-Call Mode) --- */}
            <div className="mb-6 bg-white dark:bg-slate-900/50 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                    <Stethoscope size={16} className="text-blue-500" />
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Nöbet Modu</h3>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 mb-3">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${profile.isOnCall ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'} transition-colors`}>
                            <Stethoscope size={18} />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">Nöbetteyim</p>
                            <p className="text-[10px] text-slate-500">Aktifken eşleşme sürelerine +24h eklenir</p>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            if (profile.isOnCall) {
                                onUpdateProfile({ ...profile, isOnCall: false, onCallEndsAt: undefined });
                            } else {
                                // Default 12h on-call
                                onUpdateProfile({ ...profile, isOnCall: true, onCallEndsAt: Date.now() + 12 * 60 * 60 * 1000 });
                            }
                        }}
                        className={`relative w-12 h-6 rounded-full transition-colors ${profile.isOnCall ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'}`}
                    >
                        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform ${profile.isOnCall ? 'left-[26px]' : 'left-0.5'}`} />
                    </button>
                </div>

                {profile.isOnCall && (
                    <div className="space-y-2">
                        <p className="text-[10px] text-slate-500 font-bold uppercase">Nöbet Süresi</p>
                        <div className="flex gap-2">
                            {[6, 12, 24].map((hours) => {
                                const endAt = Date.now() + hours * 60 * 60 * 1000;
                                const isSelected = profile.onCallEndsAt && Math.abs((profile.onCallEndsAt - Date.now()) / 3_600_000 - hours) < 1;
                                return (
                                    <button
                                        key={hours}
                                        onClick={() => onUpdateProfile({ ...profile, onCallEndsAt: endAt })}
                                        className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-1.5 border ${isSelected
                                                ? 'bg-blue-600/10 border-blue-500 text-blue-400'
                                                : 'border-slate-200 dark:border-slate-700 text-slate-400 hover:border-blue-400/50'
                                            }`}
                                    >
                                        <Clock size={12} />
                                        {hours}s
                                    </button>
                                );
                            })}
                        </div>
                        {profile.onCallEndsAt && (
                            <p className="text-[10px] text-blue-400/70 text-center mt-1">
                                Nöbet bitiş: {new Date(profile.onCallEndsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        )}
                    </div>
                )}
            </div>

            <VerificationCenter profile={profile} onStartVerification={startVerification} />


            {/* --- Discovery Settings Button --- */}
            <div className="mb-6 bg-white dark:bg-slate-900/50 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                        <SlidersHorizontal size={16} className="text-gold-500" />
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Keşif Ayarları</h3>
                    </div>
                </div>
                <button
                    onClick={onOpenDiscoverySettings}
                    className="w-full flex items-center justify-between p-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all group"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gold-500/10 rounded-lg text-gold-500 group-hover:bg-gold-500 group-hover:text-white transition-all">
                            <SlidersHorizontal size={18} />
                        </div>
                        <div className="text-left">
                            <p className="text-sm font-bold text-slate-900 dark:text-white">Filtreleri Düzenle</p>
                            <p className="text-[10px] text-slate-500">Mesafe, yaş ve uzmanlık tercihleri</p>
                        </div>
                    </div>
                    <ChevronRight size={18} className="text-slate-400 group-hover:text-gold-500 transition-all" />
                </button>
            </div>

            {/* --- Account Management Group --- */}
            <div className="mt-6 mb-8 px-2 space-y-3">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Account & Data</h3>

                {/* View Community Guidelines Button */}
                <button
                    onClick={() => setShowGuidelines(true)}
                    className="w-full flex items-center justify-between p-4 bg-white dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 transition-colors group shadow-sm"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                            <Scale size={20} />
                        </div>
                        <div className="text-left">
                            <span className="text-slate-900 dark:text-white font-medium text-sm block">Topluluk Kuralları</span>
                            <span className="text-[10px] text-slate-500">Davranış kurallarını incele</span>
                        </div>
                    </div>
                    <ChevronRight size={16} className="text-slate-500" />
                </button>

                {/* Account Management & Data Button */}
                <button
                    onClick={() => setShowAccountMgmt(true)}
                    className="w-full flex items-center justify-between p-4 bg-white dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 transition-colors group shadow-sm"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                            <Settings size={20} />
                        </div>
                        <div className="text-left">
                            <span className="text-slate-900 dark:text-white font-medium text-sm block">Hesap ve Veri Yönetimi</span>
                            <span className="text-[10px] text-slate-500">Verileri indir, dondur veya sil</span>
                        </div>
                    </div>
                    <ChevronRight size={16} className="text-slate-500" />
                </button>
            </div >

            {/* Spacer for bottom navigation */}
            < div className="h-10" ></div >

            <AccountSettings
                isOpen={showAccountMgmt}
                dataRequestStatus={dataRequestStatus}
                pushStatus={pushStatus}
                onClose={() => setShowAccountMgmt(false)}
                onRequestData={handleDataRequest}
                onEnablePush={handleEnablePush}
                onShowFreezeModal={() => setShowFreezeModal(true)}
                onShowDeleteConfirm={() => setShowDeleteConfirm(true)}
            />

            {/* --- Delete Confirmation Modal --- */}
            {
                showDeleteConfirm && (
                    <div className="fixed inset-0 z-[110] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in" role="dialog" aria-modal="true" aria-label="Delete account confirmation">
                        <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
                            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                                <h3 className="text-lg font-serif font-bold text-white flex items-center gap-2">
                                    <Trash2 size={20} className="text-red-500" /> Hesabı Sil
                                </h3>
                                <button onClick={() => setShowDeleteConfirm(false)} aria-label="Close delete account dialog" className="text-slate-500 hover:text-white">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="p-6 overflow-y-auto">
                                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
                                    <h4 className="text-red-500 font-bold text-sm mb-2 flex items-center gap-2">
                                        <AlertTriangle size={16} /> DİKKAT: Bu işlem geri alınamaz!
                                    </h4>
                                    <ul className="text-xs text-red-200/70 space-y-1 list-disc pl-4">
                                        <li>Tüm eşleşmeleriniz silinecek.</li>
                                        <li>Mesaj geçmişiniz kaybolacak.</li>
                                        <li>Varsa Premium aboneliğiniz iptal edilecek.</li>
                                        <li>Bu verileri daha sonra kurtaramazsınız.</li>
                                    </ul>
                                </div>

                                <div className="space-y-4 mb-6">
                                    <p className="text-xs font-bold text-slate-500 uppercase">Neden gidiyorsun?</p>
                                    <div className="space-y-2">
                                        {['Birisiyle görüşmeye başladım', 'Uygulama beklentimi karşılamadı', 'Çok fazla bildirim alıyorum', 'Diğer'].map((reason) => (
                                            <label key={reason} className="flex items-center gap-3 p-3 rounded-xl border border-slate-800 bg-slate-950 cursor-pointer hover:border-slate-700 transition-colors">
                                                <input
                                                    type="radio"
                                                    name="deleteReason"
                                                    value={reason}
                                                    checked={deleteReason === reason}
                                                    onChange={(e) => setDeleteReason(e.target.value)}
                                                    className="w-4 h-4 text-red-500 bg-slate-800 border-slate-600 focus:ring-red-500"
                                                />
                                                <span className="text-sm text-slate-300">{reason}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="mb-6">
                                    <label htmlFor="delete-password" className="text-xs font-bold text-slate-500 uppercase mb-2 block">Güvenlik İçin Şifreni Gir</label>
                                    <div className="relative">
                                        <KeyRound className="absolute left-4 top-3.5 text-slate-500" size={18} />
                                        <input
                                            id="delete-password"
                                            type="password"
                                            placeholder="Şifreniz"
                                            value={deletePassword}
                                            onChange={(e) => setDeletePassword(e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-white focus-visible:outline-none focus-visible:border-red-500 focus-visible:ring-2 focus-visible:ring-red-500/30 transition-colors text-sm"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowDeleteConfirm(false)}
                                        className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-400 font-bold hover:bg-slate-800 transition-colors"
                                    >
                                        Vazgeç
                                    </button>
                                    <button
                                        onClick={handleDeleteAccount}
                                        disabled={!deleteReason || !deletePassword || isDeleteSubmitting}
                                        className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isDeleteSubmitting ? 'İşleniyor...' : 'Hesabı Sil'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            <SafetyCenter
                isOpen={showSafetyCenter}
                expandedTip={expandedTip}
                expandedFaq={expandedFaq}
                feedbackText={feedbackText}
                onClose={() => setShowSafetyCenter(false)}
                onToggle={handleSafetyToggle}
                onFeedbackChange={setFeedbackText}
                onSendFeedback={handleSendFeedback}
                onEmergencyReport={handleEmergencyReport}
            />

            {/* Community Guidelines Modal (Settings View) */}
            {
                showGuidelines && (
                    <CommunityGuidelines
                        mode="VIEW"
                        onClose={() => setShowGuidelines(false)}
                    />
                )
            }

            <ReferralModal
                isOpen={showReferralModal}
                profile={profile}
                onClose={() => setShowReferralModal(false)}
                onCopyCode={handleCopyCode}
                onShareWhatsApp={handleShareWhatsApp}
                onShareSMS={handleShareSMS}
            />

            {/* Freeze Account Modal (Keep for direct access if needed, or remove since it's in Account Mgmt now) */}
            {/* We keep it because other buttons might trigger it directly */}
            {
                showFreezeModal && !showAccountMgmt && (
                    <div className="fixed inset-0 z-[60] bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in" role="dialog" aria-modal="true" aria-label="Freeze account confirmation">
                        <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm shadow-2xl relative overflow-hidden">
                            <div className="p-6">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-xl font-serif font-bold text-white flex items-center gap-2">
                                        <PauseCircle className="text-blue-400" size={24} />
                                        Hesabı Dondur
                                    </h3>
                                    <button onClick={() => setShowFreezeModal(false)} aria-label="Close freeze account dialog" className="text-slate-500 hover:text-white">
                                        <X size={24} />
                                    </button>
                                </div>

                                <div className="space-y-3 mb-6">
                                    <p className="text-sm text-slate-300 font-bold mb-2">Hesabını dondurduğunda:</p>

                                    <div className="flex items-start gap-3">
                                        <X size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                                        <p className="text-xs text-slate-400">Kimse seni göremez</p>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <X size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                                        <p className="text-xs text-slate-400">Swipe havuzundan çıkarsın</p>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <Check size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                                        <p className="text-xs text-slate-400">Eşleşmeler ve mesajlar korunur</p>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <Check size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                                        <p className="text-xs text-slate-400">İstediğin zaman geri dönebilirsin</p>
                                    </div>
                                </div>

                                <div className="mb-6">
                                    <p className="text-xs font-bold text-slate-500 uppercase mb-3">Neden ara veriyorsun? (Opsiyonel)</p>
                                    <div className="space-y-2">
                                        {['Birisiyle görüşmeye başladım', 'Bir süre ara veriyorum', 'Çok yoğunum', 'Diğer'].map((reason) => (
                                            <label key={reason} className="flex items-center gap-3 p-3 rounded-xl border border-slate-800 bg-slate-900/50 cursor-pointer hover:border-slate-700 transition-colors">
                                                <input
                                                    type="radio"
                                                    name="freezeReason"
                                                    value={reason}
                                                    checked={freezeReason === reason}
                                                    onChange={(e) => setFreezeReason(e.target.value)}
                                                    className="w-4 h-4 text-blue-500 bg-slate-800 border-slate-600 focus:ring-blue-500"
                                                />
                                                <span className="text-sm text-slate-300">{reason}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowFreezeModal(false)}
                                        className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-400 font-bold hover:bg-slate-800 transition-colors"
                                    >
                                        İptal
                                    </button>
                                    <button
                                        onClick={handleFreezeAccount}
                                        disabled={isFreezeSubmitting}
                                        className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors shadow-lg"
                                    >
                                        {isFreezeSubmitting ? 'İşleniyor...' : 'Hesabı Dondur'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Verification Modal */}
            {
                verificationType && (
                    <div className="fixed inset-0 z-[80] bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in" role="dialog" aria-modal="true" aria-label="Verification flow">
                        <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden">
                            <div className="p-6">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-xl font-serif font-bold text-white flex items-center gap-2">
                                        {verificationType === 'PHOTO' && <Camera className="text-blue-400" size={24} />}
                                        {verificationType === 'PHONE' && <Smartphone className="text-green-400" size={24} />}
                                        {verificationType === 'EMAIL' && <Mail className="text-purple-400" size={24} />}
                                        {verificationType === 'PHOTO' ? 'Photo Verify' : verificationType === 'PHONE' ? 'Phone Verify' : 'Email Verify'}
                                    </h3>
                                    <button onClick={closeVerificationModal} aria-label="Close verification dialog" className="text-slate-500 hover:text-white">
                                        <X size={24} />
                                    </button>
                                </div>

                                {verificationStep === 'INIT' && (
                                    <div className="text-center">
                                        {verificationType === 'PHOTO' && (
                                            <>
                                                <p className="text-slate-300 text-sm mb-6">
                                                    Please copy the gesture shown below to verify you are a real person.
                                                </p>
                                                <div className="w-32 h-32 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-dashed border-slate-600">
                                                    <span className="text-4xl">✌️😉</span>
                                                </div>
                                                <button onClick={handleVerificationProcess} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold">
                                                    Take Photo
                                                </button>
                                            </>
                                        )}
                                        {verificationType === 'PHONE' && (
                                            <>
                                                <p className="text-slate-300 text-sm mb-4">
                                                    We will send a code to your registered phone number.
                                                </p>
                                                <input
                                                    type="text"
                                                    placeholder="Enter Phone Number"
                                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 mb-6 text-white text-center"
                                                    defaultValue="+1 (555) ***-**99"
                                                />
                                                <button onClick={handleVerificationProcess} className="w-full py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold">
                                                    Send Code
                                                </button>
                                            </>
                                        )}
                                        {verificationType === 'EMAIL' && (
                                            <>
                                                <p className="text-slate-300 text-sm mb-4">
                                                    Please enter your institutional email address (e.g., .edu, .org, .hospital).
                                                </p>
                                                <input
                                                    type="email"
                                                    placeholder="dr.name@hospital.org"
                                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 mb-6 text-white"
                                                />
                                                <button onClick={handleVerificationProcess} className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold">
                                                    Send Link
                                                </button>
                                            </>
                                        )}
                                    </div>
                                )}

                                {verificationStep === 'PROCESS' && (
                                    <div className="text-center py-8">
                                        <div className="w-12 h-12 border-4 border-gold-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                        <p className="text-slate-400 text-sm">Verifying...</p>
                                    </div>
                                )}

                                {verificationStep === 'SUCCESS' && (
                                    <div className="text-center py-4">
                                        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-green-500">
                                            <CheckCircle size={32} />
                                        </div>
                                        <h4 className="text-xl font-bold text-white mb-2">Verified!</h4>
                                        <p className="text-slate-400 text-sm mb-6">Your badge has been added to your profile.</p>
                                        <button onClick={closeVerificationModal} className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold">
                                            Done
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Question Selection Modal */}
            {
                isQuestionModalOpen && (
                    <div className="fixed inset-0 z-[70] bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in" role="dialog" aria-modal="true" aria-label="Question selection">
                        <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm shadow-2xl relative flex flex-col max-h-[80vh]">
                            <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                                <h3 className="text-lg font-serif font-bold text-white">Soru Seç</h3>
                                <button onClick={() => setIsQuestionModalOpen(false)} aria-label="Close question dialog" className="text-slate-500 hover:text-white"><X size={20} /></button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                                {!selectedQuestion ? (
                                    PREDEFINED_QUESTIONS.map((q, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setSelectedQuestion(q)}
                                            className="w-full text-left p-3 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-800 transition-colors text-sm text-slate-300"
                                        >
                                            {q}
                                        </button>
                                    ))
                                ) : (
                                    <div className="space-y-4">
                                        <div className="p-4 bg-slate-800 rounded-xl">
                                            <p className="text-sm text-gold-500 font-bold mb-2">{selectedQuestion}</p>
                                            <textarea
                                                value={newAnswer}
                                                onChange={(e) => setNewAnswer(e.target.value.slice(0, 100))}
                                                placeholder="Cevabını buraya yaz..."
                                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white text-sm focus:border-gold-500 outline-none"
                                                rows={3}
                                            />
                                            <div className="text-right mt-1 text-[10px] text-slate-500">
                                                {newAnswer.length}/100
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => setSelectedQuestion('')} className="flex-1 py-3 text-slate-400 text-sm font-bold">Geri</button>
                                            <button onClick={handleSaveQuestion} className="flex-1 py-3 bg-gold-500 text-white rounded-xl text-sm font-bold">Kaydet</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};
