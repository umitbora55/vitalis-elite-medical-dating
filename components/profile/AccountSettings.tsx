import React from 'react';
import { AlertTriangle, CheckCheck, Download, FileText, PauseCircle, Settings, Trash2, X } from 'lucide-react';

interface AccountSettingsProps {
  isOpen: boolean;
  dataRequestStatus: 'IDLE' | 'PROCESSING' | 'DONE';
  pushStatus: 'IDLE' | 'ENABLED' | 'ERROR';
  onClose: () => void;
  onRequestData: () => void;
  onEnablePush: () => void;
  onShowFreezeModal: () => void;
  onShowDeleteConfirm: () => void;
}

export const AccountSettings: React.FC<AccountSettingsProps> = ({
  isOpen,
  dataRequestStatus,
  pushStatus,
  onClose,
  onRequestData,
  onEnablePush,
  onShowFreezeModal,
  onShowDeleteConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-md flex flex-col animate-fade-in overflow-hidden">
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <h3 className="text-lg font-serif font-bold text-white flex items-center gap-2">
          <Settings size={20} className="text-slate-400" />
          Hesap Yonetimi
        </h3>
        <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white">
          <X size={24} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        <div>
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Download size={14} /> Veri Haklari (KVKK)
          </h4>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h5 className="text-white font-bold text-sm mb-2">Verilerimi Indir</h5>
            <p className="text-slate-400 text-xs mb-4 leading-relaxed">
              KVKK kapsaminda, tarafimizda saklanan tum kisisel verilerinizin (profil bilgileri,
              fotograflar, mesaj gecmisi, eslesmeler) bir kopyasini talep etme hakkina
              sahipsiniz.
            </p>
            <ul className="text-xs text-slate-500 space-y-2 mb-6 list-disc pl-4">
              <li>Verileriniz ZIP formatinda hazirlanir.</li>
              <li>Kayitli e-posta adresinize guvenli bir link olarak gonderilir.</li>
              <li>Hazirlama suresi yogunluga bagli olarak 24-48 saat surebilir.</li>
            </ul>

            {dataRequestStatus === 'DONE' ? (
              <div className="w-full py-3 bg-green-500/10 border border-green-500/30 text-green-500 rounded-xl flex items-center justify-center gap-2 text-sm font-bold">
                <CheckCheck size={18} /> Talep Alindi
              </div>
            ) : (
              <button
                onClick={onRequestData}
                disabled={dataRequestStatus === 'PROCESSING'}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"
              >
                {dataRequestStatus === 'PROCESSING' ? (
                  <>Hazirlaniyor...</>
                ) : (
                  <>
                    <FileText size={16} /> Talep Olustur
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        <div>
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Settings size={14} /> Bildirimler
          </h4>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
            <div>
              <h5 className="text-white font-bold text-sm">Push Bildirimleri</h5>
              <p className="text-slate-400 text-xs mt-1">Yeni match ve mesajlar icin aninda bildirim.</p>
            </div>
            <button
              onClick={onEnablePush}
              disabled={pushStatus === 'ENABLED'}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-60"
            >
              {pushStatus === 'ENABLED' ? 'Aktif' : 'Etkinlestir'}
            </button>
          </div>
          {pushStatus === 'ERROR' && (
            <p className="text-xs text-red-400 mt-2">Bildirim izni alinmadi.</p>
          )}
        </div>

        <div>
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <PauseCircle size={14} /> Hesap Durumu
          </h4>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
            <div>
              <h5 className="text-white font-bold text-sm">Hesabi Dondur</h5>
              <p className="text-slate-400 text-xs mt-1">Profilini gizle, verilerini koru.</p>
            </div>
            <button
              onClick={onShowFreezeModal}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition-colors"
            >
              Dondur
            </button>
          </div>
        </div>

        <div>
          <h4 className="text-xs font-bold text-red-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <AlertTriangle size={14} /> Tehlikeli Bolge
          </h4>
          <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-5">
            <h5 className="text-red-400 font-bold text-sm mb-2">Hesabimi Sil</h5>
            <p className="text-red-300/70 text-xs mb-4">
              Bu islem geri alinamaz. Hesabiniz, eslesmeleriniz ve mesajlariniz kalici olarak
              silinecektir.
            </p>
            <button
              onClick={onShowDeleteConfirm}
              className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-500 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 size={16} /> Hesabi Sil
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
