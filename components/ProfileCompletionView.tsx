import React, { useState, useCallback } from 'react';
import {
    Briefcase, Clock, DollarSign, Plane,
    ChevronRight, Loader2, X
} from 'lucide-react';
import type { WorkStyle, ShiftFrequency, LivingStatus, SalaryRange } from '../types';

interface ProfileCompletionViewProps {
    onComplete: (data: ProfileCompletionData) => void;
    onSkip: () => void;
}

export interface ProfileCompletionData {
    workStyle?: WorkStyle;
    shiftFrequency?: ShiftFrequency;
    livingStatus?: LivingStatus;
    salaryRange?: SalaryRange;
    abroadExperience?: boolean;
}

const WORK_STYLE_OPTIONS: { value: WorkStyle; label: string; icon: React.ReactNode }[] = [
    { value: 'FULL_TIME', label: 'Tam Zamanlı', icon: <Briefcase size={16} /> },
    { value: 'PART_TIME', label: 'Yarı Zamanlı', icon: <Clock size={16} /> },
    { value: 'FREELANCE', label: 'Serbest', icon: <DollarSign size={16} /> },
    { value: 'ACADEMIC', label: 'Akademik', icon: <Briefcase size={16} /> },
];

const SHIFT_OPTIONS: { value: ShiftFrequency; label: string }[] = [
    { value: 'NONE', label: 'Nöbetim yok' },
    { value: 'WEEKLY_1_2', label: 'Haftada 1-2' },
    { value: 'WEEKLY_3_4', label: 'Haftada 3-4' },
    { value: 'DAILY', label: 'Her gün' },
];

const LIVING_OPTIONS: { value: LivingStatus; label: string }[] = [
    { value: 'ALONE', label: 'Yalnız' },
    { value: 'FAMILY', label: 'Aile ile' },
    { value: 'ROOMMATE', label: 'Ev arkadaşı ile' },
];

const SALARY_OPTIONS: { value: SalaryRange; label: string }[] = [
    { value: 'RANGE_1', label: '0 – 30.000 ₺' },
    { value: 'RANGE_2', label: '30.000 – 60.000 ₺' },
    { value: 'RANGE_3', label: '60.000 – 100.000 ₺' },
    { value: 'RANGE_4', label: '100.000+ ₺' },
    { value: 'PREFER_NOT', label: 'Belirtmek istemiyorum' },
];

const chipBase = 'py-3 px-4 rounded-xl text-sm font-medium border transition-all';
const chipActive = 'border-gold-500 bg-gold-500/10 text-gold-400';
const chipInactive = 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-600';

export const ProfileCompletionView: React.FC<ProfileCompletionViewProps> = ({ onComplete, onSkip }) => {
    const [workStyle, setWorkStyle] = useState<WorkStyle | undefined>();
    const [shiftFrequency, setShiftFrequency] = useState<ShiftFrequency | undefined>();
    const [livingStatus, setLivingStatus] = useState<LivingStatus | undefined>();
    const [salaryRange, setSalaryRange] = useState<SalaryRange | undefined>();
    const [abroadExperience, setAbroadExperience] = useState<boolean | undefined>();
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = useCallback(() => {
        setIsSaving(true);
        setTimeout(() => {
            onComplete({ workStyle, shiftFrequency, livingStatus, salaryRange, abroadExperience });
        }, 400);
    }, [onComplete, workStyle, shiftFrequency, livingStatus, salaryRange, abroadExperience]);

    const hasAnyData = workStyle || shiftFrequency || livingStatus || salaryRange || abroadExperience !== undefined;

    return (
        <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center overflow-y-auto">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-950 to-gold-950/10" />

            <div className="relative z-10 w-full max-w-md px-6 py-10">
                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                    <h1 className="text-2xl font-serif font-bold text-white">Profilini Tamamla</h1>
                    <button
                        onClick={onSkip}
                        className="text-slate-500 hover:text-slate-300 text-sm font-medium flex items-center gap-1 transition-colors"
                    >
                        <X size={14} /> Atla
                    </button>
                </div>
                <p className="text-slate-400 text-sm mb-8">
                    Daha iyi eşleşmeler için birkaç bilgi daha. Tümü opsiyoneldir.
                </p>

                {/* Work Style */}
                <div className="mb-6">
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-2 block">Çalışma Şekli</label>
                    <div className="grid grid-cols-2 gap-2">
                        {WORK_STYLE_OPTIONS.map(opt => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => setWorkStyle(workStyle === opt.value ? undefined : opt.value)}
                                className={`flex items-center gap-2 ${chipBase} ${workStyle === opt.value ? chipActive : chipInactive}`}
                            >
                                {opt.icon} {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Shift Frequency */}
                <div className="mb-6">
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-2 block">Nöbet Sıklığı</label>
                    <div className="grid grid-cols-2 gap-2">
                        {SHIFT_OPTIONS.map(opt => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => setShiftFrequency(shiftFrequency === opt.value ? undefined : opt.value)}
                                className={`${chipBase} ${shiftFrequency === opt.value ? chipActive : chipInactive}`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Living Status */}
                <div className="mb-6">
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-2 block">Yaşam Tercihi</label>
                    <div className="flex gap-2">
                        {LIVING_OPTIONS.map(opt => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => setLivingStatus(livingStatus === opt.value ? undefined : opt.value)}
                                className={`flex-1 ${chipBase} ${livingStatus === opt.value ? chipActive : chipInactive}`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Salary Range */}
                <div className="mb-6">
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-2 block">
                        <span className="flex items-center gap-1"><DollarSign size={12} /> Maaş Aralığı</span>
                    </label>
                    <div className="space-y-2">
                        {SALARY_OPTIONS.map(opt => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => setSalaryRange(salaryRange === opt.value ? undefined : opt.value)}
                                className={`w-full text-left ${chipBase} ${salaryRange === opt.value ? chipActive : chipInactive}`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Abroad Experience */}
                <div className="mb-8">
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-2 block">
                        <span className="flex items-center gap-1"><Plane size={12} /> Yurtdışı Deneyim</span>
                    </label>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => setAbroadExperience(abroadExperience === true ? undefined : true)}
                            className={`flex-1 ${chipBase} ${abroadExperience === true ? chipActive : chipInactive}`}
                        >
                            Evet
                        </button>
                        <button
                            type="button"
                            onClick={() => setAbroadExperience(abroadExperience === false ? undefined : false)}
                            className={`flex-1 ${chipBase} ${abroadExperience === false ? chipActive : chipInactive}`}
                        >
                            Hayır
                        </button>
                    </div>
                </div>

                {/* Save Button */}
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className={`w-full py-4 rounded-xl bg-gradient-to-r from-gold-600 to-gold-400 text-slate-950 font-bold text-lg shadow-lg transition-all flex items-center justify-center gap-2 ${isSaving ? 'opacity-80 cursor-not-allowed' : 'hover:scale-[1.02]'
                        }`}
                >
                    {isSaving ? (
                        <>
                            <Loader2 size={20} className="animate-spin" />
                            Kaydediliyor...
                        </>
                    ) : (
                        <>
                            {hasAnyData ? 'Kaydet ve Devam Et' : 'Devam Et'}
                            <ChevronRight size={20} />
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};
