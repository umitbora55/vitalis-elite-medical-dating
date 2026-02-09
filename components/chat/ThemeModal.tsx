import React from 'react';
import { Image as ImageIcon, Lock, X } from 'lucide-react';
import { ChatTheme } from '../../types';
import { BACKGROUND_OPTIONS, CHAT_THEME_PRESETS } from '../../constants';

type ThemeTab = 'COLORS' | 'BACKGROUNDS';

type BackgroundOption = (typeof BACKGROUND_OPTIONS)[number];

interface ThemeModalProps {
  isOpen: boolean;
  tempTheme: ChatTheme;
  activeThemeTab: ThemeTab;
  isPremium: boolean;
  onClose: () => void;
  onSelectTab: (tab: ThemeTab) => void;
  onSelectTheme: (theme: ChatTheme) => void;
  onSelectBackground: (bg: BackgroundOption) => void;
  onApply: () => void;
}

export const ThemeModal: React.FC<ThemeModalProps> = ({
  isOpen,
  tempTheme,
  activeThemeTab,
  isPremium,
  onClose,
  onSelectTab,
  onSelectTheme,
  onSelectBackground,
  onApply,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm shadow-2xl flex flex-col max-h-[85vh]">
        <div className="flex justify-between items-center p-6 pb-2">
          <h3 className="text-xl font-serif text-white">Customize Chat</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <div className="flex px-6 mb-4 gap-4 border-b border-slate-800">
          <button
            onClick={() => onSelectTab('COLORS')}
            className={`pb-2 text-sm font-bold uppercase tracking-wide transition-colors ${
              activeThemeTab === 'COLORS'
                ? 'text-gold-500 border-b-2 border-gold-500'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Color Themes
          </button>
          <button
            onClick={() => onSelectTab('BACKGROUNDS')}
            className={`pb-2 text-sm font-bold uppercase tracking-wide transition-colors ${
              activeThemeTab === 'BACKGROUNDS'
                ? 'text-gold-500 border-b-2 border-gold-500'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Backgrounds
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6 hide-scrollbar">
          <div
            className={`mb-6 p-4 rounded-xl border ${
              tempTheme.isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'
            }`}
            style={{ backgroundImage: tempTheme.backgroundImage, backgroundSize: 'cover' }}
          >
            <div className="flex justify-end mb-2">
              <div
                className={`px-4 py-2 rounded-2xl rounded-tr-none text-xs ${
                  tempTheme.primaryColor
                } ${tempTheme.textColor}`}
              >
                Hey, how are you?
              </div>
            </div>
            <div className="flex justify-start">
              <div
                className={`px-4 py-2 rounded-2xl rounded-tl-none text-xs ${
                  tempTheme.secondaryColor
                } ${tempTheme.textColor}`}
              >
                I'm good! Love this theme.
              </div>
            </div>
          </div>

          {activeThemeTab === 'COLORS' && (
            <div className="grid grid-cols-2 gap-3">
              {Object.values(CHAT_THEME_PRESETS).map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => onSelectTheme(theme)}
                  className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${
                    tempTheme.id === theme.id || tempTheme.name === theme.name
                      ? 'bg-slate-800 border-gold-500 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-600'
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full ${theme.primaryColor} border border-white/10 shadow-sm`}
                  ></div>
                  <span className="text-sm font-medium text-slate-300">{theme.name}</span>
                </button>
              ))}
            </div>
          )}

          {activeThemeTab === 'BACKGROUNDS' && (
            <div className="grid grid-cols-2 gap-3">
              {BACKGROUND_OPTIONS.map((bg) => (
                <button
                  key={bg.id}
                  onClick={() => onSelectBackground(bg)}
                  className={`relative h-20 rounded-xl border overflow-hidden transition-all group ${
                    tempTheme.backgroundImage === bg.css ||
                    (bg.url && tempTheme.backgroundImage?.includes(bg.url)) ||
                    (bg.type === 'COLOR' && !tempTheme.backgroundImage)
                      ? 'border-gold-500 shadow-md scale-[1.02]'
                      : 'border-slate-800 hover:border-slate-600'
                  }`}
                >
                  {bg.type === 'COLOR' && <div className="absolute inset-0 bg-slate-900"></div>}
                  {bg.type === 'GRADIENT' && <div className={`absolute inset-0 ${bg.css}`}></div>}
                  {bg.type === 'PATTERN' && (
                    <div
                      className="absolute inset-0 bg-slate-900"
                      style={{ backgroundImage: `url(${bg.url})` }}
                    ></div>
                  )}
                  {bg.type === 'IMAGE' && (
                    <div className="absolute inset-0 bg-slate-800 flex items-center justify-center">
                      <ImageIcon size={24} className="text-slate-500" />
                    </div>
                  )}

                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/10 transition-colors">
                    <span className="text-xs font-bold text-white shadow-sm">{bg.name}</span>
                  </div>

                  {bg.isPremium && !isPremium && (
                    <div className="absolute top-1 right-1 bg-black/60 rounded-full p-1">
                      <Lock size={12} className="text-gold-500" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 pt-2 border-t border-slate-800">
          <button
            onClick={onApply}
            className="w-full py-3 rounded-xl bg-gold-500 text-white font-bold tracking-wide hover:bg-gold-600 transition-colors"
          >
            Apply Theme
          </button>
        </div>
      </div>
    </div>
  );
};
