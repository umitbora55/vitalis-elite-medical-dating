import React, { useEffect, useMemo, useState } from 'react';
import { Profile, ReportReason } from '../types';
import { ChevronDown, MapPin, GraduationCap, Stethoscope, BadgeCheck, Check, Sparkles, Zap, Palette, HelpCircle, Shield, Camera, Smartphone, Mail, Info, MoreVertical, Ban, Flag, X } from 'lucide-react';
import { calculateCompatibility } from '../utils/compatibility';
import { PERSONALITY_OPTIONS } from '../constants';
import { VoiceIntroPlayer } from './VoiceIntroPlayer';

const INITIAL_NOW_MS = Date.now();

interface ProfileDetailViewProps {
    profile: Profile;
    onClose: () => void;
    onBlock?: (profileId: string) => void;
    onReport?: (profileId: string, reason: ReportReason) => void;
    currentUser?: Profile;
    /** ID of the logged-in user (for watermark + vouch) */
    currentUserId?: string;
}

export const ProfileDetailView: React.FC<ProfileDetailViewProps> = ({ profile, onClose, onBlock, onReport, currentUser, currentUserId: _currentUserId }) => {
    const [nowMs, setNowMs] = useState(INITIAL_NOW_MS);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [showBlockConfirm, setShowBlockConfirm] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
    const [showTrustScore, setShowTrustScore] = useState(false);

    useEffect(() => {
        // Avoid calling Date.now() during render (React purity lint rule),
        // and avoid synchronous setState inside effects (React set-state-in-effect lint rule).
        const immediateId = setTimeout(() => setNowMs(Date.now()), 0);

        if (profile.isAvailable && profile.availabilityExpiresAt) {
            const msUntilExpiry = profile.availabilityExpiresAt - Date.now();
            if (msUntilExpiry > 0) {
                const expiryId = setTimeout(() => setNowMs(Date.now()), msUntilExpiry + 50);

                return (): void => {
                    clearTimeout(immediateId);
                    clearTimeout(expiryId);
                };
            }
        }

        return (): void => clearTimeout(immediateId);
    }, [profile.isAvailable, profile.availabilityExpiresAt]);

    useEffect(() => {
        const handleEscape = (event: KeyboardEvent): void => {
            if (event.key !== 'Escape') return;
            if (showBlockConfirm) setShowBlockConfirm(false);
            if (showReportModal) setShowReportModal(false);
            if (showTrustScore) setShowTrustScore(false);
            if (isMenuOpen) setIsMenuOpen(false);
        };
        window.addEventListener('keydown', handleEscape);
        return (): void => window.removeEventListener('keydown', handleEscape);
    }, [isMenuOpen, showBlockConfirm, showReportModal, showTrustScore]);

    const isAvailableNow =
        profile.isAvailable &&
        (!profile.availabilityExpiresAt || profile.availabilityExpiresAt > nowMs);

    const matchStats = useMemo(() => calculateCompatibility(currentUser, profile), [currentUser, profile]);

    const handleBlockConfirm = (): void => {
        if (onBlock) onBlock(profile.id);
        setShowBlockConfirm(false);
    };

    const handleReportSubmit = (): void => {
        if (onReport && selectedReason) {
            onReport(profile.id, selectedReason);
            setShowReportModal(false);
        }
    };

    const getDistanceText = (): string => {
        if (profile.isLocationHidden) return 'Nearby';
        if (profile.distance > 50) return '50+ km';
        return `${profile.distance} km`;
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-950 overflow-y-auto animate-fade-in pb-24 no-scrollbar">
            {/* Sticky Header with Actions - Agent 4: Better touch targets */}
            <div className="fixed top-0 left-0 right-0 p-5 z-50 flex justify-between bg-gradient-to-b from-black/70 via-black/40 to-transparent pointer-events-none safe-top">
                {/* Menu Button */}
                <div className="relative pointer-events-auto">
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        aria-label="Open profile actions"
                        className="btn-icon glass-dark hover:bg-white/20"
                    >
                        <MoreVertical size={22} strokeWidth={2} />
                    </button>

                    {/* Dropdown Menu - Agent 3: Premium dropdown */}
                    {isMenuOpen && (
                        <div className="absolute top-14 left-0 w-52 card-premium bg-slate-900/95 backdrop-blur-xl shadow-2xl overflow-hidden animate-scale-in z-50">
                            <button
                                onClick={() => { setShowReportModal(true); setIsMenuOpen(false); }}
                                className="w-full px-4 py-3.5 flex items-center gap-3 text-left hover:bg-slate-800/80 transition-colors"
                            >
                                <Flag size={18} className="text-orange-400" />
                                <span className="text-sm font-medium text-slate-200">Report Profile</span>
                            </button>
                            <div className="h-px bg-slate-800/60 mx-3"></div>
                            <button
                                onClick={() => { setShowBlockConfirm(true); setIsMenuOpen(false); }}
                                className="w-full px-4 py-3.5 flex items-center gap-3 text-left hover:bg-red-500/10 transition-colors"
                            >
                                <Ban size={18} className="text-red-500" />
                                <span className="text-sm font-medium text-red-400">Block {profile.name}</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* Close Button */}
                <button
                    onClick={onClose}
                    aria-label="Close profile details"
                    className="pointer-events-auto btn-icon glass-dark hover:bg-gold-500 hover:border-gold-500 transition-all duration-200"
                >
                    <ChevronDown size={24} strokeWidth={2} />
                </button>
            </div>

            {/* Premium Header — no photo, pure typography */}
            <div className="pt-24 pb-8 px-6 flex flex-col items-center text-center">

                {/* Status pills */}
                <div className="flex items-center justify-center gap-2 mb-5">
                    <div className="flex items-center gap-1.5 bg-green-500/10 px-3 py-1.5 rounded-full border border-green-500/25">
                        <BadgeCheck size={11} className="text-green-400" fill="currentColor" stroke="black" />
                        <span className="text-[10px] font-bold text-green-400 uppercase tracking-widest">Verified Healthcare</span>
                    </div>
                    {isAvailableNow && (
                        <div className="flex items-center gap-1.5 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-400/25">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Available Now</span>
                        </div>
                    )}
                </div>

                {/* Name */}
                <h1 className="text-5xl font-serif font-bold text-white leading-tight tracking-tight mb-1">
                    {profile.name}
                    <span className="text-3xl font-light text-white/40 ml-3">{profile.age}</span>
                </h1>

                {/* Gold divider — centered */}
                <div className="w-12 h-[2px] bg-gradient-to-r from-gold-400/0 via-gold-500 to-gold-400/0 rounded-full mt-3 mb-4" />

                {/* Role */}
                <div className="flex items-center justify-center gap-2 mb-1.5">
                    <Stethoscope size={14} className="text-gold-500" />
                    <span className="text-gold-400 font-bold text-sm uppercase tracking-widest">{profile.role}</span>
                    <span className="text-slate-600">·</span>
                    <span className="text-slate-300 text-sm">{profile.subSpecialty || profile.specialty}</span>
                </div>

                {/* Location */}
                <div className="flex items-center justify-center gap-1.5 text-slate-500">
                    <MapPin size={12} />
                    <span className="text-xs">{profile.institutionHidden ? 'Private Institution' : profile.hospital}</span>
                    <span className="text-slate-700 text-xs">·</span>
                    <span className="text-xs">{getDistanceText()} away</span>
                </div>
            </div>


            {/* Content Section */}
            <div className="px-5 pt-6 pb-28 flex flex-col gap-6 max-w-lg mx-auto w-full">

                {/* Verification badges row */}
                <button
                    type="button"
                    onClick={() => setShowTrustScore(true)}
                    className="flex items-center gap-3 group"
                >
                    {profile.verificationBadges?.photo && (
                        <div className="w-7 h-7 bg-blue-500/15 rounded-full flex items-center justify-center border border-blue-500/40 text-blue-400"><Camera size={13} /></div>
                    )}
                    {profile.verificationBadges?.phone && (
                        <div className="w-7 h-7 bg-green-500/15 rounded-full flex items-center justify-center border border-green-500/40 text-green-400"><Smartphone size={13} /></div>
                    )}
                    {profile.verificationBadges?.email && (
                        <div className="w-7 h-7 bg-purple-500/15 rounded-full flex items-center justify-center border border-purple-500/40 text-purple-400"><Mail size={13} /></div>
                    )}
                    <span className="text-xs text-slate-500 group-hover:text-gold-500 transition-colors flex items-center gap-1">
                        {Object.values(profile.verificationBadges || {}).filter(Boolean).length} Verifications <Info size={10} />
                    </span>
                </button>

                {/* Compatibility Card */}
                <div className="relative rounded-2xl overflow-hidden border border-slate-800/60 bg-slate-900/40">
                    <div className={`absolute top-0 left-0 w-[3px] h-full ${matchStats.labelColor} rounded-l-2xl`} />
                    <div className="px-5 py-4">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] flex items-center gap-1.5 mb-0.5">
                                    <Zap size={11} className="text-gold-500" fill="currentColor" /> Compatibility
                                </h3>
                                <p className="text-[10px] text-slate-600">Based on profile & interests</p>
                            </div>
                            <span className={`text-3xl font-serif font-bold ${matchStats.color}`}>{matchStats.score}<span className="text-sm font-sans font-normal text-slate-500 ml-0.5">%</span></span>
                        </div>
                        <div className="space-y-2">
                            {matchStats.reasons.map((reason, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-sm text-slate-300">
                                    <div className={`w-3.5 h-3.5 rounded-full ${matchStats.labelColor} flex items-center justify-center flex-shrink-0`}>
                                        <Check size={8} className="text-black" strokeWidth={3} />
                                    </div>
                                    <span className="text-xs">{reason}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Voice Intro */}
                <div>
                    <VoiceIntroPlayer userId={profile.id} />
                </div>

                {/* Bio */}
                {profile.bio && (
                    <div>
                        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.2em] mb-3">About</p>
                        <p className="text-slate-200 leading-relaxed font-serif text-lg font-light">
                            &ldquo;{profile.bio}&rdquo;
                        </p>
                    </div>
                )}

                {/* Divider */}
                <div className="border-t border-slate-800/60" />

                {/* Q&A */}
                {profile.questions && profile.questions.length > 0 && (
                    <div>
                        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                            <HelpCircle size={11} className="text-gold-500" /> Get to Know
                        </p>
                        <div className="space-y-3">
                            {profile.questions.map((q) => {
                                const isCommon = currentUser?.questions?.some(myQ => myQ.question === q.question);
                                return (
                                    <div key={q.id} className={`p-4 rounded-xl border ${isCommon ? 'bg-gold-500/8 border-gold-500/25' : 'bg-slate-900/40 border-slate-800/60'}`}>
                                        {isCommon && (
                                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-gold-500 uppercase tracking-wider mb-2">
                                                <Sparkles size={9} /> You both answered this!
                                            </div>
                                        )}
                                        <p className="text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-wide">{q.question}</p>
                                        <p className="text-base text-slate-200 font-serif italic">&ldquo;{q.answer}&rdquo;</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Divider */}
                <div className="border-t border-slate-800/60" />

                {/* Personality Tags */}
                {profile.personalityTags && profile.personalityTags.length > 0 && (
                    <div>
                        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                            <Palette size={11} className="text-purple-400" /> Personality
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {profile.personalityTags.map(tagId => {
                                const tag = PERSONALITY_OPTIONS.find(opt => opt.id === tagId);
                                if (!tag) return null;
                                const isMatch = (currentUser?.personalityTags || []).includes(tagId);
                                return (
                                    <div key={tagId} className={`px-3 py-1.5 rounded-full border text-xs font-medium flex items-center gap-1.5 ${isMatch ? 'bg-gold-500/10 border-gold-500/40 text-gold-300' : 'bg-slate-900/50 border-slate-800 text-slate-300'}`}>
                                        <span>{tag.emoji}</span>
                                        <span>{tag.label}</span>
                                        {isMatch && <Sparkles size={8} className="text-gold-500" />}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Interests */}
                {profile.interests.length > 0 && (
                    <div>
                        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.2em] mb-3">Interests</p>
                        <div className="flex flex-wrap gap-2">
                            {profile.interests.map(interest => {
                                const isCommon = currentUser?.interests.includes(interest);
                                return (
                                    <span key={interest} className={`px-3 py-1.5 rounded-full border text-xs transition-all cursor-default flex items-center gap-1.5 ${isCommon ? 'bg-gold-500/15 border-gold-500/40 text-gold-300' : 'bg-slate-900/40 border-slate-800 text-slate-300'}`}>
                                        {interest}
                                        {isCommon && <Sparkles size={8} className="text-gold-500" />}
                                    </span>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Education */}
                <div className="flex items-center gap-3 p-4 rounded-xl border border-slate-800/60 bg-slate-900/30">
                    <div className="w-10 h-10 rounded-full bg-gold-500/10 border border-gold-500/20 flex items-center justify-center text-gold-500 flex-shrink-0">
                        <GraduationCap size={18} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-200">{profile.education}</p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">Medical School</p>
                    </div>
                </div>

                {/* Bottom watermark */}
                <div className="text-center pt-4">
                    <p className="text-[10px] text-slate-700 uppercase tracking-[0.3em]">Vitalis · Elite Medical Dating</p>
                </div>
            </div>

            {/* --- Trust Score / Badges Modal --- */}
            {showTrustScore && (
                <div className="fixed inset-0 z-[70] bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in" role="dialog" aria-modal="true" aria-label="Verification details">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm shadow-2xl relative overflow-hidden">
                        <div className="p-6 bg-slate-800/50 border-b border-slate-700 flex justify-between items-center">
                            <h3 className="text-lg font-serif font-bold text-white flex items-center gap-2">
                                <Shield size={20} className="text-gold-500" /> Trust Score
                            </h3>
                            <button onClick={() => setShowTrustScore(false)} aria-label="Close verification details" className="text-slate-500 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <p className="text-xs text-slate-400 mb-2">Verified information for {profile.name}:</p>

                            {/* License */}
                            <div className="flex items-start gap-3 p-3 bg-slate-900 rounded-xl border border-slate-800">
                                <div className="mt-0.5 w-8 h-8 bg-green-500/10 rounded-full flex items-center justify-center text-green-500">
                                    <BadgeCheck size={16} />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-slate-200">Professional License</h4>
                                    <p className="text-xs text-slate-500">Medical ID/Diploma manually verified.</p>
                                </div>
                            </div>

                            {/* Photo */}
                            {profile.verificationBadges?.photo ? (
                                <div className="flex items-start gap-3 p-3 bg-slate-900 rounded-xl border border-blue-500/20">
                                    <div className="mt-0.5 w-8 h-8 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-400">
                                        <Camera size={16} />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-slate-200">Photo Verified</h4>
                                        <p className="text-xs text-slate-500">Live selfie matched with profile photos.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 opacity-50 px-3">
                                    <div className="w-2 h-2 rounded-full bg-slate-700"></div>
                                    <span className="text-xs text-slate-500">Photo verification pending</span>
                                </div>
                            )}

                            {/* Phone */}
                            {profile.verificationBadges?.phone ? (
                                <div className="flex items-start gap-3 p-3 bg-slate-900 rounded-xl border border-green-500/20">
                                    <div className="mt-0.5 w-8 h-8 bg-green-500/10 rounded-full flex items-center justify-center text-green-400">
                                        <Smartphone size={16} />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-slate-200">Phone Verified</h4>
                                        <p className="text-xs text-slate-500">Number confirmed via SMS.</p>
                                    </div>
                                </div>
                            ) : null}

                            {/* Email */}
                            {profile.verificationBadges?.email ? (
                                <div className="flex items-start gap-3 p-3 bg-slate-900 rounded-xl border border-purple-500/20">
                                    <div className="mt-0.5 w-8 h-8 bg-purple-500/10 rounded-full flex items-center justify-center text-purple-400">
                                        <Mail size={16} />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-slate-200">Institutional Email</h4>
                                        <p className="text-xs text-slate-500">Confirmed professional email address.</p>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>
            )}

            {/* --- Block Confirmation Modal --- */}
            {showBlockConfirm && (
                <div className="fixed inset-0 z-[60] bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in" role="dialog" aria-modal="true" aria-label={`Block ${profile.name}`}>
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-xs w-full shadow-2xl">
                        <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4 border border-red-500/30">
                            <Ban size={28} className="text-red-500" />
                        </div>
                        <h3 className="text-xl font-serif text-white text-center mb-2">Block {profile.name}?</h3>
                        <p className="text-slate-400 text-center text-sm mb-6">
                            They won&apos;t be able to find your profile or send you messages. This action cannot be undone easily.
                        </p>
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={handleBlockConfirm}
                                className="w-full py-3 rounded-xl bg-red-500 text-white font-bold tracking-wide hover:bg-red-600 transition-colors"
                            >
                                Confirm Block
                            </button>
                            <button
                                onClick={() => setShowBlockConfirm(false)}
                                className="w-full py-3 rounded-xl bg-slate-800 text-slate-400 font-medium hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- Report Modal --- */}
            {showReportModal && (
                <div className="fixed inset-0 z-[60] bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in" role="dialog" aria-modal="true" aria-label={`Report ${profile.name}`}>
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl">
                        <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-4">
                            <h3 className="text-lg font-serif font-bold text-white">Report Profile</h3>
                            <button onClick={() => setShowReportModal(false)} aria-label="Close report modal" className="text-slate-500 hover:text-white"><X size={20} /></button>
                        </div>

                        <p className="text-slate-400 text-sm mb-4">Please select a reason for reporting {profile.name}:</p>

                        <div className="space-y-2 mb-6">
                            {Object.values(ReportReason).map((reason) => (
                                <button
                                    key={reason}
                                    onClick={() => setSelectedReason(reason)}
                                    className={`w-full text-left px-4 py-3 rounded-xl border transition-all flex justify-between items-center ${selectedReason === reason
                                        ? 'bg-slate-800 border-gold-500 text-white'
                                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-600'
                                        }`}
                                >
                                    <span className="text-sm font-medium">{reason}</span>
                                    {selectedReason === reason && <Check size={16} className="text-gold-500" />}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={handleReportSubmit}
                            disabled={!selectedReason}
                            className={`w-full py-3 rounded-xl font-bold tracking-wide transition-all ${selectedReason
                                ? 'bg-gold-500 text-white hover:bg-gold-600'
                                : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                                }`}
                        >
                            Submit Report
                        </button>
                    </div>
                </div>
            )}

        </div>
    );
};
