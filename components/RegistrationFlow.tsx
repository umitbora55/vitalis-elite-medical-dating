import React, { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { MedicalRole, Specialty, ROLE_SPECIALTIES } from '../types';
import { ChevronRight, Upload, FileCheck, ShieldCheck, CheckCircle2, AlertCircle, Loader2, User, Mail, Building2, Stethoscope, ChevronLeft, Lock, Info, GraduationCap } from 'lucide-react';
import { CommunityGuidelines } from './CommunityGuidelines';
import { getVerifiedDomain, sendVerificationOtp, verifyOtp } from '../services/verificationService';

interface RegistrationFlowProps {
  onComplete: (profileData: RegistrationFormData, verification: VerificationPayload) => void;
  onCancel: () => void;
}

type Step = 'BASIC' | 'PROFESSIONAL' | 'DOCUMENTS' | 'GUIDELINES' | 'PENDING';
type VerificationStep = 'EMAIL_INPUT' | 'EMAIL_OTP' | 'DOCUMENT';
type VerificationPayload = {
  method: 'EMAIL' | 'DOCUMENT';
  workEmail?: string;
  tier?: number;
  domain?: string;
  documentFile?: File;
};

const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_DOCUMENT_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

const registrationSchema = z.object({
  name: z.string().min(2, 'Full name is required'),
  age: z
    .string()
    .min(1, 'Age is required')
    .refine((value) => {
      const parsed = Number(value);
      return Number.isFinite(parsed) && parsed >= 18 && parsed <= 100;
    }, 'Enter a valid age'),
  gender: z.string().optional(),
  genderPreference: z.string().min(1, 'Kimi görmek istediğini seç'),
  city: z.string().min(2, 'Şehir gereklidir'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  phone: z.string().optional(),
  role: z
    .string()
    .min(1, 'Medical role is required')
    .refine((value) => Object.values(MedicalRole).includes(value as MedicalRole), 'Select a role'),
  specialty: z.string(),
  institution: z.string().optional(),
  university: z.string().min(2, 'Üniversite gereklidir'),
  graduationYear: z.string().optional(),
  experienceYears: z.string().optional(),
  lookingFor: z.string().optional(),
  smoking: z.string().optional(),
  drinking: z.string().optional(),
  document: z.string().min(1, 'Upload a document to continue'),
}).superRefine((data, ctx) => {
  const role = data.role as MedicalRole;
  const allowedSpecialties = ROLE_SPECIALTIES[role] ?? [];
  if (allowedSpecialties.length > 0 && !data.specialty) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Specialty is required', path: ['specialty'] });
  }
  if (data.specialty && !allowedSpecialties.includes(data.specialty as Specialty)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid specialty for this role', path: ['specialty'] });
  }
});

type RegistrationFormData = z.infer<typeof registrationSchema>;

type VerifiedDomainMatch = { domain: string; tier: number };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const parseVerifiedDomainMatch = (value: unknown): VerifiedDomainMatch | null => {
  if (!isRecord(value)) return null;
  const domain = value.domain;
  const tier = value.tier;
  if (typeof domain !== 'string') return null;
  if (typeof tier !== 'number') return null;
  return { domain, tier };
};

const parseGetVerifiedDomainResult = (
  value: unknown,
): { domain: VerifiedDomainMatch | null; error: Error | null } => {
  if (!isRecord(value)) return { domain: null, error: new Error('Invalid verification response') };
  const domain = parseVerifiedDomainMatch(value.domain);
  const error = value.error instanceof Error ? value.error : null;
  return { domain, error };
};

// AUDIT-FIX: FE-001 — Removed isDev variable and associated dev bypass code

const COUNTRY_CODES = [
  { code: '+1', flag: '🇺🇸', country: 'US', placeholder: '(555) 123-4567' },
  { code: '+7', flag: '🇷🇺', country: 'RU', placeholder: '912 345-67-89' },
  { code: '+20', flag: '🇪🇬', country: 'EG', placeholder: '100 123 4567' },
  { code: '+27', flag: '🇿🇦', country: 'ZA', placeholder: '71 123 4567' },
  { code: '+30', flag: '🇬🇷', country: 'GR', placeholder: '691 234 5678' },
  { code: '+31', flag: '🇳🇱', country: 'NL', placeholder: '6 12345678' },
  { code: '+32', flag: '🇧🇪', country: 'BE', placeholder: '470 12 34 56' },
  { code: '+33', flag: '🇫🇷', country: 'FR', placeholder: '6 12 34 56 78' },
  { code: '+34', flag: '🇪🇸', country: 'ES', placeholder: '612 34 56 78' },
  { code: '+36', flag: '🇭🇺', country: 'HU', placeholder: '20 123 4567' },
  { code: '+39', flag: '🇮🇹', country: 'IT', placeholder: '312 345 6789' },
  { code: '+40', flag: '🇷🇴', country: 'RO', placeholder: '712 345 678' },
  { code: '+41', flag: '🇨🇭', country: 'CH', placeholder: '78 123 45 67' },
  { code: '+43', flag: '🇦🇹', country: 'AT', placeholder: '664 123 4567' },
  { code: '+44', flag: '🇬🇧', country: 'GB', placeholder: '7911 123456' },
  { code: '+45', flag: '🇩🇰', country: 'DK', placeholder: '20 12 34 56' },
  { code: '+46', flag: '🇸🇪', country: 'SE', placeholder: '70 123 45 67' },
  { code: '+47', flag: '🇳🇴', country: 'NO', placeholder: '406 12 345' },
  { code: '+48', flag: '🇵🇱', country: 'PL', placeholder: '512 345 678' },
  { code: '+49', flag: '🇩🇪', country: 'DE', placeholder: '151 2345 6789' },
  { code: '+52', flag: '🇲🇽', country: 'MX', placeholder: '55 1234 5678' },
  { code: '+54', flag: '🇦🇷', country: 'AR', placeholder: '11 2345-6789' },
  { code: '+55', flag: '🇧🇷', country: 'BR', placeholder: '11 91234-5678' },
  { code: '+56', flag: '🇨🇱', country: 'CL', placeholder: '9 1234 5678' },
  { code: '+57', flag: '🇨🇴', country: 'CO', placeholder: '301 234 5678' },
  { code: '+60', flag: '🇲🇾', country: 'MY', placeholder: '12 345 6789' },
  { code: '+61', flag: '🇦🇺', country: 'AU', placeholder: '412 345 678' },
  { code: '+62', flag: '🇮🇩', country: 'ID', placeholder: '812 3456 7890' },
  { code: '+63', flag: '🇵🇭', country: 'PH', placeholder: '917 123 4567' },
  { code: '+64', flag: '🇳🇿', country: 'NZ', placeholder: '21 123 4567' },
  { code: '+65', flag: '🇸🇬', country: 'SG', placeholder: '9123 4567' },
  { code: '+66', flag: '🇹🇭', country: 'TH', placeholder: '81 234 5678' },
  { code: '+81', flag: '🇯🇵', country: 'JP', placeholder: '90 1234 5678' },
  { code: '+82', flag: '🇰🇷', country: 'KR', placeholder: '10 1234 5678' },
  { code: '+84', flag: '🇻🇳', country: 'VN', placeholder: '91 234 56 78' },
  { code: '+86', flag: '🇨🇳', country: 'CN', placeholder: '131 2345 6789' },
  { code: '+90', flag: '🇹🇷', country: 'TR', placeholder: '531 234 56 78' },
  { code: '+91', flag: '🇮🇳', country: 'IN', placeholder: '91234 56789' },
  { code: '+351', flag: '🇵🇹', country: 'PT', placeholder: '912 345 678' },
  { code: '+353', flag: '🇮🇪', country: 'IE', placeholder: '85 123 4567' },
  { code: '+380', flag: '🇺🇦', country: 'UA', placeholder: '50 123 4567' },
  { code: '+420', flag: '🇨🇿', country: 'CZ', placeholder: '601 123 456' },
  { code: '+966', flag: '🇸🇦', country: 'SA', placeholder: '51 234 5678' },
  { code: '+971', flag: '🇦🇪', country: 'AE', placeholder: '50 123 4567' },
] as const;

const PERSONAL_EMAIL_DOMAINS = new Set([
  'gmail.com', 'googlemail.com',
  'hotmail.com', 'hotmail.co.uk', 'hotmail.fr', 'hotmail.de', 'hotmail.it',
  'outlook.com', 'outlook.co.uk', 'outlook.fr', 'outlook.de',
  'live.com', 'live.co.uk', 'live.fr',
  'msn.com',
  'yahoo.com', 'yahoo.co.uk', 'yahoo.fr', 'yahoo.de', 'yahoo.co.jp',
  'ymail.com',
  'aol.com',
  'icloud.com', 'me.com', 'mac.com',
  'protonmail.com', 'proton.me',
  'mail.com',
  'zoho.com',
  'yandex.com', 'yandex.ru',
  'mail.ru',
]);

const isPersonalEmailDomain = (email: string): boolean => {
  const atIndex = email.lastIndexOf('@');
  if (atIndex === -1) return false;
  const domain = email.slice(atIndex + 1).toLowerCase().trim();
  return PERSONAL_EMAIL_DOMAINS.has(domain);
};

export const RegistrationFlow: React.FC<RegistrationFlowProps> = ({ onComplete, onCancel }) => {
  const [step, setStep] = useState<Step>('BASIC');
  const [verificationStep, setVerificationStep] = useState<VerificationStep>('EMAIL_INPUT');
  const [workEmail, setWorkEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [matchedDomain, setMatchedDomain] = useState<{ domain: string; tier: number } | null>(null);
  const [countryCode, setCountryCode] = useState('+90');
  const {
    register,
    trigger,
    setValue,
    setError,
    clearErrors,
    getValues,
    watch,
    formState: { errors },
  } = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    mode: 'onBlur',
    defaultValues: {
      name: '',
      age: '',
      gender: '',
      genderPreference: '',
      city: '',
      email: '',
      password: '',
      phone: '',
      role: '',
      specialty: '',
      institution: '',
      university: '',
      graduationYear: '',
      experienceYears: '',
      lookingFor: '',
      smoking: '',
      drinking: '',
      document: '',
    },
  });

  const formData = watch();
  const isPersonalEmail = formData.email ? isPersonalEmailDomain(formData.email) : false;

  // Role-based specialty filtering
  const selectedRole = formData.role as MedicalRole;
  const allowedSpecialties = selectedRole ? (ROLE_SPECIALTIES[selectedRole] ?? []) : [];
  const roleHasSpecialties = allowedSpecialties.length > 0;

  // Reset specialty when role changes
  const prevRoleRef = useRef(formData.role);
  useEffect(() => {
    if (formData.role !== prevRoleRef.current) {
      prevRoleRef.current = formData.role;
      setValue('specialty', '', { shouldValidate: false });
    }
  }, [formData.role, setValue]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [submittedPending, setSubmittedPending] = useState(false);
  const getFieldError = (field: keyof RegistrationFormData): string | undefined => {
    const message = errors[field]?.message;
    return typeof message === 'string' ? message : undefined;
  };

  const getFieldErrorId = (field: keyof RegistrationFormData): string => `registration-${field}-error`;

  const handleBasicNext = async () => {
    const isValid = await trigger(['name', 'age', 'genderPreference', 'city', 'email', 'password']);
    if (isValid) setStep('PROFESSIONAL');
  };

  const handleProfessionalNext = async () => {
    const isValid = await trigger(['role', 'specialty', 'university']);
    if (isValid) {
      if (isPersonalEmail) {
        // Personal email users skip OTP and go directly to document upload
        setVerificationStep('DOCUMENT');
      } else {
        setVerificationStep('EMAIL_INPUT');
      }
      setStep('DOCUMENTS');
    }
  };

  const handleDocumentsNext = async () => {
    const isValid = await trigger(['document']);
    if (isValid) setStep('GUIDELINES');
  };

  const handleStartEmailVerification = async () => {
    setOtpError(null);
    setIsVerifyingEmail(true);
    try {
      const rawResult: unknown = await getVerifiedDomain(workEmail);
      const { domain, error } = parseGetVerifiedDomainResult(rawResult);

      if (error || !domain) {
        setOtpError('Kurumsal domain doğrulanamadı. Belge ile doğrulayın.');
        setVerificationStep('DOCUMENT');
        return;
      }

      setMatchedDomain({ domain: domain.domain, tier: domain.tier });
      const otpResult = await sendVerificationOtp(workEmail);
      if (otpResult.error) {
        setOtpError(otpResult.error.message);
        return;
      }

      setOtpSent(true);
      setVerificationStep('EMAIL_OTP');
    } catch {
      setOtpError('Doğrulama kodu gönderilemedi. İnternet bağlantınızı kontrol edin.');
    } finally {
      setIsVerifyingEmail(false);
    }
  };

  const handleVerifyOtp = async () => {
    setOtpError(null);
    setIsVerifyingEmail(true);
    try {
      const result = await verifyOtp(workEmail, otpCode);
      if (result.error) {
        setOtpError(result.error.message);
        return;
      }

      setStep('GUIDELINES');
    } catch {
      setOtpError('Kod doğrulanamadı. Lütfen tekrar deneyin.');
    } finally {
      setIsVerifyingEmail(false);
    }
  };

  // AUDIT-FIX: FE-001 — Removed buildVerificationPayload function (was only used by dev bypass button)

  useEffect(() => {
    if (step !== 'PENDING' || submittedPending) return;
    setSubmittedPending(true);
    const verification: VerificationPayload =
      verificationStep === 'EMAIL_OTP' && matchedDomain && otpSent
        ? {
          method: 'EMAIL',
          workEmail,
          tier: matchedDomain.tier,
          domain: matchedDomain.domain,
        }
        : { method: 'DOCUMENT', documentFile: documentFile ?? undefined };
    onComplete(getValues(), verification);
  }, [documentFile, getValues, matchedDomain, onComplete, otpSent, step, submittedPending, verificationStep, workEmail]);

  const renderVerification = () => (
    <div className="w-full max-w-md animate-fade-in">
      <button onClick={() => setStep('PROFESSIONAL')} className="mb-6 text-slate-500 hover:text-white flex items-center gap-1">
        <ChevronLeft size={16} /> Back
      </button>

      <div className="text-center mb-6">
        <h2 className="text-2xl font-serif text-white mb-2">
          {isPersonalEmail ? 'Belge ile Doğrulama' : 'Kurumsal Email Doğrulama'}
        </h2>
        <p className="text-slate-400 text-sm max-w-xs mx-auto">
          {isPersonalEmail
            ? 'Bireysel e-posta ile kayıt oldunuz. Hesabınızın aktif olması için mesleki belge yüklemeniz gerekmektedir.'
            : 'Kurumsal email adresinizi doğrulayarak hızlıca verified olun.'}
        </p>
      </div>

      {isPersonalEmail && verificationStep === 'DOCUMENT' && (
        <div className="flex items-start gap-3 bg-amber-900/20 border border-amber-500/30 rounded-xl p-4 mb-6">
          <Info size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-200/80 leading-relaxed">
            Bireysel e-posta adresi tespit edildi. Belgeniz yüklendikten sonra hesabınız incelemeye alınacak ve <strong className="text-amber-300">1-2 iş günü</strong> içinde onaylanacaktır.
          </p>
        </div>
      )}

      {verificationStep === 'EMAIL_INPUT' && (
        <div className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="work-email" className="text-xs font-bold text-slate-500 uppercase ml-1">Kurumsal Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-3.5 text-slate-500" size={18} />
              <input
                id="work-email"
                type="email"
                placeholder="ornek@saglik.gov.tr"
                value={workEmail}
                onChange={(e) => setWorkEmail(e.target.value)}
                aria-invalid={Boolean(otpError)}
                aria-describedby={otpError ? 'verification-error' : undefined}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-white focus-visible:outline-none focus-visible:border-gold-500 focus-visible:ring-2 focus-visible:ring-gold-500/40 transition-colors"
              />
            </div>
          </div>

          {otpError && <p id="verification-error" className="text-xs text-red-400" role="alert">{otpError}</p>}

          <button
            onClick={() => {
              void handleStartEmailVerification();
            }}
            disabled={!workEmail || isVerifyingEmail}
            className="w-full mt-4 py-4 rounded-xl bg-gradient-to-r from-gold-600 to-gold-400 text-slate-950 font-bold text-lg shadow-lg hover:scale-[1.02] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isVerifyingEmail ? <Loader2 size={18} className="animate-spin" /> : 'Kodu Gönder'}
          </button>

          <button
            onClick={() => setVerificationStep('DOCUMENT')}
            className="w-full py-3 rounded-xl border border-slate-800 text-slate-300 text-sm font-semibold hover:border-gold-500/50 transition-colors"
          >
            Belge ile doğrula
          </button>
        </div>
      )}

      {verificationStep === 'EMAIL_OTP' && (
        <div className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="verification-otp" className="text-xs font-bold text-slate-500 uppercase ml-1">Doğrulama Kodu</label>
            <input
              id="verification-otp"
              type="text"
              placeholder="123456"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              aria-invalid={Boolean(otpError)}
              aria-describedby={otpError ? 'verification-error' : undefined}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 px-4 text-white focus-visible:outline-none focus-visible:border-gold-500 focus-visible:ring-2 focus-visible:ring-gold-500/40 transition-colors"
            />
          </div>

          {otpError && <p id="verification-error" className="text-xs text-red-400" role="alert">{otpError}</p>}

          <button
            onClick={() => {
              void handleVerifyOtp();
            }}
            disabled={!otpCode || isVerifyingEmail}
            className="w-full mt-4 py-4 rounded-xl bg-gradient-to-r from-gold-600 to-gold-400 text-slate-950 font-bold text-lg shadow-lg hover:scale-[1.02] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isVerifyingEmail ? <Loader2 size={18} className="animate-spin" /> : 'Doğrula'}
          </button>
        </div>
      )}

      {verificationStep === 'DOCUMENT' && renderDocuments()}
    </div>
  );

  // --- Step 1: Basic Info ---
  const renderBasicInfo = () => (
    <div className="w-full max-w-md animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-serif text-white mb-2">Create Profile</h2>
        <p className="text-slate-400 text-sm">Let&apos;s start with the basics.</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1">
          <label htmlFor="registration-name" className="text-xs font-bold text-slate-500 uppercase ml-1">Full Name</label>
          <div className="relative">
            <User className="absolute left-4 top-3.5 text-slate-500" size={18} />
            <input
              id="registration-name"
              type="text"
              placeholder="Dr. Jane Doe"
              {...register('name')}
              aria-invalid={Boolean(getFieldError('name'))}
              aria-describedby={getFieldError('name') ? getFieldErrorId('name') : undefined}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-white focus-visible:outline-none focus-visible:border-gold-500 focus-visible:ring-2 focus-visible:ring-gold-500/40 transition-colors"
            />
          </div>
          {errors.name && <p id={getFieldErrorId('name')} className="text-xs text-red-400 mt-1" role="alert">{errors.name.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label htmlFor="registration-age" className="text-xs font-bold text-slate-500 uppercase ml-1">Age</label>
            <select
              id="registration-age"
              {...register('age')}
              aria-invalid={Boolean(getFieldError('age'))}
              aria-describedby={getFieldError('age') ? getFieldErrorId('age') : undefined}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 px-4 text-white focus-visible:outline-none focus-visible:border-gold-500 focus-visible:ring-2 focus-visible:ring-gold-500/40 transition-colors appearance-none"
            >
              <option value="">Select</option>
              {Array.from({ length: 63 }, (_, i) => i + 18).map(age => (
                <option key={age} value={String(age)}>{age}</option>
              ))}
            </select>
            {errors.age && <p id={getFieldErrorId('age')} className="text-xs text-red-400 mt-1" role="alert">{errors.age.message}</p>}
          </div>
          <div className="space-y-1">
            <label htmlFor="registration-gender" className="text-xs font-bold text-slate-500 uppercase ml-1">Gender</label>
            <select
              id="registration-gender"
              {...register('gender')}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 px-4 text-white focus-visible:outline-none focus-visible:border-gold-500 focus-visible:ring-2 focus-visible:ring-gold-500/40 transition-colors appearance-none"
            >
              <option value="">Select</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Non-binary">Non-binary</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label htmlFor="registration-genderPreference" className="text-xs font-bold text-slate-500 uppercase ml-1">Kimi Görmek İstiyorsun?</label>
            <select
              id="registration-genderPreference"
              {...register('genderPreference')}
              aria-invalid={Boolean(getFieldError('genderPreference'))}
              aria-describedby={getFieldError('genderPreference') ? getFieldErrorId('genderPreference') : undefined}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 px-4 text-white focus-visible:outline-none focus-visible:border-gold-500 focus-visible:ring-2 focus-visible:ring-gold-500/40 transition-colors appearance-none"
            >
              <option value="">Seçiniz</option>
              <option value="MALE">Erkek</option>
              <option value="FEMALE">Kadın</option>
              <option value="EVERYONE">Herkes</option>
            </select>
            {errors.genderPreference && <p id={getFieldErrorId('genderPreference')} className="text-xs text-red-400 mt-1" role="alert">{errors.genderPreference.message}</p>}
          </div>
          <div className="space-y-1">
            <label htmlFor="registration-city" className="text-xs font-bold text-slate-500 uppercase ml-1">Şehir</label>
            <input
              id="registration-city"
              type="text"
              placeholder="İstanbul"
              {...register('city')}
              aria-invalid={Boolean(getFieldError('city'))}
              aria-describedby={getFieldError('city') ? getFieldErrorId('city') : undefined}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 px-4 text-white focus-visible:outline-none focus-visible:border-gold-500 focus-visible:ring-2 focus-visible:ring-gold-500/40 transition-colors"
            />
            {errors.city && <p id={getFieldErrorId('city')} className="text-xs text-red-400 mt-1" role="alert">{errors.city.message}</p>}
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="registration-email" className="text-xs font-bold text-slate-500 uppercase ml-1">Email</label>
          <div className="relative">
            <Mail className="absolute left-4 top-3.5 text-slate-500" size={18} />
            <input
              id="registration-email"
              type="email"
              placeholder="jane@hospital.com"
              {...register('email')}
              aria-invalid={Boolean(getFieldError('email'))}
              aria-describedby={getFieldError('email') ? getFieldErrorId('email') : undefined}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-white focus-visible:outline-none focus-visible:border-gold-500 focus-visible:ring-2 focus-visible:ring-gold-500/40 transition-colors"
            />
          </div>
          {errors.email && <p id={getFieldErrorId('email')} className="text-xs text-red-400 mt-1" role="alert">{errors.email.message}</p>}

          {isPersonalEmail && !errors.email && (
            <div className="flex items-start gap-2.5 bg-amber-900/20 border border-amber-500/30 rounded-xl p-3 mt-2">
              <AlertCircle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-200/80 leading-relaxed">
                Bireysel e-posta adresi tespit edildi. Hesabınızın aktif olması için mesleki belge yüklemeniz gerekecektir. Onay süreci <strong className="text-amber-300">1-2 iş günü</strong> içinde tamamlanır.
              </p>
            </div>
          )}
        </div>

        <div className="space-y-1">
          <label htmlFor="registration-password" className="text-xs font-bold text-slate-500 uppercase ml-1">Password</label>
          <div className="relative">
            <Lock className="absolute left-4 top-3.5 text-slate-500" size={18} />
            <input
              id="registration-password"
              type="password"
              placeholder="Create a password"
              {...register('password')}
              aria-invalid={Boolean(getFieldError('password'))}
              aria-describedby={getFieldError('password') ? getFieldErrorId('password') : undefined}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-white focus-visible:outline-none focus-visible:border-gold-500 focus-visible:ring-2 focus-visible:ring-gold-500/40 transition-colors"
            />
          </div>
          {errors.password && <p id={getFieldErrorId('password')} className="text-xs text-red-400 mt-1" role="alert">{errors.password.message}</p>}
        </div>

        <div className="space-y-1">
          <label htmlFor="registration-phone" className="text-xs font-bold text-slate-500 uppercase ml-1">Phone</label>
          <div className="flex gap-2">
            <select
              value={countryCode}
              onChange={(e) => {
                setCountryCode(e.target.value);
                const currentPhone = formData.phone ?? '';
                const numberOnly = currentPhone.replace(/^\+\d+\s*/, '');
                setValue('phone', `${e.target.value} ${numberOnly}`);
              }}
              className="w-[100px] bg-slate-900 border border-slate-800 rounded-xl py-3 px-3 text-white text-sm focus-visible:outline-none focus-visible:border-gold-500 focus-visible:ring-2 focus-visible:ring-gold-500/40 transition-colors appearance-none flex-shrink-0"
            >
              {COUNTRY_CODES.map(c => (
                <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
              ))}
            </select>
            <div className="relative flex-1">
              <input
                id="registration-phone"
                type="tel"
                placeholder={COUNTRY_CODES.find(c => c.code === countryCode)?.placeholder ?? '555 000 0000'}
                onChange={(e) => {
                  setValue('phone', `${countryCode} ${e.target.value}`);
                }}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 px-4 text-white focus-visible:outline-none focus-visible:border-gold-500 focus-visible:ring-2 focus-visible:ring-gold-500/40 transition-colors"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 flex gap-3">
        <button onClick={onCancel} className="px-6 py-4 rounded-xl text-slate-400 font-bold hover:text-white transition-colors">
          Cancel
        </button>
        <button
          onClick={() => {
            void handleBasicNext();
          }}
          disabled={!formData.name || !formData.age || !formData.email || !formData.password || !formData.genderPreference || !formData.city}
          className="flex-1 py-4 rounded-xl bg-gradient-to-r from-gold-600 to-gold-400 text-slate-950 font-bold text-lg shadow-lg hover:scale-[1.02] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );

  // --- Step 2: Professional Info ---
  const renderProfessionalInfo = () => (
    <div className="w-full max-w-md animate-fade-in">
      <button onClick={() => setStep('BASIC')} className="mb-6 text-slate-500 hover:text-white flex items-center gap-1">
        <ChevronLeft size={16} /> Back
      </button>

      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-700">
          <Stethoscope size={32} className="text-gold-500" />
        </div>
        <h2 className="text-2xl font-serif text-white mb-2">Professional Verification</h2>
        <p className="text-slate-400 text-sm">Tell us about your medical career.</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1">
          <label htmlFor="registration-role" className="text-xs font-bold text-slate-500 uppercase ml-1">Medical Role</label>
          <select
            id="registration-role"
            {...register('role')}
            aria-invalid={Boolean(getFieldError('role'))}
            aria-describedby={getFieldError('role') ? getFieldErrorId('role') : undefined}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 px-4 text-white focus-visible:outline-none focus-visible:border-gold-500 focus-visible:ring-2 focus-visible:ring-gold-500/40 transition-colors appearance-none"
          >
            <option value="">Select Role</option>
            {Object.values(MedicalRole).map(role => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
          {errors.role && <p id={getFieldErrorId('role')} className="text-xs text-red-400 mt-1" role="alert">{errors.role.message}</p>}
        </div>

        {roleHasSpecialties && (
          <div className="space-y-1">
            <label htmlFor="registration-specialty" className="text-xs font-bold text-slate-500 uppercase ml-1">Specialty</label>
            <select
              id="registration-specialty"
              {...register('specialty')}
              aria-invalid={Boolean(getFieldError('specialty'))}
              aria-describedby={getFieldError('specialty') ? getFieldErrorId('specialty') : undefined}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 px-4 text-white focus-visible:outline-none focus-visible:border-gold-500 focus-visible:ring-2 focus-visible:ring-gold-500/40 transition-colors appearance-none"
            >
              <option value="">Select Specialty</option>
              {allowedSpecialties.map(spec => (
                <option key={spec} value={spec}>{spec}</option>
              ))}
            </select>
            {errors.specialty && (
              <p id={getFieldErrorId('specialty')} className="text-xs text-red-400 mt-1" role="alert">{errors.specialty.message}</p>
            )}
          </div>
        )}
        {!roleHasSpecialties && formData.role && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
            <p className="text-xs text-slate-400 text-center">No specialty selection needed for {formData.role}.</p>
          </div>
        )}

        <div className="space-y-1">
          <label htmlFor="registration-institution" className="text-xs font-bold text-slate-500 uppercase ml-1">Institution (Optional)</label>
          <div className="relative">
            <Building2 className="absolute left-4 top-3.5 text-slate-500" size={18} />
            <input
              id="registration-institution"
              type="text"
              placeholder="City General Hospital"
              {...register('institution')}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-white focus-visible:outline-none focus-visible:border-gold-500 focus-visible:ring-2 focus-visible:ring-gold-500/40 transition-colors"
            />
          </div>
        </div>

        {/* --- University (Required) --- */}
        <div className="space-y-1">
          <label htmlFor="registration-university" className="text-xs font-bold text-slate-500 uppercase ml-1">Üniversite</label>
          <div className="relative">
            <GraduationCap className="absolute left-4 top-3.5 text-slate-500" size={18} />
            <input
              id="registration-university"
              type="text"
              placeholder="İstanbul Tıp Fakültesi"
              {...register('university')}
              aria-invalid={Boolean(getFieldError('university'))}
              aria-describedby={getFieldError('university') ? getFieldErrorId('university') : undefined}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-white focus-visible:outline-none focus-visible:border-gold-500 focus-visible:ring-2 focus-visible:ring-gold-500/40 transition-colors"
            />
          </div>
          {errors.university && <p id={getFieldErrorId('university')} className="text-xs text-red-400 mt-1" role="alert">{errors.university.message}</p>}
        </div>

        {/* --- Optional Fields (Tier 2) --- */}
        <div className="mt-2 pt-4 border-t border-slate-800/60">
          <p className="text-xs font-bold text-slate-500 uppercase ml-1 mb-3">Opsiyonel Bilgiler</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="registration-graduationYear" className="text-xs font-bold text-slate-500 uppercase ml-1">Mezuniyet Yılı</label>
              <select
                id="registration-graduationYear"
                {...register('graduationYear')}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 px-4 text-white focus-visible:outline-none focus-visible:border-gold-500 focus-visible:ring-2 focus-visible:ring-gold-500/40 transition-colors appearance-none"
              >
                <option value="">Seçiniz</option>
                {Array.from({ length: 40 }, (_, i) => new Date().getFullYear() - i).map(year => (
                  <option key={year} value={String(year)}>{year}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="registration-experienceYears" className="text-xs font-bold text-slate-500 uppercase ml-1">Deneyim (Yıl)</label>
              <select
                id="registration-experienceYears"
                {...register('experienceYears')}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 px-4 text-white focus-visible:outline-none focus-visible:border-gold-500 focus-visible:ring-2 focus-visible:ring-gold-500/40 transition-colors appearance-none"
              >
                <option value="">Seçiniz</option>
                {Array.from({ length: 41 }, (_, i) => i).map(y => (
                  <option key={y} value={String(y)}>{y === 0 ? 'Yeni Mezun' : `${y} yıl`}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1 mt-4">
            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Ne Arıyorsun?</label>
            <div className="flex gap-2">
              {([['SERIOUS', 'Ciddi İlişki'], ['FRIENDSHIP', 'Arkadaşlık'], ['OPEN', 'Açık']] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setValue('lookingFor', formData.lookingFor === value ? '' : value)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${formData.lookingFor === value
                    ? 'border-gold-500 bg-gold-500/10 text-gold-400'
                    : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-600'
                    }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="space-y-1">
              <label htmlFor="registration-smoking" className="text-xs font-bold text-slate-500 uppercase ml-1">Sigara</label>
              <select
                id="registration-smoking"
                {...register('smoking')}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 px-4 text-white focus-visible:outline-none focus-visible:border-gold-500 focus-visible:ring-2 focus-visible:ring-gold-500/40 transition-colors appearance-none"
              >
                <option value="">Seçiniz</option>
                <option value="YES">İçiyorum</option>
                <option value="NO">İçmiyorum</option>
                <option value="SOCIAL">Sosyal</option>
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="registration-drinking" className="text-xs font-bold text-slate-500 uppercase ml-1">Alkol</label>
              <select
                id="registration-drinking"
                {...register('drinking')}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 px-4 text-white focus-visible:outline-none focus-visible:border-gold-500 focus-visible:ring-2 focus-visible:ring-gold-500/40 transition-colors appearance-none"
              >
                <option value="">Seçiniz</option>
                <option value="YES">İçiyorum</option>
                <option value="NO">İçmiyorum</option>
                <option value="SOCIAL">Sosyal</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={() => {
          void handleProfessionalNext();
        }}
        disabled={!formData.role || (roleHasSpecialties && !formData.specialty) || !formData.university}
        className="w-full mt-8 py-4 rounded-xl bg-gradient-to-r from-gold-600 to-gold-400 text-slate-950 font-bold text-lg shadow-lg hover:scale-[1.02] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Next Step <ChevronRight size={20} />
      </button>
    </div>
  );

  // --- Step 3: Document Upload ---
  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_DOCUMENT_MIME_TYPES.has(file.type)) {
      setDocumentFile(null);
      setValue('document', '', { shouldValidate: true });
      setError('document', { type: 'manual', message: 'Only JPG, PNG, WEBP or PDF files are allowed.' });
      return;
    }

    if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
      setDocumentFile(null);
      setValue('document', '', { shouldValidate: true });
      setError('document', { type: 'manual', message: 'File size must be smaller than 10 MB.' });
      return;
    }

    clearErrors('document');
    setDocumentFile(file);
    setValue('document', file.name, { shouldValidate: true });
  };

  const renderDocuments = () => (
    <div className="w-full max-w-md animate-fade-in">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-serif text-white mb-2">Belge ile Doğrulama</h2>
        <p className="text-slate-400 text-sm max-w-xs mx-auto">Hastane kimliği, diploma veya çalışma belgesi yükleyin.</p>
      </div>

      <div
        onClick={handleFileUpload}
        className={`border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${formData.document
          ? 'border-green-500/50 bg-green-500/5'
          : 'border-slate-700 bg-slate-900 hover:bg-slate-800 hover:border-gold-500/50'
          }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={handleFileChange}
        />

        {formData.document ? (
          <>
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 size={32} className="text-green-500" />
            </div>
            <h3 className="text-white font-bold mb-1">Document Uploaded</h3>
            <p className="text-slate-500 text-xs">{formData.document}</p>
            {documentFile && (
              <p className="text-slate-600 text-[10px] mt-1">
                {(documentFile.size / 1024 / 1024).toFixed(2)} MB, {documentFile.type || 'unknown'}
              </p>
            )}
            <button
              className="text-xs text-red-400 mt-4 hover:underline"
              onClick={(e) => {
                e.stopPropagation();
                setDocumentFile(null);
                setValue('document', '', { shouldValidate: true });
                clearErrors('document');
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              }}
            >
              Remove
            </button>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
              <Upload size={24} className="text-gold-500" />
            </div>
            <h3 className="text-white font-bold mb-2">Tap to Upload</h3>
            <p className="text-slate-500 text-xs mb-6">Supported formats: JPG, PNG, PDF</p>
            <div className="flex gap-2">
              <span className="px-3 py-1.5 bg-slate-800 rounded text-xs text-slate-400 border border-slate-700">Hospital ID</span>
              <span className="px-3 py-1.5 bg-slate-800 rounded text-xs text-slate-400 border border-slate-700">License</span>
            </div>
          </>
        )}
      </div>

      <div className="mt-6 flex items-start gap-3 bg-blue-900/20 p-4 rounded-xl border border-blue-500/20">
        <ShieldCheck size={20} className="text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-200/80 leading-relaxed">
          Your documents are encrypted and only used for verification. They will be deleted from our servers after approval.
        </p>
      </div>

      <button
        onClick={() => {
          void handleDocumentsNext();
        }}
        disabled={!formData.document}
        className="w-full mt-8 py-4 rounded-xl bg-gradient-to-r from-gold-600 to-gold-400 text-slate-950 font-bold text-lg shadow-lg hover:scale-[1.02] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Review Guidelines
      </button>
      {errors.document && <p className="text-xs text-red-400 mt-2">{errors.document.message}</p>}
    </div>
  );

  // --- Step 4: Pending Approval ---
  const renderPending = () => (
    <div className="w-full max-w-md animate-slide-up flex flex-col items-center text-center p-6">
      <div className="w-24 h-24 bg-slate-900 rounded-full flex items-center justify-center mb-8 border-4 border-slate-800 relative">
        <FileCheck size={40} className="text-gold-500 opacity-50" />
        <div className="absolute inset-0 border-t-4 border-gold-500 rounded-full animate-spin"></div>
      </div>

      <h2 className="text-3xl font-serif text-white mb-4">Review in Progress</h2>

      <p className="text-slate-400 text-lg mb-8 leading-relaxed">
        Thank you, <span className="text-white font-bold">{formData.name}</span>. <br />
        Our team is currently reviewing your credentials.
      </p>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-slate-500 text-xs font-bold uppercase">Estimated Wait</span>
          <span className="text-white font-mono">24 - 48 Hours</span>
        </div>
        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-gold-500 w-1/3 animate-pulse"></div>
        </div>
        <p className="text-xs text-slate-500 mt-4 text-left flex items-start gap-2">
          <AlertCircle size={12} className="mt-0.5" />
          We will notify you via email at {formData.email} once your profile is approved.
        </p>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center overflow-y-auto p-4">
      {/* Progress Dots */}
      {step !== 'PENDING' && step !== 'GUIDELINES' && (
        <div className="fixed top-8 left-0 right-0 flex justify-center gap-2">
          <div className={`w-2 h-2 rounded-full transition-colors ${step === 'BASIC' ? 'bg-gold-500' : 'bg-slate-800'}`}></div>
          <div className={`w-2 h-2 rounded-full transition-colors ${step === 'PROFESSIONAL' ? 'bg-gold-500' : 'bg-slate-800'}`}></div>
          <div className={`w-2 h-2 rounded-full transition-colors ${step === 'DOCUMENTS' ? 'bg-gold-500' : 'bg-slate-800'}`}></div>
        </div>
      )}

      {step === 'BASIC' && renderBasicInfo()}
      {step === 'PROFESSIONAL' && renderProfessionalInfo()}
      {step === 'DOCUMENTS' && renderVerification()}
      {step === 'GUIDELINES' && (
        <CommunityGuidelines
          mode="ONBOARDING"
          onAccept={() => setStep('PENDING')}
        />
      )}
      {step === 'PENDING' && renderPending()}
    </div>
  );
};
