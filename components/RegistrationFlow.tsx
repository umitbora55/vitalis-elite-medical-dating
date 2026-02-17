import React, { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { MedicalRole, Specialty, ROLE_SPECIALTIES } from '../types';
import { ChevronRight, Upload, FileCheck, ShieldCheck, CheckCircle2, AlertCircle, User, Mail, Building2, Stethoscope, Lock, GraduationCap, Eye, EyeOff } from 'lucide-react';
import { CommunityGuidelines } from './CommunityGuidelines';
import { getVerifiedDomain, sendVerificationOtp, verifyOtp } from '../services/verificationService';

import { AnimatePresence, motion } from 'framer-motion';

interface RegistrationFlowProps {
  onComplete: (profileData: RegistrationFormData, verification: VerificationPayload) => void;
  onCancel: () => void;
}

type Step =
  | 'NAME' | 'AGE' | 'GENDER' | 'PREFERENCE'
  | 'CITY' | 'ROLE' | 'SPECIALTY' | 'UNIVERSITY'
  | 'EMAIL' | 'PASSWORD' | 'PHONE'
  | 'DOCUMENTS' | 'GUIDELINES' | 'PENDING';

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

// Variants for slide transitions
const pageVariants = {
  initial: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
    scale: 0.95
  }),
  animate: {
    x: 0,
    opacity: 1,
    scale: 1,
    transition: {
      x: { type: 'spring' as const, stiffness: 300, damping: 30 },
      opacity: { duration: 0.2 }
    }
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 300 : -300,
    opacity: 0,
    scale: 0.95,
    transition: {
      x: { type: 'spring' as const, stiffness: 300, damping: 30 },
      opacity: { duration: 0.2 }
    }
  })
};

// Wrapper for animated question screens
const LayoutShell: React.FC<{
  children: React.ReactNode;
  footer?: React.ReactNode;
  stepKey: string;
  direction: number;
}> = ({ children, footer, stepKey, direction }) => (
  <div className="flex flex-col h-full w-full max-w-md mx-auto relative overflow-hidden">
    <div className="flex-1 w-full pb-32 pt-24 px-6 scrollbar-hide relative">
      <AnimatePresence initial={false} custom={direction} mode="wait">
        <motion.div
          key={stepKey}
          custom={direction}
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="w-full h-full"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
    {footer && (
      <div className="absolute bottom-0 left-0 right-0 p-6 pb-8 bg-slate-950/90 backdrop-blur-xl z-50">
        {footer}
      </div>
    )}
  </div>
);

