import React, { useState } from 'react';
import { Profile, ProfileQuestion, ThemePreference } from '../types';
import { PREDEFINED_QUESTIONS } from '../constants';
import { Camera, X, Check, ChevronRight, Eye, BadgeCheck, CheckCheck, HeartHandshake, TrendingUp, Heart, Lock, Settings, Moon, AlertTriangle, PauseCircle, MessageCircle, Trash2, Gift, Copy, MessageSquareMore, ShieldCheck, Mail, Smartphone, CheckCircle, ChevronDown, ChevronUp, LifeBuoy, FileText, Send, Sun, Monitor, Scale, KeyRound } from 'lucide-react';
import { CommunityGuidelines } from './CommunityGuidelines';
import { VerificationCenter } from './profile/VerificationCenter';
import { AccountSettings } from './profile/AccountSettings';

interface MyProfileViewProps {
  profile: Profile;
  onUpdateProfile: (updatedProfile: Profile) => void;
  onGoPremium: () => void;
  isPremium?: boolean;
  onResetTutorial?: () => void;
  onViewProfile?: (profile: Profile) => void;
}

export const MyProfileView: React.FC<MyProfileViewProps> = (props) => {
  const { profile, onUpdateProfile, isPremium = false } = props;
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  // Freeze Modal State
  const [showFreezeModal, setShowFreezeModal] = useState(false);
  const [freezeReason, setFreezeReason] = useState<string>('');

  // Account Management State
  const [showAccountMgmt, setShowAccountMgmt] = useState(false);
  const [dataRequestStatus, setDataRequestStatus] = useState<'IDLE' | 'PROCESSING' | 'DONE'>('IDLE');
  
  // Delete Account State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteReason, setDeleteReason] = useState<string>('');
  const [deletePassword, setDeletePassword] = useState<string>('');

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
  const handleDataRequest = () => {
      setDataRequestStatus('PROCESSING');
      // Simulate API call
      setTimeout(() => {
          setDataRequestStatus('DONE');
          showToast("Veri indirme talebin alındı. E-postanı kontrol et.");
      }, 2000);
  };

  const handleDeleteAccount = () => {
      if (deletePassword.length < 3) {
          alert("Lütfen geçerli bir şifre giriniz.");
          return;
      }
      
      // Simulate API call
      alert("Hesabınız silinme kuyruğuna alındı. Verileriniz 30 gün içinde tamamen silinecektir.");
      window.location.reload(); // Reset app for demo
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
      if (window.confirm("Bu bir acil durum ihbarı olarak kaydedilecektir. Devam etmek istiyor musunuz?")) {
          showToast("🚨 İhbar alındı. Güvenlik ekibimiz inceliyor.");
          setShowSafetyCenter(false);
      }
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
      onUpdateProfile({
          ...profile,
          isFrozen: true,
          freezeReason: freezeReason
      });
      setShowFreezeModal(false);
  };

  const handleThemeChange = (pref: ThemePreference) => {
      onUpdateProfile({ ...profile, themePreference: pref });
  };


  return (
    <div className="w-full h-full max-w-md mx-auto pt-20 px-4 pb-24 overflow-y-auto hide-scrollbar">
      
      {/* Toast Notification */}
      {toastMessage && (
          <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[80] animate-fade-in">
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
      
      {/* --- Profile Stats / Analytics --- */}
      <div className="mb-6 space-y-3">
          <h3 className="text-[10px] text-slate-500 uppercase font-bold tracking-widest pl-2">Profile Insights</h3>
          <div className="grid grid-cols-3 gap-3">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex flex-col justify-between shadow-sm">
                  <div className="flex items-center gap-2 text-blue-500 dark:text-blue-400 mb-2">
                      <Eye size={16} />
                      <span className="text-[10px] uppercase font-bold">Views</span>
                  </div>
                  <div className="flex flex-col">
                      <span className="text-2xl font-bold text-slate-900 dark:text-white leading-none">
                          {isPremium ? stats.views : `${Math.floor(stats.views / 10) * 10}+`}
                      </span>
                      {isPremium && (
                        <div className="flex items-center gap-1 text-[10px] text-green-500 mt-1">
                            <TrendingUp size={10} />
                            <span>{stats.trend}% vs last wk</span>
                        </div>
                      )}
                  </div>
              </div>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex flex-col justify-between shadow-sm">
                  <div className="flex items-center gap-2 text-gold-500 mb-2">
                      <Heart size={16} fill={isPremium ? "currentColor" : "none"} />
                      <span className="text-[10px] uppercase font-bold">Likes</span>
                  </div>
                  <div className="relative">
                      {isPremium ? (
                          <span className="text-2xl font-bold text-slate-900 dark:text-white leading-none">{stats.likes}</span>
                      ) : (
                          <div className="flex items-center gap-1">
                              <span className="text-2xl font-bold text-slate-400 dark:text-slate-500 blur-[2px] leading-none">12</span>
                              <Lock size={12} className="text-gold-500 absolute top-1 left-2" />
                          </div>
                      )}
                      <p className="text-[10px] text-slate-500 mt-1">New likes this week</p>
                  </div>
              </div>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex flex-col justify-between shadow-sm">
                  <div className="flex items-center gap-2 text-purple-500 dark:text-purple-400 mb-2">
                      <HeartHandshake size={16} />
                      <span className="text-[10px] uppercase font-bold">Matches</span>
                  </div>
                   <div className="flex flex-col">
                      <span className="text-2xl font-bold text-slate-900 dark:text-white leading-none">{stats.matches}</span>
                      <p className="text-[10px] text-slate-500 mt-1">New connections</p>
                  </div>
              </div>
          </div>
      </div>

      <VerificationCenter profile={profile} onStartVerification={startVerification} />

      {/* --- Appearance / Theme --- */}
      <div className="mb-6 bg-white dark:bg-slate-900/50 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
              <Moon size={16} className="text-blue-500" />
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Görünüm</h3>
          </div>
          
          <div className="flex p-1 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
              <button 
                  onClick={() => handleThemeChange('LIGHT')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
                      (profile.themePreference === 'LIGHT') 
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' 
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
              >
                  <Sun size={14} /> Açık
              </button>
              <button 
                  onClick={() => handleThemeChange('DARK')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
                      (profile.themePreference === 'DARK') 
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' 
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
              >
                  <Moon size={14} /> Koyu
              </button>
              <button 
                  onClick={() => handleThemeChange('SYSTEM')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
                      (profile.themePreference === 'SYSTEM') 
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' 
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
              >
                  <Monitor size={14} /> Oto
              </button>
          </div>
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
      </div>
      
      {/* Spacer for bottom navigation */}
      <div className="h-10"></div>

      <AccountSettings
        isOpen={showAccountMgmt}
        dataRequestStatus={dataRequestStatus}
        onClose={() => setShowAccountMgmt(false)}
        onRequestData={handleDataRequest}
        onShowFreezeModal={() => setShowFreezeModal(true)}
        onShowDeleteConfirm={() => setShowDeleteConfirm(true)}
      />

      {/* --- Delete Confirmation Modal --- */}
      {showDeleteConfirm && (
          <div className="fixed inset-0 z-[110] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
                  <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                      <h3 className="text-lg font-serif font-bold text-white flex items-center gap-2">
                          <Trash2 size={20} className="text-red-500" /> Hesabı Sil
                      </h3>
                      <button onClick={() => setShowDeleteConfirm(false)} className="text-slate-500 hover:text-white">
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
                          <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Güvenlik İçin Şifreni Gir</label>
                          <div className="relative">
                              <KeyRound className="absolute left-4 top-3.5 text-slate-500" size={18} />
                              <input 
                                  type="password" 
                                  placeholder="Şifreniz"
                                  value={deletePassword}
                                  onChange={(e) => setDeletePassword(e.target.value)}
                                  className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-white focus:border-red-500 focus:outline-none transition-colors text-sm"
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
                              disabled={!deleteReason || !deletePassword}
                              className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                              Hesabı Sil
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Safety Center Overlay */}
      {showSafetyCenter && (
          <div className="fixed inset-0 z-[100] bg-slate-50 dark:bg-slate-950 flex flex-col animate-fade-in overflow-hidden">
              {/* ... (Safety Center code remains unchanged) ... */}
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3">
                      <ShieldCheck size={24} className="text-gold-500" />
                      <div>
                          <h3 className="text-lg font-serif font-bold text-slate-900 dark:text-white">Güvenlik Merkezi</h3>
                          <p className="text-xs text-slate-500">Yardım ve Destek</p>
                      </div>
                  </div>
                  <button onClick={() => setShowSafetyCenter(false)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
                      <X size={24} />
                  </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 pb-24 space-y-6">
                  {/* ... (Safety Center Content) ... */}
                  {/* Safety Tips Section */}
                  <div>
                      <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                          <LifeBuoy size={14} /> Güvenlik İpuçları
                      </h4>
                      <div className="space-y-3">
                          {[
                              { id: 'tip1', title: "İlk Buluşma Önerileri", content: "İlk buluşmayı her zaman halka açık bir yerde yapın. Bir arkadaşınıza veya ailenize konumunuzu bildirin." },
                              { id: 'tip2', title: "Şüpheli Profilleri Tanıma", content: "Para isteyen, çok hızlı kişisel bilgi talep eden veya görüntülü görüşmeden kaçınan profillere dikkat edin." },
                              { id: 'tip3', title: "Kişisel Verileri Koruma", content: "Ev adresinizi, finansal bilgilerinizi veya T.C. kimlik numaranızı asla paylaşmayın." }
                          ].map(tip => (
                              <div key={tip.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                                  <button 
                                      onClick={() => handleSafetyToggle(tip.id, 'TIP')}
                                      className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                  >
                                      <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{tip.title}</span>
                                      {expandedTip === tip.id ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                                  </button>
                                  {expandedTip === tip.id && (
                                      <div className="p-4 pt-0 text-sm text-slate-600 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-900/50 animate-fade-in border-t border-slate-100 dark:border-slate-800">
                                          {tip.content}
                                      </div>
                                  )}
                              </div>
                          ))}
                      </div>
                  </div>

                  {/* FAQ Section */}
                  <div>
                      <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                          <FileText size={14} /> Sıkça Sorulan Sorular
                      </h4>
                      <div className="space-y-3">
                          {[
                              { id: 'faq1', title: "Nasıl doğrulanırım?", content: "Profil ayarlarında 'Doğrulama Rozetleri' kısmından Selfie veya Belge yükleyerek onaylanabilirsiniz." },
                              { id: 'faq2', title: "Premium üyelik iptali", content: "App Store veya Google Play abonelik ayarlarından üyeliğinizi yönetebilirsiniz." },
                              { id: 'faq3', title: "Eşleşme nasıl çalışır?", content: "Karşılıklı beğeni olduğunda eşleşme gerçekleşir. Premium üyeler, kendilerini beğenenleri görebilir." },
                              { id: 'faq4', title: "Birini nasıl engellerim?", content: "Kullanıcı profilinin sağ üst köşesindeki menüden 'Engelle' seçeneğini kullanabilirsiniz." }
                          ].map(faq => (
                              <div key={faq.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                                  <button 
                                      onClick={() => handleSafetyToggle(faq.id, 'FAQ')}
                                      className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                  >
                                      <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{faq.title}</span>
                                      {expandedFaq === faq.id ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                                  </button>
                                  {expandedFaq === faq.id && (
                                      <div className="p-4 pt-0 text-sm text-slate-600 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-900/50 animate-fade-in border-t border-slate-100 dark:border-slate-800">
                                          {faq.content}
                                      </div>
                                  )}
                              </div>
                          ))}
                      </div>
                  </div>

                  {/* Contact Us */}
                  <div>
                      <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                          <Mail size={14} /> Bize Ulaşın
                      </h4>
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
                          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                              Bir sorun mu yaşıyorsunuz? Ekibimize mesaj gönderin.
                          </p>
                          <textarea 
                              value={feedbackText}
                              onChange={(e) => setFeedbackText(e.target.value)}
                              placeholder="Mesajınızı buraya yazın..."
                              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-3 text-sm text-slate-900 dark:text-white focus:border-gold-500 outline-none mb-3"
                              rows={3}
                          />
                          <div className="flex gap-2">
                              <button 
                                  onClick={handleSendFeedback}
                                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2"
                              >
                                  <Send size={16} /> Gönder
                              </button>
                              <a 
                                  href="mailto:destek@medmatch.com"
                                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
                              >
                                  Email
                              </a>
                          </div>
                      </div>
                  </div>

                  {/* Emergency Button */}
                  <div className="pt-4 pb-8">
                      <button 
                          onClick={handleEmergencyReport}
                          className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 animate-pulse"
                      >
                          <AlertTriangle size={20} fill="currentColor" className="text-white" />
                          ACİL YARDIM / İHBAR
                      </button>
                      <p className="text-center text-[10px] text-slate-400 mt-2">
                          Taciz, tehdit veya acil güvenlik durumlarında kullanın.
                      </p>
                  </div>
              </div>
          </div>
      )}

      {/* Community Guidelines Modal (Settings View) */}
      {showGuidelines && (
          <CommunityGuidelines 
              mode="VIEW" 
              onClose={() => setShowGuidelines(false)} 
          />
      )}

      {/* Referral Modal */}
      {showReferralModal && profile.referralData && (
          <div className="fixed inset-0 z-[70] bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
              {/* ... (Referral Modal Content remains unchanged) ... */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm shadow-2xl relative overflow-hidden flex flex-col">
                  {/* Header */}
                  <div className="bg-gradient-to-r from-blue-900 to-purple-900 p-6 text-center relative">
                      <button onClick={() => setShowReferralModal(false)} className="absolute top-4 right-4 text-white/70 hover:text-white">
                          <X size={20} />
                      </button>
                      <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-3 backdrop-blur-md border border-white/20">
                          <Gift size={32} className="text-gold-400" />
                      </div>
                      <h3 className="text-xl font-serif font-bold text-white mb-1">Invite & Earn</h3>
                      <p className="text-blue-100 text-xs">Invite colleagues, get free Premium!</p>
                  </div>

                  <div className="p-6 space-y-6">
                      {/* Campaign Progress */}
                      <div>
                          <div className="flex justify-between text-xs font-bold uppercase text-slate-400 mb-2">
                              <span>3 Friends Campaign</span>
                              <span className="text-gold-500">{profile.referralData.invitedCount}/3 Joined</span>
                          </div>
                          <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
                              <div 
                                  className="h-full bg-gradient-to-r from-gold-600 to-gold-400 transition-all duration-1000 ease-out"
                                  style={{ width: `${Math.min(100, (profile.referralData.invitedCount / 3) * 100)}%` }}
                              ></div>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-2 text-center">
                              Invite 3 healthcare professionals to unlock 1 Month of Vitalis Premium! 🏆
                          </p>
                      </div>

                      {/* Code Section */}
                      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 text-center">
                          <p className="text-xs text-slate-400 uppercase font-bold mb-2">Your Invite Code</p>
                          <div className="flex items-center gap-2 justify-center mb-3">
                              <span className="text-2xl font-mono font-bold text-white tracking-widest">{profile.referralData.code}</span>
                              <button onClick={handleCopyCode} className="p-2 hover:bg-slate-700 rounded-full transition-colors text-slate-400 hover:text-white">
                                  <Copy size={16} />
                              </button>
                          </div>
                          <p className="text-[10px] text-slate-500 leading-tight">
                              Share this code with verified healthcare workers only.
                          </p>
                      </div>

                      {/* Share Buttons */}
                      <div className="grid grid-cols-2 gap-3">
                          <button onClick={handleShareWhatsApp} className="flex items-center justify-center gap-2 py-3 rounded-xl bg-green-600 hover:bg-green-500 text-white font-bold text-xs transition-colors">
                              <MessageCircle size={16} /> WhatsApp
                          </button>
                          <button onClick={handleShareSMS} className="flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors">
                              <MessageSquareMore size={16} /> SMS
                          </button>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-3 gap-2 border-t border-slate-800 pt-4">
                          <div className="text-center">
                              <div className="text-lg font-bold text-white">{profile.referralData.invitedCount}</div>
                              <div className="text-[9px] text-slate-500 uppercase">Invited</div>
                          </div>
                          <div className="text-center border-l border-slate-800">
                              <div className="text-lg font-bold text-green-400">{profile.referralData.joinedCount}</div>
                              <div className="text-[9px] text-slate-500 uppercase">Joined</div>
                          </div>
                          <div className="text-center border-l border-slate-800">
                              <div className="text-lg font-bold text-gold-500">{profile.referralData.totalRewardsEarned}d</div>
                              <div className="text-[9px] text-slate-500 uppercase">Earned</div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Freeze Account Modal (Keep for direct access if needed, or remove since it's in Account Mgmt now) */}
      {/* We keep it because other buttons might trigger it directly */}
      {showFreezeModal && !showAccountMgmt && (
          <div className="fixed inset-0 z-[60] bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm shadow-2xl relative overflow-hidden">
                  <div className="p-6">
                      <div className="flex justify-between items-center mb-6">
                          <h3 className="text-xl font-serif font-bold text-white flex items-center gap-2">
                              <PauseCircle className="text-blue-400" size={24} />
                              Hesabı Dondur
                          </h3>
                          <button onClick={() => setShowFreezeModal(false)} className="text-slate-500 hover:text-white">
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
                              className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors shadow-lg"
                          >
                              Hesabı Dondur
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Verification Modal */}
      {verificationType && (
          <div className="fixed inset-0 z-[80] bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden">
                  <div className="p-6">
                      <div className="flex justify-between items-center mb-6">
                          <h3 className="text-xl font-serif font-bold text-white flex items-center gap-2">
                              {verificationType === 'PHOTO' && <Camera className="text-blue-400" size={24} />}
                              {verificationType === 'PHONE' && <Smartphone className="text-green-400" size={24} />}
                              {verificationType === 'EMAIL' && <Mail className="text-purple-400" size={24} />}
                              {verificationType === 'PHOTO' ? 'Photo Verify' : verificationType === 'PHONE' ? 'Phone Verify' : 'Email Verify'}
                          </h3>
                          <button onClick={closeVerificationModal} className="text-slate-500 hover:text-white">
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
      )}

      {/* Question Selection Modal */}
      {isQuestionModalOpen && (
          <div className="fixed inset-0 z-[70] bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm shadow-2xl relative flex flex-col max-h-[80vh]">
                  <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                      <h3 className="text-lg font-serif font-bold text-white">Soru Seç</h3>
                      <button onClick={() => setIsQuestionModalOpen(false)} className="text-slate-500 hover:text-white"><X size={20}/></button>
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
      )}
    </div>
  );
};