export const RegistrationFlow: React.FC<RegistrationFlowProps> = ({ onComplete, onCancel }) => {
  const [step, setStep] = useState<Step>('NAME');
  const [direction, setDirection] = useState(0);
  const [verificationStep, setVerificationStep] = useState<VerificationStep>('EMAIL_INPUT');
  const [workEmail, setWorkEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [matchedDomain, setMatchedDomain] = useState<{ domain: string; tier: number } | null>(null);
  const [countryCode, setCountryCode] = useState('+90');
  const [showPassword, setShowPassword] = useState(false);

  // Constants for progress bar
  const STEPS_ORDER: Step[] = [
    'NAME', 'AGE', 'GENDER', 'PREFERENCE', 'CITY',
    'ROLE', 'SPECIALTY', 'UNIVERSITY', 'EMAIL', 'PHONE', 'PASSWORD',
    'DOCUMENTS', 'GUIDELINES', 'PENDING'
  ];

  const currentStepIndex = STEPS_ORDER.indexOf(step);
  const progressPercentage = ((currentStepIndex + 1) / (STEPS_ORDER.length - 1)) * 100;

  const handleNextStep = (nextStep: Step) => {
    setDirection(1);
    setStep(nextStep);
  };

  const handlePrevStep = (prevStep: Step) => {
    setDirection(-1);
    setStep(prevStep);
  };

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
    mode: 'onBlur', // Validate on blur specifically
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

  const selectedRole = formData.role as MedicalRole;
  const allowedSpecialties = selectedRole ? (ROLE_SPECIALTIES[selectedRole] ?? []) : [];

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

  // Navigation Handlers
  const goNext = async () => {
    let isValid = false;
    switch (step) {
      case 'NAME':
        isValid = await trigger('name');
        if (isValid) handleNextStep('AGE');
        break;
      case 'AGE':
        isValid = await trigger('age');
        if (isValid) handleNextStep('GENDER');
        break;
      case 'GENDER':
        handleNextStep('PREFERENCE'); // Optional field
        break;
      case 'PREFERENCE':
        isValid = await trigger('genderPreference');
        if (isValid) handleNextStep('CITY');
        break;
      case 'CITY':
        isValid = await trigger('city');
        if (isValid) handleNextStep('ROLE');
        break;
      case 'ROLE':
        isValid = await trigger('role');
        if (isValid) {
          // Check if role needs specialty
          const currentRole = getValues('role') as MedicalRole;
          const needsSpecialty = (ROLE_SPECIALTIES[currentRole]?.length ?? 0) > 0;
          if (needsSpecialty) {
            handleNextStep('SPECIALTY');
          } else {
            handleNextStep('UNIVERSITY');
          }
        }
        break;
      case 'SPECIALTY':
        isValid = await trigger('specialty');
        if (isValid) handleNextStep('UNIVERSITY');
        break;
      case 'UNIVERSITY':
        isValid = await trigger('university');
        if (isValid) handleNextStep('EMAIL');
        break;
      case 'EMAIL':
        isValid = await trigger('email');
        if (isValid) handleNextStep('PHONE');
        break;
      case 'PHONE':
        handleNextStep('PASSWORD'); // Optional
        break;
      case 'PASSWORD':
        isValid = await trigger('password');
        if (isValid) {
          if (isPersonalEmail) {
            setVerificationStep('DOCUMENT');
          } else {
            setVerificationStep('EMAIL_INPUT');
          }
          handleNextStep('DOCUMENTS');
        }
        break;
      case 'DOCUMENTS':
        isValid = await trigger('document');
        if (isValid) handleNextStep('GUIDELINES');
        break;
    }
  };

  const goBack = () => {
    switch (step) {
      case 'NAME': onCancel(); break;
      case 'AGE': handlePrevStep('NAME'); break;
      case 'GENDER': handlePrevStep('AGE'); break;
      case 'PREFERENCE': handlePrevStep('GENDER'); break;
      case 'CITY': handlePrevStep('PREFERENCE'); break;
      case 'ROLE': handlePrevStep('CITY'); break;
      case 'SPECIALTY': handlePrevStep('ROLE'); break;
      case 'UNIVERSITY':
        const currentRole = getValues('role') as MedicalRole;
        const needsSpecialty = (ROLE_SPECIALTIES[currentRole]?.length ?? 0) > 0;
        if (needsSpecialty) {
          handlePrevStep('SPECIALTY');
        } else {
          handlePrevStep('ROLE');
        }
        break;
      case 'EMAIL': handlePrevStep('UNIVERSITY'); break;
      case 'PHONE': handlePrevStep('EMAIL'); break;
      case 'PASSWORD': handlePrevStep('PHONE'); break;
      case 'DOCUMENTS': handlePrevStep('PASSWORD'); break;
      case 'GUIDELINES': handlePrevStep('DOCUMENTS'); break;
    }
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

  // --- Step 3: Document Upload Handlers ---
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

  // --- RENDER HELPERS ---

  // --- RENDER HELPERS ---
  const renderNameStep = () => (
    <LayoutShell
      stepKey="NAME"
      direction={direction}
      footer={
        <div className="flex gap-3">
          <button onClick={onCancel} className="px-6 py-4 rounded-xl text-slate-400 font-bold hover:text-white transition-colors">
            Cancel
          </button>
          <button
            onClick={() => { void goNext(); }}
            disabled={!formData.name}
            className="flex-1 py-4 rounded-xl bg-gradient-to-r from-gold-600 to-gold-400 text-slate-950 font-bold text-lg shadow-lg hover:scale-[1.02] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue <ChevronRight size={20} />
          </button>
        </div>
      }
    >
      <div className="space-y-6 pt-8">
        <h2 className="text-3xl font-serif text-white">What is your name?</h2>
        <div className="relative">
          <User className="absolute left-4 top-3.5 text-slate-500" size={18} />
          <input
            autoFocus
            type="text"
            placeholder="Dr. Jane Doe"
            {...register('name')}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-white focus-visible:outline-none focus-visible:border-gold-500 focus-visible:ring-2 focus-visible:ring-gold-500/40 transition-colors text-lg"
            onKeyDown={(e) => e.key === 'Enter' && void goNext()}
          />
        </div>
        {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name.message}</p>}
      </div>
    </LayoutShell>
  );

  const renderAgeStep = () => (
    <LayoutShell
      stepKey="AGE"
      direction={direction}
      footer={
        <div className="flex gap-3">
          <button onClick={goBack} className="px-6 py-4 rounded-xl text-slate-400 font-bold hover:text-white transition-colors">
            Back
          </button>
          <button
            onClick={() => { void goNext(); }}
            disabled={!formData.age}
            className="flex-1 py-4 rounded-xl bg-gradient-to-r from-gold-600 to-gold-400 text-slate-950 font-bold text-lg shadow-lg hover:scale-[1.02] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue <ChevronRight size={20} />
          </button>
        </div>
      }
    >
      <div className="space-y-6 pt-8">
        <h2 className="text-3xl font-serif text-white">How old are you?</h2>
        <div className="space-y-2">
          <select
            autoFocus
            {...register('age')}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl py-4 px-4 text-white text-lg focus-visible:outline-none focus-visible:border-gold-500 focus-visible:ring-2 focus-visible:ring-gold-500/40 transition-colors appearance-none"
          >
            <option value="">Select Age</option>
            {Array.from({ length: 63 }, (_, i) => i + 18).map(age => (
              <option key={age} value={String(age)}>{age}</option>
            ))}
          </select>
          <p className="text-slate-400 text-sm">You must be at least 18 years old.</p>
        </div>
        {errors.age && <p className="text-red-400 text-sm mt-1">{errors.age.message}</p>}
      </div>
    </LayoutShell>
  );

  const renderGenderStep = () => (
    <LayoutShell
      stepKey="GENDER"
      direction={direction}
      footer={
        <div className="flex gap-3">
          <button onClick={goBack} className="px-6 py-4 rounded-xl text-slate-400 font-bold hover:text-white transition-colors">
            Back
          </button>
          <button
            onClick={() => { void goNext(); }}
            className="flex-1 py-4 rounded-xl bg-slate-800 text-slate-200 font-bold text-lg hover:bg-slate-700 transition-all"
          >
            Skip
          </button>
        </div>
      }
    >
      <div className="space-y-6 pt-8">
        <h2 className="text-3xl font-serif text-white">How do you identify?</h2>
        <div className="grid gap-3">
          {['Male', 'Female', 'Non-binary'].map((g) => (
            <button
              key={g}
              onClick={() => {
                setValue('gender', g);
                void goNext();
              }}
              className={`p-4 rounded-xl border text-left text-lg font-medium transition-all ${formData.gender === g
                ? 'border-gold-500 bg-gold-500/10 text-gold-400'
                : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-600'
                }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>
    </LayoutShell>
  );

  const renderPreferenceStep = () => (
    <LayoutShell
      stepKey="PREFERENCE"
      direction={direction}
      footer={
        <div className="flex gap-3">
          <button onClick={goBack} className="px-6 py-4 rounded-xl text-slate-400 font-bold hover:text-white transition-colors">
            Back
          </button>
          <button
            onClick={() => { void goNext(); }}
            disabled={!formData.genderPreference}
            className="flex-1 py-4 rounded-xl bg-gradient-to-r from-gold-600 to-gold-400 text-slate-950 font-bold text-lg shadow-lg hover:scale-[1.02] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue <ChevronRight size={20} />
          </button>
        </div>
      }
    >
      <div className="space-y-6 pt-8">
        <h2 className="text-3xl font-serif text-white">Who do you want to see?</h2>
        <div className="grid gap-3">
          {[
            { value: 'MALE', label: 'Men' },
            { value: 'FEMALE', label: 'Women' },
            { value: 'EVERYONE', label: 'Everyone' }
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => {
                setValue('genderPreference', option.value);
                void goNext();
              }}
              className={`p-4 rounded-xl border text-left text-lg font-medium transition-all ${formData.genderPreference === option.value
                ? 'border-gold-500 bg-gold-500/10 text-gold-400'
                : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-600'
                }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        {errors.genderPreference && <p className="text-red-400 text-sm mt-1">{errors.genderPreference.message}</p>}
      </div>
    </LayoutShell>
  );

  const renderCityStep = () => (
    <LayoutShell
      stepKey="CITY"
      direction={direction}
      footer={
        <div className="flex gap-3">
          <button onClick={goBack} className="px-6 py-4 rounded-xl text-slate-400 font-bold hover:text-white transition-colors">
            Back
          </button>
          <button
            onClick={() => { void goNext(); }}
            disabled={!formData.city}
            className="flex-1 py-4 rounded-xl bg-gradient-to-r from-gold-600 to-gold-400 text-slate-950 font-bold text-lg shadow-lg hover:scale-[1.02] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue <ChevronRight size={20} />
          </button>
        </div>
      }
    >
      <div className="space-y-6 pt-8">
        <h2 className="text-3xl font-serif text-white">Where do you live?</h2>
        <div className="relative">
          <Building2 className="absolute left-4 top-3.5 text-slate-500" size={18} />
          <input
            autoFocus
            type="text"
            placeholder="Istanbul, TR"
            {...register('city')}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-white focus-visible:outline-none focus-visible:border-gold-500 focus-visible:ring-2 focus-visible:ring-gold-500/40 transition-colors text-lg"
            onKeyDown={(e) => e.key === 'Enter' && void goNext()}
          />
        </div>
        {errors.city && <p className="text-red-400 text-sm mt-1">{errors.city.message}</p>}
      </div>
    </LayoutShell>
  );

  const renderRoleStep = () => (
    <LayoutShell
      stepKey="ROLE"
      direction={direction}
      footer={
        <div className="flex gap-3">
          <button onClick={goBack} className="px-6 py-4 rounded-xl text-slate-400 font-bold hover:text-white transition-colors">
            Back
          </button>
          <button
            onClick={() => { void goNext(); }}
            disabled={!formData.role}
            className="flex-1 py-4 rounded-xl bg-gradient-to-r from-gold-600 to-gold-400 text-slate-950 font-bold text-lg shadow-lg hover:scale-[1.02] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue <ChevronRight size={20} />
          </button>
        </div>
      }
    >
      <div className="space-y-6 pt-8">
        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center border border-slate-700 mb-6">
          <Stethoscope size={32} className="text-gold-500" />
        </div>
        <h2 className="text-3xl font-serif text-white">What is your role?</h2>
        <div className="space-y-2">
          <select
            autoFocus
            {...register('role')}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl py-4 px-4 text-white text-lg focus-visible:outline-none focus-visible:border-gold-500 focus-visible:ring-2 focus-visible:ring-gold-500/40 transition-colors appearance-none"
          >
            <option value="">Select Role</option>
            {Object.values(MedicalRole).map(role => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
        </div>
        {errors.role && <p className="text-red-400 text-sm mt-1">{errors.role.message}</p>}
      </div>
    </LayoutShell>
  );

  const renderSpecialtyStep = () => (
    <LayoutShell
      stepKey="SPECIALTY"
      direction={direction}
      footer={
        <div className="flex gap-3">
          <button onClick={goBack} className="px-6 py-4 rounded-xl text-slate-400 font-bold hover:text-white transition-colors">
            Back
          </button>
          <button
            onClick={() => { void goNext(); }}
            disabled={!formData.specialty}
            className="flex-1 py-4 rounded-xl bg-gradient-to-r from-gold-600 to-gold-400 text-slate-950 font-bold text-lg shadow-lg hover:scale-[1.02] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue <ChevronRight size={20} />
          </button>
        </div>
      }
    >
      <div className="space-y-6 pt-8">
        <h2 className="text-3xl font-serif text-white">What is your specialty?</h2>
        <div className="space-y-2">
          <select
            autoFocus
            {...register('specialty')}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl py-4 px-4 text-white text-lg focus-visible:outline-none focus-visible:border-gold-500 focus-visible:ring-2 focus-visible:ring-gold-500/40 transition-colors appearance-none"
          >
            <option value="">Select Specialty</option>
            {allowedSpecialties.map(spec => (
              <option key={spec} value={spec}>{spec}</option>
            ))}
          </select>
        </div>
        {errors.specialty && <p className="text-red-400 text-sm mt-1">{errors.specialty.message}</p>}
      </div>
    </LayoutShell>
  );

  const renderUniversityStep = () => (
    <LayoutShell
      stepKey="UNIVERSITY"
      direction={direction}
      footer={
        <div className="flex gap-3">
          <button onClick={goBack} className="px-6 py-4 rounded-xl text-slate-400 font-bold hover:text-white transition-colors">
            Back
          </button>
          <button
            onClick={() => { void goNext(); }}
            disabled={!formData.university}
            className="flex-1 py-4 rounded-xl bg-gradient-to-r from-gold-600 to-gold-400 text-slate-950 font-bold text-lg shadow-lg hover:scale-[1.02] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue <ChevronRight size={20} />
          </button>
        </div>
      }
    >
      <div className="space-y-6 pt-8">
        <h2 className="text-3xl font-serif text-white">Where did you study?</h2>
        <div className="relative">
          <GraduationCap className="absolute left-4 top-3.5 text-slate-500" size={18} />
          <input
            autoFocus
            type="text"
            placeholder="e.g. Istanbul University"
            {...register('university')}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-white focus-visible:outline-none focus-visible:border-gold-500 focus-visible:ring-2 focus-visible:ring-gold-500/40 transition-colors text-lg"
            onKeyDown={(e) => e.key === 'Enter' && void goNext()}
          />
        </div>
        {errors.university && <p className="text-red-400 text-sm mt-1">{errors.university.message}</p>}
      </div>
    </LayoutShell>
  );

  const renderEmailStep = () => (
    <LayoutShell
      stepKey="EMAIL"
      direction={direction}
      footer={
        <div className="flex gap-3">
          <button onClick={goBack} className="px-6 py-4 rounded-xl text-slate-400 font-bold hover:text-white transition-colors">
            Back
          </button>
          <button
            onClick={() => { void goNext(); }}
            disabled={!formData.email}
            className="flex-1 py-4 rounded-xl bg-gradient-to-r from-gold-600 to-gold-400 text-slate-950 font-bold text-lg shadow-lg hover:scale-[1.02] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue <ChevronRight size={20} />
          </button>
        </div>
      }
    >
      <div className="space-y-6 pt-8">
        <h2 className="text-3xl font-serif text-white">What is your email?</h2>
        <div className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-4 top-3.5 text-slate-500" size={18} />
            <input
              autoFocus
              type="email"
              placeholder="jane@hospital.com"
              {...register('email')}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-white focus-visible:outline-none focus-visible:border-gold-500 focus-visible:ring-2 focus-visible:ring-gold-500/40 transition-colors text-lg"
              onKeyDown={(e) => e.key === 'Enter' && void goNext()}
            />
          </div>
          {errors.email && <p className="text-red-400 text-sm mt-1">{errors.email.message}</p>}

          {isPersonalEmail && !errors.email && (
            <div className="flex items-start gap-2.5 bg-amber-900/20 border border-amber-500/30 rounded-xl p-3">
              <AlertCircle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-200/80 leading-relaxed">
                Bireysel e-posta adresi tespit edildi. Hesabınızın aktif olması için mesleki belge yüklemeniz gerekecektir.
              </p>
            </div>
          )}
        </div>
      </div>
    </LayoutShell>
  );

  const renderPhoneStep = () => (
    <LayoutShell
      stepKey="PHONE"
      direction={direction}
      footer={
        <div className="flex gap-3">
          <button onClick={goBack} className="px-6 py-4 rounded-xl text-slate-400 font-bold hover:text-white transition-colors">
            Back
          </button>
          <button
            onClick={() => { void goNext(); }}
            className="flex-1 py-4 rounded-xl bg-gradient-to-r from-gold-600 to-gold-400 text-slate-950 font-bold text-lg shadow-lg hover:scale-[1.02] transition-all flex items-center justify-center gap-2 "
          >
            Continue <ChevronRight size={20} />
          </button>
        </div>
      }
    >
      <div className="space-y-6 pt-8">
        <h2 className="text-3xl font-serif text-white">What is your number?</h2>
        <div className="space-y-2">
          <div className="flex gap-2">
            <select
              value={countryCode}
              onChange={(e) => {
                setCountryCode(e.target.value);
                const currentPhone = formData.phone ?? '';
                const numberOnly = currentPhone.replace(/^\+\d+\s*/, '');
                setValue('phone', `${e.target.value} ${numberOnly}`);
              }}
              className="w-[100px] bg-slate-900 border border-slate-800 rounded-xl py-3 px-3 text-white text-lg focus-visible:outline-none focus-visible:border-gold-500 focus-visible:ring-2 focus-visible:ring-gold-500/40 transition-colors appearance-none flex-shrink-0"
            >
              {COUNTRY_CODES.map(c => (
                <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
              ))}
            </select>
            <div className="relative flex-1">
              <input
                autoFocus
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder={COUNTRY_CODES.find(c => c.code === countryCode)?.placeholder ?? '555 000 0000'}
                onChange={(e) => {
                  setValue('phone', `${countryCode} ${e.target.value}`);
                }}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 px-4 text-white focus-visible:outline-none focus-visible:border-gold-500 focus-visible:ring-2 focus-visible:ring-gold-500/40 transition-colors text-lg"
                onKeyDown={(e) => e.key === 'Enter' && void goNext()}
              />
            </div>
          </div>
          <p className="text-slate-400 text-sm">We will never share your phone number.</p>
        </div>
      </div>
    </LayoutShell>
  );

  const renderPasswordStep = () => (
    <LayoutShell
      stepKey="PASSWORD"
      direction={direction}
      footer={
        <div className="flex gap-3">
          <button onClick={goBack} className="px-6 py-4 rounded-xl text-slate-400 font-bold hover:text-white transition-colors">
            Back
          </button>
          <button
            onClick={() => { void goNext(); }}
            disabled={!formData.password}
            className="flex-1 py-4 rounded-xl bg-gradient-to-r from-gold-600 to-gold-400 text-slate-950 font-bold text-lg shadow-lg hover:scale-[1.02] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create Account <ChevronRight size={20} />
          </button>
        </div>
      }
    >
      <div className="space-y-6 pt-8">
        <h2 className="text-3xl font-serif text-white">Set a password</h2>
        <div className="relative">
          <Lock className="absolute left-4 top-3.5 text-slate-500" size={18} />
          <input
            autoFocus
            type={showPassword ? 'text' : 'password'}
            placeholder="Create a password"
            {...register('password')}
            autoComplete="new-password"
            className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-12 pr-12 text-white focus-visible:outline-none focus-visible:border-gold-500 focus-visible:ring-2 focus-visible:ring-gold-500/40 transition-colors text-lg"
            onKeyDown={(e) => e.key === 'Enter' && void goNext()}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center text-slate-500 hover:text-slate-300 transition-colors focus:outline-none focus:ring-2 focus:ring-gold-500 rounded-lg"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {errors.password && <p className="text-red-400 text-sm mt-1">{errors.password.message}</p>}
      </div>
    </LayoutShell>
  );

  const renderDocumentsStep = () => (
    <LayoutShell
      stepKey="DOCUMENTS"
      direction={direction}
      footer={
        <div className="flex gap-3">
          <button onClick={goBack} className="px-6 py-4 rounded-xl text-slate-400 font-bold hover:text-white transition-colors">
            Back
          </button>
          {verificationStep === 'DOCUMENT' && (
            <button
              onClick={() => { void goNext(); }}
              disabled={!formData.document}
              className="flex-1 py-4 rounded-xl bg-gradient-to-r from-gold-600 to-gold-400 text-slate-950 font-bold text-lg shadow-lg hover:scale-[1.02] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Submit Documents <ChevronRight size={20} />
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-6 pt-8">
        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center border border-slate-700 mb-6">
          <ShieldCheck size={32} className="text-gold-500" />
        </div>
        <h2 className="text-3xl font-serif text-white">Verification</h2>

        {verificationStep === 'EMAIL_INPUT' && (
          <div className="space-y-4">
            <p className="text-slate-400">Please enter your work email for instant verification.</p>
            <div className="relative">
              <Mail className="absolute left-4 top-3.5 text-slate-500" size={18} />
              <input
                type="email"
                value={workEmail}
                onChange={(e) => setWorkEmail(e.target.value)}
                placeholder="dr.jane@hospital.com"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-white focus-visible:outline-none focus-visible:border-gold-500 focus-visible:ring-2 focus-visible:ring-gold-500/40 transition-colors text-lg"
              />
            </div>
            <button
              onClick={() => { void handleStartEmailVerification(); }}
              disabled={isVerifyingEmail || !workEmail}
              className="w-full py-4 rounded-xl bg-white text-slate-950 font-bold text-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
            >
              {isVerifyingEmail ? 'Sending...' : 'Send Code'}
            </button>
          </div>
        )}

        {verificationStep === 'EMAIL_OTP' && (
          <div className="space-y-4">
            <p className="text-slate-400">Enter the code sent to {workEmail}</p>
            <input
              type="text"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              placeholder="000000"
              className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 px-4 text-center text-white text-2xl tracking-widest focus-visible:outline-none focus-visible:border-gold-500 focus-visible:ring-2 focus-visible:ring-gold-500/40 transition-colors"
              maxLength={6}
            />
            {otpError && <p className="text-red-400 text-sm text-center">{otpError}</p>}
            <button
              onClick={() => { void handleVerifyOtp(); }}
              disabled={isVerifyingEmail || otpCode.length !== 6}
              className="w-full py-4 rounded-xl bg-white text-slate-950 font-bold text-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
            >
              {isVerifyingEmail ? 'Verifying...' : 'Verify Code'}
            </button>
          </div>
        )}

        {verificationStep === 'DOCUMENT' && (
          <div className="space-y-4">
            <p className="text-slate-400">Upload your medical license or ID to verify your profession.</p>
            <div
              className="border-2 border-dashed border-slate-700 rounded-xl p-8 text-center hover:border-gold-500/50 transition-colors cursor-pointer"
              onClick={handleFileUpload}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (file) {
                  // Manually trigger handleFileChange logic
                  // Or ideally create a synthetic event, but easier to just extract logic.
                  // For now, simpler to leave mock logic or reuse setDocumentFile?
                  // Let's call setValue directly to match handleFileChange logic roughly or just use setValue for simplicity as in previous version
                  setValue('document', file.name, { shouldValidate: true });
                  setDocumentFile(file);
                }
              }}
            >
              <Upload className="mx-auto text-slate-500 mb-4" size={32} />
              <p className="text-slate-400 font-medium">Click or drag file to upload</p>
              <p className="text-slate-600 text-sm mt-2">PDF, JPG or PNG (Max 10MB)</p>

              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept={Array.from(ALLOWED_DOCUMENT_MIME_TYPES).join(',')}
                onChange={handleFileChange}
              />
            </div>
            {errors.document && <p className="text-red-400 text-sm">{errors.document.message}</p>}
            {formData.document && !errors.document && (
              <div className="flex items-center gap-2 text-green-400 bg-green-900/20 p-3 rounded-lg">
                <CheckCircle2 size={16} />
                <span className="text-sm font-medium">{formData.document} uploaded</span>
              </div>
            )}
          </div>
        )}
      </div>
    </LayoutShell>
  );

  const renderGuidelinesStep = () => (
    <LayoutShell
      stepKey="GUIDELINES"
      direction={direction}
    >
      <CommunityGuidelines
        mode="ONBOARDING"
        onAccept={() => {
          const requiredVerification: VerificationPayload = {
            method: isPersonalEmail ? 'DOCUMENT' : 'EMAIL',
            workEmail: isPersonalEmail ? undefined : workEmail,
            tier: matchedDomain?.tier,
            domain: matchedDomain?.domain,
            documentFile: undefined, // In real app, pass file
          };
          onComplete(formData, requiredVerification);
        }}
      />
    </LayoutShell>
  );

  const renderPendingStep = () => (
    <div className="flex flex-col items-center justify-center p-8 h-full text-center">
      <div className="w-24 h-24 bg-slate-900 rounded-full flex items-center justify-center mb-8 border-4 border-slate-800 relative">
        <FileCheck size={40} className="text-gold-500 opacity-50" />
        <div className="absolute inset-0 border-t-4 border-gold-500 rounded-full animate-spin"></div>
      </div>

      <h2 className="text-3xl font-serif text-white mb-4">Review in Progress</h2>

      <p className="text-slate-400 text-lg mb-8 leading-relaxed">
        Thank you, <span className="text-white font-bold">{formData.name}</span>. <br />
        Our team is currently reviewing your credentials.
      </p>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full mb-8 max-w-sm">
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

  // Variants for slide transitions
  // const pageVariants = { ... };

  // ... (existing code)

  // --- MAIN RENDER ---
  return (
    <div className="fixed inset-0 bg-slate-950 flex flex-col">
      {/* Dynamic Progress Bar - Hidden on Pending */}
      {step !== 'PENDING' && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-slate-900 z-50">
          <motion.div
            className="h-full bg-gradient-to-r from-gold-600 to-gold-400"
            animate={{ width: `${progressPercentage}%` }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          />
        </div>
      )}

      <div className="flex-1 relative">
        {step === 'NAME' && renderNameStep()}
        {step === 'AGE' && renderAgeStep()}
        {step === 'GENDER' && renderGenderStep()}
        {step === 'PREFERENCE' && renderPreferenceStep()}
        {step === 'CITY' && renderCityStep()}
        {step === 'ROLE' && renderRoleStep()}
        {step === 'SPECIALTY' && renderSpecialtyStep()}
        {step === 'UNIVERSITY' && renderUniversityStep()}
        {step === 'EMAIL' && renderEmailStep()}
        {step === 'PHONE' && renderPhoneStep()}
        {step === 'PASSWORD' && renderPasswordStep()}
        {step === 'DOCUMENTS' && renderDocumentsStep()}
        {step === 'GUIDELINES' && renderGuidelinesStep()}
        {step === 'PENDING' && renderPendingStep()}
      </div>
    </div>
  );
};
