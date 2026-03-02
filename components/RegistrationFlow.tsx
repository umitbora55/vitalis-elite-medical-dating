import React, { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { MedicalRole, Specialty, ROLE_SPECIALTIES } from '../types';
import { ChevronRight, Upload, FileCheck, ShieldCheck, CheckCircle2, AlertCircle, User, Mail, MapPin, Stethoscope, Lock, GraduationCap, Eye, EyeOff, AlertTriangle, Loader2 } from 'lucide-react';
import { CommunityGuidelines } from './CommunityGuidelines';
import { getVerifiedDomain, sendVerificationOtp, verifyOtp, sendPhoneOtp, verifyPhoneOtp } from '../services/verificationService';
import { deviceAbuseService } from '../services/deviceAbuseService';
import { ExtraVerificationRequired } from './ExtraVerificationRequired';
import { LivenessCheck } from './LivenessCheck';
import {
  lookupHealthcareDomain,
  matchNameWithEmail,
  logNameEmailMatch,
} from '../services/healthcareVerificationService';
import type { NameMatchDecision } from '../services/healthcareVerificationService';


import { TURKISH_HEALTH_UNIVERSITIES } from '../constants/turkishHealthUniversities';

import { AnimatePresence, motion } from 'framer-motion';

interface RegistrationFlowProps {
  onComplete: (profileData: RegistrationFormData, verification: VerificationPayload) => void;
  onCancel: () => void;
}

type Step =
  | 'NAME' | 'AGE' | 'GENDER' | 'PREFERENCE'
  | 'LOCATION' | 'ROLE' | 'SPECIALTY' | 'UNIVERSITY'
  | 'EMAIL' | 'PASSWORD' | 'PHONE'
  | 'DOCUMENTS' | 'PHOTOS' | 'LIVENESS' | 'GUIDELINES' | 'PENDING';

type VerificationStep = 'EMAIL_INPUT' | 'EMAIL_OTP' | 'DOCUMENT';
type VerificationPayload = {
  method: 'EMAIL' | 'DOCUMENT';
  workEmail?: string;
  tier?: number;
  domain?: string;
  documentFile?: File;
  // Liveness verification
  livenessSessionId?: string;
  livenessScore?: number;
  livenessNeedsReview?: boolean;
  livenessSkipped?: boolean;
  // Name match
  nameMatchDecision?: NameMatchDecision;
  nameMatchScore?: number;
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
  gender: z.string().min(1, 'Cinsiyet seçimi zorunludur'),
  genderPreference: z.string().min(1, 'Kimi görmek istediğini seç'),
  city: z.string().optional(),
  current_lat: z.number().optional(),
  current_lng: z.number().optional(),
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
  const [otpCooldown, setOtpCooldown] = useState(0);  // seconds remaining before resend allowed
  const [otpSendCount, setOtpSendCount] = useState(0); // total sends (max 3)
  const [matchedDomain, setMatchedDomain] = useState<{ domain: string; tier: number } | null>(null);
  const [countryCode, setCountryCode] = useState('+90');
  const [showPassword, setShowPassword] = useState(false);

  // ── Device fingerprint / extra verification ──────────────────────────────
  const [deviceFingerprint] = useState<string>(() => {
    // Generate a simple browser fingerprint (canvas + UA + screen)
    const ua = navigator.userAgent;
    const scr = `${screen.width}x${screen.height}x${screen.colorDepth}`;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return btoa(`${ua}|${scr}|${tz}`).slice(0, 64);
  });
  const [showExtraVerification, setShowExtraVerification] = useState(false);
  const [deviceBlocked, setDeviceBlocked] = useState(false);

  // ── Liveness verification state ─────────────────────────────────────────────
  const [livenessSessionId, setLivenessSessionId] = useState<string | null>(null);
  const [livenessScore, setLivenessScore] = useState<number | null>(null);
  const [livenessNeedsReview, setLivenessNeedsReview] = useState(false);
  const [livenessSkipped, setLivenessSkipped] = useState(false);

  // ── Name-email match state ────────────────────────────────────────────────
  const [nameMatchDecision, setNameMatchDecision] = useState<NameMatchDecision | null>(null);
  const [nameMatchScore, setNameMatchScore] = useState<number | null>(null);
  const [nameMatchError, setNameMatchError] = useState<string | null>(null);

  // ── Location state ─────────────────────────────────────────────────────
  const [locLoading, setLocLoading] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);

  // ── Photo upload state ───────────────────────────────────────────────
  const [uploadedPhotos, setUploadedPhotos] = useState<{ file: File; url: string }[]>([]);
  const [showFaceVerifyPrompt, setShowFaceVerifyPrompt] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // ── Email OTP (inline in EMAIL step) ──────────────────────────────────
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailOtpCode, setEmailOtpCode] = useState('');
  const [emailOtpVerified, setEmailOtpVerified] = useState(false);
  const [emailOtpLoading, setEmailOtpLoading] = useState(false);
  const [emailOtpError, setEmailOtpError] = useState<string | null>(null);
  const [emailOtpCooldown, setEmailOtpCooldown] = useState(0);

  // ── Phone OTP (inline in PHONE step) ─────────────────────────────────
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [phoneOtpCode, setPhoneOtpCode] = useState('');
  const [phoneOtpVerified, setPhoneOtpVerified] = useState(false);
  const [phoneOtpLoading, setPhoneOtpLoading] = useState(false);
  const [phoneOtpError, setPhoneOtpError] = useState<string | null>(null);
  const [phoneOtpCooldown, setPhoneOtpCooldown] = useState(0);

  // ── University autocomplete ────────────────────────────────────────────────
  const [uniSearch, setUniSearch] = useState('');
  const [showUniDropdown, setShowUniDropdown] = useState(false);

  // Map each MedicalRole to the department labels in turkishHealthUniversities
  const ROLE_TO_UNI_DEPT: Record<string, string[]> = {
    Doctor: ['Tıp'],
    Nurse: ['Hemşirelik', 'Ebelik'],
    Pharmacist: ['Eczacılık'],
    Physiotherapist: ['Fizyoterapi'],
    Dietitian: ['Beslenme ve Diyetetik'],
    Dentist: ['Diş Hekimliği', 'Ağız ve Diş Sağlığı'],
    Technician: ['Tıbbi Görüntüleme', 'Tıbbi Laboratuvar', 'Anestezi', 'Ameliyathane Hizmetleri'],
    'Medical Student': ['Tıp'],
  };

  // OTP cooldown countdown
  useEffect(() => {
    if (otpCooldown <= 0) return;
    const id = setInterval(() => setOtpCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [otpCooldown]);

  // Constants for progress bar
  const STEPS_ORDER: Step[] = [
    'NAME', 'AGE', 'GENDER', 'PREFERENCE', 'LOCATION',
    'ROLE', 'SPECIALTY', 'UNIVERSITY', 'EMAIL', 'PHONE', 'PASSWORD',
    'DOCUMENTS', 'PHOTOS', 'LIVENESS', 'GUIDELINES', 'PENDING'
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

  // University suggestions filtered by selected role
  const relevantDepts = ROLE_TO_UNI_DEPT[selectedRole as string] ?? [];
  const uniSuggestions = uniSearch.length >= 2
    ? TURKISH_HEALTH_UNIVERSITIES.filter(u => {
      const roleMatch = relevantDepts.length === 0
        || u.departments.some(d => relevantDepts.includes(d));
      const textMatch = u.name.toLowerCase().includes(uniSearch.toLowerCase());
      return roleMatch && textMatch;
    }).slice(0, 8)
    : [];

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
        isValid = await trigger('gender');
        if (isValid) handleNextStep('PREFERENCE');
        break;
      case 'PREFERENCE':
        isValid = await trigger('genderPreference');
        if (isValid) handleNextStep('LOCATION');
        break;
      case 'LOCATION':
        // Navigation is handled inside renderLocationStep after permission or manual city
        isValid = !!formData.city || (!!formData.current_lat && !!formData.current_lng);
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
        if (isValid) {
          if (!emailOtpVerified) {
            // Just send/show OTP — UI handles it, navigation blocked until verified
            if (!emailOtpSent) void handleSendEmailOtp();
          } else {
            handleNextStep('PHONE');
          }
        }
        break;
      case 'PHONE':
        if (!phoneOtpVerified) {
          if (!phoneOtpSent) void handleSendPhoneOtp();
          // Navigation blocked until verified
        } else {
          handleNextStep('PASSWORD');
        }
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
        if (isValid) handleNextStep('PHOTOS');
        break;
      case 'PHOTOS':
        // Navigation handled inside renderPhotosStep
        break;
      case 'LIVENESS':
        handleNextStep('GUIDELINES');
        break;
    }
  };

  const goBack = () => {
    switch (step) {
      case 'NAME': onCancel(); break;
      case 'AGE': handlePrevStep('NAME'); break;
      case 'GENDER': handlePrevStep('AGE'); break;
      case 'PREFERENCE': handlePrevStep('GENDER'); break;
      case 'LOCATION': handlePrevStep('PREFERENCE'); break;
      case 'ROLE': handlePrevStep('LOCATION'); break;
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
      case 'PHOTOS': handlePrevStep('DOCUMENTS'); break;
      case 'LIVENESS': handlePrevStep('PHOTOS'); break;
      case 'GUIDELINES': handlePrevStep('LIVENESS'); break;
    }
  };

  const OTP_MAX_SENDS = 3;
  const OTP_COOLDOWN_SECONDS = 60;

  // Countdown timers
  useEffect(() => {
    if (emailOtpCooldown <= 0) return;
    const t = setTimeout(() => setEmailOtpCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [emailOtpCooldown]);

  useEffect(() => {
    if (phoneOtpCooldown <= 0) return;
    const t = setTimeout(() => setPhoneOtpCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phoneOtpCooldown]);

  // ── Email OTP handlers ────────────────────────────────────────────────────
  const handleSendEmailOtp = async () => {
    const isValid = await trigger('email');
    if (!isValid) return;
    if (emailOtpCooldown > 0) return;
    setEmailOtpLoading(true);
    setEmailOtpError(null);
    const { error } = await sendVerificationOtp(formData.email);
    if (error) {
      setEmailOtpError('Doğrulama kodu gönderilemedi. E-posta adresinizi kontrol edin.');
    } else {
      setEmailOtpSent(true);
      setEmailOtpCooldown(OTP_COOLDOWN_SECONDS);
    }
    setEmailOtpLoading(false);
  };

  const handleVerifyEmailOtp = async () => {
    if (!emailOtpCode || emailOtpCode.length < 6) {
      setEmailOtpError('6 haneli kodu eksiksiz girin.');
      return;
    }
    setEmailOtpLoading(true);
    setEmailOtpError(null);
    const { error } = await verifyOtp(formData.email, emailOtpCode);
    if (error) {
      setEmailOtpError('Kod yanlış veya süresi dolmuş. Yeniden gönderin.');
    } else {
      setEmailOtpVerified(true);
    }
    setEmailOtpLoading(false);
  };

  // ── Phone OTP handlers ────────────────────────────────────────────────────
  const handleSendPhoneOtp = async () => {
    if (phoneOtpCooldown > 0) return;
    const phone = formData.phone?.trim() ?? '';
    if (!phone || phone.length < 6) {
      setPhoneOtpError('Geçerli bir telefon numarası girin.');
      return;
    }
    setPhoneOtpLoading(true);
    setPhoneOtpError(null);
    const { error } = await sendPhoneOtp(phone);
    if (error) {
      setPhoneOtpError('SMS gönderilemedi. Numaranızı kontrol edin.');
    } else {
      setPhoneOtpSent(true);
      setPhoneOtpCooldown(OTP_COOLDOWN_SECONDS);
    }
    setPhoneOtpLoading(false);
  };

  const handleVerifyPhoneOtp = async () => {
    if (!phoneOtpCode || phoneOtpCode.length < 6) {
      setPhoneOtpError('6 haneli kodu eksiksiz girin.');
      return;
    }
    setPhoneOtpLoading(true);
    setPhoneOtpError(null);
    const { error } = await verifyPhoneOtp(formData.phone?.trim() ?? '', phoneOtpCode);
    if (error) {
      setPhoneOtpError('Kod yanlış veya süresi dolmuş. Yeniden gönderin.');
    } else {
      setPhoneOtpVerified(true);
    }
    setPhoneOtpLoading(false);
  };

  const handleStartEmailVerification = async () => {
    if (otpCooldown > 0) return; // Still cooling down
    if (otpSendCount >= OTP_MAX_SENDS) {
      setOtpError(`Maksimum ${OTP_MAX_SENDS} kod gönderim hakkınız doldu. Belge ile doğrulayın.`);
      setVerificationStep('DOCUMENT');
      return;
    }
    setOtpError(null);
    setNameMatchError(null);
    setIsVerifyingEmail(true);
    try {
      // 1. Check healthcare domain (new: use healthcare_domains table first)
      const hcResult = await lookupHealthcareDomain(workEmail);
      if (hcResult.error || !hcResult.domain) {
        // Fallback to legacy verified_domains table
        const rawResult: unknown = await getVerifiedDomain(workEmail);
        const { domain, error } = parseGetVerifiedDomainResult(rawResult);
        if (error || !domain) {
          setOtpError('Bu kurum tanınmıyor. Belge ile doğrulayın veya kurumunuzun eklenmesini isteyin.');
          setVerificationStep('DOCUMENT');
          return;
        }
        setMatchedDomain({ domain: domain.domain, tier: domain.tier });
      } else {
        setMatchedDomain({ domain: hcResult.domain.domain, tier: hcResult.domain.tier });
      }

      // 2. Name-email matching check
      const fullName = getValues('name').trim();
      const nameParts = fullName.split(/\s+/);
      const firstName = nameParts[0] ?? '';
      const lastName = nameParts.slice(1).join(' ') || firstName;

      const matchResult = matchNameWithEmail(workEmail, firstName, lastName);
      setNameMatchDecision(matchResult.decision);
      setNameMatchScore(matchResult.score);
      void logNameEmailMatch(workEmail, firstName, lastName, matchResult);

      if (matchResult.decision === 'rejected') {
        setNameMatchError(
          `E-posta adresindeki isim "${workEmail.split('@')[0] ?? ''}" ile girdiğiniz ad-soyad "${fullName}" uyuşmuyor. ` +
          'Belge ile doğrulayın ya da kurumsal adınızı kontrol edin.'
        );
        setVerificationStep('DOCUMENT');
        return;
      }

      if (matchResult.decision === 'manual_review') {
        setNameMatchError(
          `İsim eşleşmesi tam doğrulanamadı (skor: ${matchResult.score}/100). ` +
          'Devam edebilirsiniz ancak kayıt manuel incelemeye alınacak.'
        );
        // Continue but flag for manual review
      }

      // 3. Send OTP
      const otpResult = await sendVerificationOtp(workEmail);
      if (otpResult.error) {
        setOtpError(otpResult.error.message);
        return;
      }

      setOtpSent(true);
      setOtpSendCount((c) => c + 1);
      setOtpCooldown(OTP_COOLDOWN_SECONDS);
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

    const runDeviceCheckAndComplete = async () => {
      // ── Device fingerprint check ────────────────────────────────────────
      const deviceResult = await deviceAbuseService.checkDeviceOnRegister(
        deviceFingerprint,
        // userId not yet assigned — pass empty string; service handles gracefully
        '',
      );

      if (deviceResult.status === 'blocked') {
        setDeviceBlocked(true);
        return;
      }

      if (deviceResult.status === 'extra_verify') {
        setShowExtraVerification(true);
        return;
      }

      // ── Proceed with registration ───────────────────────────────────────
      const baseVerification: VerificationPayload =
        verificationStep === 'EMAIL_OTP' && matchedDomain && otpSent
          ? {
            method: 'EMAIL',
            workEmail,
            tier: matchedDomain.tier,
            domain: matchedDomain.domain,
          }
          : { method: 'DOCUMENT', documentFile: documentFile ?? undefined };

      const verification: VerificationPayload = {
        ...baseVerification,
        livenessSessionId: livenessSessionId ?? undefined,
        livenessScore: livenessScore ?? undefined,
        livenessNeedsReview,
        livenessSkipped,
        nameMatchDecision: nameMatchDecision ?? undefined,
        nameMatchScore: nameMatchScore ?? undefined,
      };

      onComplete(getValues(), verification);
    };

    void runDeviceCheckAndComplete();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, submittedPending]);

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

  const handleGetLocation = async () => {
    setLocLoading(true);
    setLocError(null);
    try {
      // Try with a longer timeout and high accuracy
      const coords = await new Promise<{ lat: number; lng: number }>((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('NO_SUPPORT'));
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          (err) => reject(err),
          { timeout: 15000, maximumAge: 0, enableHighAccuracy: false },
        );
      });
      setValue('current_lat', coords.lat);
      setValue('current_lng', coords.lng);
      setValue('city', 'Detected via GPS');
      handleNextStep('ROLE');
    } catch (err: any) {
      // GeolocationPositionError codes: 1=PERMISSION_DENIED, 2=POSITION_UNAVAILABLE, 3=TIMEOUT
      const code = err?.code;
      if (code === 1) {
        setLocError('Konum izni reddedildi. Tarayıcı ayarlarından izin verin ve tekrar deneyin.');
      } else if (code === 2) {
        setLocError('Konumunuz tespit edilemedi. Cihazınızın konum servislerini açık olduğundan emin olun.');
      } else if (code === 3) {
        setLocError('Konum alımı zaman aşımına uğradı. Lütfen tekrar deneyin.');
      } else {
        setLocError('Konum alınamadı. Tarayıcı konum iznini kontrol edin ve tekrar deneyin.');
      }
    } finally {
      setLocLoading(false);
    }
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
                setValue('gender', g, { shouldValidate: true });
                handleNextStep('PREFERENCE');
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
                setValue('genderPreference', option.value, { shouldValidate: true });
                handleNextStep('LOCATION');
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

  const renderLocationStep = () => {
    return (
      <LayoutShell
        stepKey="LOCATION"
        direction={direction}
        footer={
          <div className="flex flex-col gap-3">
            <button
              onClick={handleGetLocation}
              disabled={locLoading}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-gold-600 to-gold-400 text-slate-950 font-bold tracking-wide shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {locLoading ? <Loader2 className="animate-spin" size={20} /> : <MapPin size={20} />}
              {locLoading ? 'Tespit Ediliyor...' : (locError ? 'Tekrar Dene' : 'Konumumu Paylaş')}
            </button>
            <button
              onClick={() => handlePrevStep('PREFERENCE')}
              className="w-full py-3 text-slate-500 hover:text-slate-300 text-sm font-medium transition-colors"
            >
              Geri Dön
            </button>
          </div>
        }
      >
        <div className="space-y-5">
          <div className="w-20 h-20 bg-gold-500/10 rounded-3xl flex items-center justify-center mb-6 mx-auto border border-gold-500/20">
            <MapPin size={40} className={locError ? 'text-red-400' : 'text-gold-500'} />
          </div>

          {!locError ? (
            <div className="text-center space-y-3">
              <h2 className="text-3xl font-serif text-white leading-tight">Güvenli Topluluk</h2>
              <p className="text-slate-400 leading-relaxed max-w-[280px] mx-auto text-sm">
                Size en yakın doktorları bulabilmemiz için konumunuz gereklidir.
              </p>
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-900/50 border border-slate-800/50 mt-4 text-left">
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-gold-500 shrink-0">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Gizlilik Garantisi</p>
                  <p className="text-[10px] text-slate-500">Tam konumunuz asla paylaşılmaz.</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <h2 className="text-2xl font-serif text-white leading-tight text-center">Konum İzni Gerekli</h2>
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3">
                <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
                <p className="text-xs text-red-200 leading-relaxed">{locError}</p>
              </div>
              <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-3">
                <p className="text-xs font-semibold text-gold-400 uppercase tracking-wider">macOS İzin Adımları</p>
                <div className="space-y-2">
                  {[
                    '🍎 Apple menüsü → Sistem Ayarları',
                    '🔒 Gizlilik & Güvenlik → Konum Servisleri',
                    '✅ Konum Servisleri\'ni Etkinleştir',
                    '🌐 Listede Chrome / Safari\'yi bulun → İzin Ver',
                    '🔄 Sayfayı yenileyin ve tekrar deneyin',
                  ].map((step, i) => (
                    <p key={i} className="text-[11px] text-slate-300 leading-snug">{step}</p>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </LayoutShell>
    );
  };

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
            Geri
          </button>
          <button
            onClick={() => { void goNext(); }}
            disabled={!formData.university}
            className="flex-1 py-4 rounded-xl bg-gradient-to-r from-gold-600 to-gold-400 text-slate-950 font-bold text-lg shadow-lg hover:scale-[1.02] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Devam Et <ChevronRight size={20} />
          </button>
        </div>
      }
    >
      <div className="space-y-4 pt-8">
        <h2 className="text-3xl font-serif text-white">Hangi Üniversiteyi Okudunuz?</h2>
        <div className="relative">
          <GraduationCap className="absolute left-4 top-3.5 text-slate-500 z-10" size={18} />
          <input
            autoFocus
            type="text"
            placeholder="Üniversite ara..."
            value={uniSearch}
            onChange={(e) => {
              setUniSearch(e.target.value);
              setShowUniDropdown(true);
              // If user clears or changes text, clear the saved value
              if (formData.university && e.target.value !== formData.university) {
                setValue('university', '', { shouldValidate: false });
              }
            }}
            onFocus={() => setShowUniDropdown(true)}
            onBlur={() => setTimeout(() => setShowUniDropdown(false), 150)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-white focus-visible:outline-none focus-visible:border-gold-500 focus-visible:ring-2 focus-visible:ring-gold-500/40 transition-colors text-base"
          />
          {/* Dropdown */}
          {showUniDropdown && uniSuggestions.length > 0 && (
            <div className="absolute z-50 left-0 right-0 mt-1 bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-2xl max-h-64 overflow-y-auto">
              {uniSuggestions.map((uni) => (
                <button
                  key={uni.name}
                  type="button"
                  onMouseDown={() => {
                    setValue('university', uni.name, { shouldValidate: true });
                    setUniSearch(uni.name);
                    setShowUniDropdown(false);
                  }}
                  className="w-full text-left px-4 py-3 text-sm text-white hover:bg-slate-800 transition-colors border-b border-slate-800 last:border-0"
                >
                  <p className="font-medium text-white leading-tight">{uni.name}</p>
                </button>
              ))}
            </div>
          )}
          {/* No results */}
          {showUniDropdown && uniSearch.length >= 2 && uniSuggestions.length === 0 && (
            <div className="absolute z-50 left-0 right-0 mt-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3">
              <p className="text-sm text-slate-400">Sonuç bulunamadı. Farklı bir arama deneyin.</p>
            </div>
          )}
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
        <div className="flex flex-col gap-2">
          {/* Primary action changes by state */}
          {emailOtpVerified ? (
            <button
              onClick={() => void goNext()}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-gold-600 to-gold-400 text-slate-950 font-bold text-base shadow-lg hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
            >
              Devam Et <ChevronRight size={20} />
            </button>
          ) : emailOtpSent ? (
            <button
              onClick={() => void handleVerifyEmailOtp()}
              disabled={emailOtpLoading || emailOtpCode.length < 6}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-gold-600 to-gold-400 text-slate-950 font-bold text-base shadow-lg hover:scale-[1.02] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {emailOtpLoading ? <Loader2 size={18} className="animate-spin" /> : null}
              E-postayı Doğrula
            </button>
          ) : (
            <button
              onClick={() => void handleSendEmailOtp()}
              disabled={!formData.email || emailOtpLoading}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-gold-600 to-gold-400 text-slate-950 font-bold text-base shadow-lg hover:scale-[1.02] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {emailOtpLoading ? <Loader2 size={18} className="animate-spin" /> : <Mail size={18} />}
              Doğrulama Kodu Gönder
            </button>
          )}
          <button onClick={goBack} className="w-full py-2 text-slate-600 hover:text-slate-400 text-xs transition-colors">
            Geri Dön
          </button>
        </div>
      }
    >
      <div className="space-y-5 pt-8">
        <div className="space-y-1">
          <h2 className="text-3xl font-serif text-white">E-posta Adresiniz</h2>
        </div>

        {/* Email input */}
        <div className="relative">
          <Mail className="absolute left-4 top-3.5 text-slate-500" size={18} />
          <input
            autoFocus={!emailOtpSent}
            type="email"
            placeholder="ad.soyad@hastane.com"
            {...register('email')}
            disabled={emailOtpSent}
            className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-3 pl-12 pr-4 text-white focus-visible:outline-none focus-visible:border-gold-500 focus-visible:ring-2 focus-visible:ring-gold-500/40 transition-colors text-base disabled:opacity-60"
            onKeyDown={(e) => !emailOtpSent && e.key === 'Enter' && void handleSendEmailOtp()}
          />
          {emailOtpSent && (
            <button
              onClick={() => { setEmailOtpSent(false); setEmailOtpCode(''); setEmailOtpError(null); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-gold-400 hover:text-gold-300 transition-colors"
            >
              Değiştir
            </button>
          )}
        </div>
        {errors.email && <p className="text-red-400 text-sm">{errors.email.message}</p>}

        {/* OTP sent state */}
        {emailOtpSent && !emailOtpVerified && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300 mt-2">
            {/* Premium Glassmorphic Notification Card */}
            <div className="relative overflow-hidden p-6 rounded-2xl bg-slate-800/40 border border-slate-700/50 shadow-2xl backdrop-blur-md flex flex-col items-center gap-3">
              <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-gold-500/50 to-transparent" />

              <div className="w-12 h-12 rounded-full bg-gold-500/10 flex items-center justify-center border border-gold-500/30 shadow-[0_0_20px_rgba(201,151,59,0.15)] mb-1">
                <Mail size={22} className="text-gold-400" />
              </div>

              <p className="text-[15px] text-slate-300 leading-relaxed text-center max-w-[280px]">
                <span className="font-semibold text-white block text-lg mb-1">{formData.email}</span>
                adresine 6 haneli doğrulama kodu gönderildi.
              </p>
              <p className="text-xs text-slate-500 text-center">E-posta gelmezse spam klasörünü kontrol edin.</p>
            </div>

            {/* Premium 6-digit OTP input */}
            <input
              autoFocus
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="· · · · · ·"
              value={emailOtpCode}
              onChange={(e) => { setEmailOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setEmailOtpError(null); }}
              className="w-full bg-slate-900/40 border border-slate-700/80 rounded-2xl py-6 px-4 text-white text-center text-[2.25rem] tracking-[0.6em] font-mono shadow-inner focus-visible:outline-none focus-visible:border-gold-500 focus-visible:ring-2 focus-visible:ring-gold-500/40 transition-all placeholder:text-slate-600 backdrop-blur-sm"
              onKeyDown={(e) => e.key === 'Enter' && void handleVerifyEmailOtp()}
            />

            {/* Error */}
            {emailOtpError && <p className="text-red-400 text-xs text-center">{emailOtpError}</p>}

            {/* Resend */}
            <button
              onClick={() => void handleSendEmailOtp()}
              disabled={emailOtpCooldown > 0}
              className="w-full text-xs text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-40"
            >
              {emailOtpCooldown > 0 ? `Yeniden gönder (${emailOtpCooldown}s)` : 'Kodu Yeniden Gönder'}
            </button>
          </div>
        )}

        {/* Verified state */}
        {emailOtpVerified && (
          <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-green-500/10 border border-green-500/25 animate-in fade-in duration-300">
            <CheckCircle2 size={18} className="text-green-400 flex-shrink-0" />
            <p className="text-sm text-green-300 font-medium">E-posta doğrulandı</p>
          </div>
        )}

        {/* Personal email notice */}
        {isPersonalEmail && !errors.email && !emailOtpSent && (
          <div className="flex items-start gap-2.5 bg-amber-900/20 border border-amber-500/30 rounded-2xl p-3">
            <AlertCircle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-200/80 leading-relaxed">
              Bireysel e-posta tespit edildi. Mesleki belge yüklemeniz gerekecektir.
            </p>
          </div>
        )}
      </div>
    </LayoutShell>
  );

  const renderPhoneStep = () => (
    <LayoutShell
      stepKey="PHONE"
      direction={direction}
      footer={
        <div className="flex flex-col gap-2">
          {phoneOtpVerified ? (
            <button
              onClick={() => void goNext()}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-gold-600 to-gold-400 text-slate-950 font-bold text-base shadow-lg hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
            >
              Devam Et <ChevronRight size={20} />
            </button>
          ) : phoneOtpSent ? (
            <button
              onClick={() => void handleVerifyPhoneOtp()}
              disabled={phoneOtpLoading || phoneOtpCode.length < 6}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-gold-600 to-gold-400 text-slate-950 font-bold text-base shadow-lg hover:scale-[1.02] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {phoneOtpLoading ? <Loader2 size={18} className="animate-spin" /> : null}
              Numarayı Doğrula
            </button>
          ) : (
            <button
              onClick={() => void handleSendPhoneOtp()}
              disabled={!formData.phone || phoneOtpLoading}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-gold-600 to-gold-400 text-slate-950 font-bold text-base shadow-lg hover:scale-[1.02] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {phoneOtpLoading ? <Loader2 size={18} className="animate-spin" /> : null}
              SMS Kodu Gönder
            </button>
          )}
          <button onClick={goBack} className="w-full py-2 text-slate-600 hover:text-slate-400 text-xs transition-colors">
            Geri Dön
          </button>
        </div>
      }
    >
      <div className="space-y-5 pt-8">
        <div className="space-y-1">
          <h2 className="text-3xl font-serif text-white">Telefon Numaranız</h2>
          <p className="text-slate-400 text-sm">SMS ile doğrulama kodu gönderilecek.</p>
        </div>

        {/* Phone input */}
        <div className="flex gap-2">
          <select
            value={countryCode}
            disabled={phoneOtpSent}
            onChange={(e) => {
              setCountryCode(e.target.value);
              const currentPhone = formData.phone ?? '';
              const numberOnly = currentPhone.replace(/^\+\d+\s*/, '');
              setValue('phone', `${e.target.value} ${numberOnly}`);
            }}
            className="w-[100px] bg-slate-900 border border-slate-800 rounded-2xl py-3 px-3 text-white text-base focus-visible:outline-none focus-visible:border-gold-500 focus-visible:ring-2 focus-visible:ring-gold-500/40 transition-colors appearance-none flex-shrink-0 disabled:opacity-60"
          >
            {COUNTRY_CODES.map(c => (
              <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
            ))}
          </select>
          <div className="relative flex-1">
            <input
              autoFocus={!phoneOtpSent}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              disabled={phoneOtpSent}
              placeholder={COUNTRY_CODES.find(c => c.code === countryCode)?.placeholder ?? '555 000 0000'}
              onChange={(e) => {
                setValue('phone', `${countryCode} ${e.target.value}`);
                setPhoneOtpSent(false);
                setPhoneOtpVerified(false);
              }}
              className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-3 px-4 text-white focus-visible:outline-none focus-visible:border-gold-500 focus-visible:ring-2 focus-visible:ring-gold-500/40 transition-colors text-base disabled:opacity-60"
              onKeyDown={(e) => !phoneOtpSent && e.key === 'Enter' && void handleSendPhoneOtp()}
            />
            {phoneOtpSent && !phoneOtpVerified && (
              <button
                onClick={() => { setPhoneOtpSent(false); setPhoneOtpCode(''); setPhoneOtpError(null); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-gold-400 hover:text-gold-300 transition-colors"
              >
                Değiştir
              </button>
            )}
          </div>
        </div>

        {/* OTP sent state */}
        {phoneOtpSent && !phoneOtpVerified && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300 mt-2">
            {/* Premium Glassmorphic Notification Card */}
            <div className="relative overflow-hidden p-6 rounded-2xl bg-slate-800/40 border border-slate-700/50 shadow-2xl backdrop-blur-md flex flex-col items-center gap-3">
              <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-gold-500/50 to-transparent" />

              <div className="w-12 h-12 rounded-full bg-gold-500/10 flex items-center justify-center border border-gold-500/30 shadow-[0_0_20px_rgba(201,151,59,0.15)] mb-1">
                {/* Fallback to AlertCircle since Smartphone import is unknown, but visually it works as an icon container */}
                <svg className="text-gold-400" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.86 19.86 0 0 1-8.63-3.15 19.45 19.45 0 0 1-6-6 19.89 19.89 0 0 1-3.14-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.8 12.8 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.8 12.8 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
              </div>

              <p className="text-[15px] text-slate-300 leading-relaxed text-center max-w-[280px]">
                <span className="font-semibold text-white block text-lg mb-1">{formData.phone}</span>
                numarasına SMS ile doğrulama kodu gönderildi.
              </p>
            </div>

            {/* Premium 6-digit OTP input */}
            <input
              autoFocus
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="· · · · · ·"
              value={phoneOtpCode}
              onChange={(e) => { setPhoneOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setPhoneOtpError(null); }}
              className="w-full bg-slate-900/40 border border-slate-700/80 rounded-2xl py-6 px-4 text-white text-center text-[2.25rem] tracking-[0.6em] font-mono shadow-inner focus-visible:outline-none focus-visible:border-gold-500 focus-visible:ring-2 focus-visible:ring-gold-500/40 transition-all placeholder:text-slate-600 backdrop-blur-sm"
              onKeyDown={(e) => e.key === 'Enter' && void handleVerifyPhoneOtp()}
            />

            {/* Error */}
            {phoneOtpError && <p className="text-red-400 text-xs text-center">{phoneOtpError}</p>}

            {/* Resend */}
            <button
              onClick={() => void handleSendPhoneOtp()}
              disabled={phoneOtpCooldown > 0}
              className="w-full text-xs text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-40"
            >
              {phoneOtpCooldown > 0 ? `Yeniden gönder (${phoneOtpCooldown}s)` : 'SMS\'i Yeniden Gönder'}
            </button>
          </div>
        )}

        {/* Verified state */}
        {phoneOtpVerified && (
          <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-green-500/10 border border-green-500/25 animate-in fade-in duration-300">
            <CheckCircle2 size={18} className="text-green-400 flex-shrink-0" />
            <p className="text-sm text-green-300 font-medium">Telefon numarası doğrulandı</p>
          </div>
        )}

        {phoneOtpError && !phoneOtpSent && <p className="text-red-400 text-sm">{phoneOtpError}</p>}

        {!phoneOtpSent && (
          <p className="text-slate-600 text-xs">Telefon numaranız asla paylaşılmaz.</p>
        )}
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
              disabled={isVerifyingEmail || !workEmail || otpCooldown > 0}
              className="w-full py-4 rounded-xl bg-white text-slate-950 font-bold text-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
            >
              {isVerifyingEmail
                ? 'Gönderiliyor...'
                : otpCooldown > 0
                  ? `Tekrar gönder (${otpCooldown}s)`
                  : otpSent ? 'Tekrar Gönder' : 'Kod Gönder'}
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
            {nameMatchError && (
              <div className="flex items-start gap-2 bg-amber-900/30 border border-amber-700/40 rounded-xl px-3 py-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-amber-300 text-xs">{nameMatchError}</p>
              </div>
            )}
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

  // ── PHOTO UPLOAD STEP ────────────────────────────────────────────────────────
  const renderPhotosStep = () => {
    const MIN_PHOTOS = 3;
    const TOTAL_SLOTS = 6;
    const canProceed = uploadedPhotos.length >= MIN_PHOTOS;

    const openPicker = () => photoInputRef.current?.click();

    const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      const newPhotos = files
        .filter(f => f.type.startsWith('image/'))
        .slice(0, TOTAL_SLOTS - uploadedPhotos.length)
        .map(f => ({ file: f, url: URL.createObjectURL(f) }));
      setUploadedPhotos(prev => [...prev, ...newPhotos]);
      e.target.value = '';
    };

    const removePhoto = (idx: number) => {
      setUploadedPhotos(prev => {
        URL.revokeObjectURL(prev[idx]?.url ?? '');
        return prev.filter((_, i) => i !== idx);
      });
    };

    if (showFaceVerifyPrompt) {
      return (
        <LayoutShell stepKey="PHOTOS" direction={direction}>
          <div className="flex flex-col items-center gap-6 pt-6 text-center">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gold-500/10 border-2 border-gold-500/25 flex items-center justify-center shadow-[0_0_50px_rgba(201,155,59,0.2)]">
                <ShieldCheck className="w-11 h-11 text-gold-400" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-slate-950 border-2 border-slate-800 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-3xl font-serif text-white leading-tight">Fotoğraflarınız Yüklendi</h2>
              <p className="text-slate-400 text-sm leading-relaxed max-w-[270px] mx-auto">
                Vitalis'e hoş geldiniz. Güvenliğiniz için yüz doğrulaması yapabilirsiniz.
              </p>
            </div>

            <div className="flex gap-2 justify-center">
              {uploadedPhotos.slice(0, 5).map((p, i) => (
                <div key={i} className="w-10 h-10 rounded-full overflow-hidden border-2 border-gold-500/30">
                  <img src={p.url} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>

            <div className="w-full rounded-2xl bg-slate-900/60 border border-slate-800 p-5 space-y-4 text-left">
              <div className="space-y-1.5">
                <p className="text-sm font-semibold text-white">Yüz Doğrulaması Yapmak İster misiniz?</p>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Yüz doğrulaması profilinize <span className="text-gold-400 font-medium">Doğrulanmış 🛡️</span> rozeti ekler
                  ve eşleşme önceliğinizi artırır. Yaklaşık 30 saniye sürer.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => { setShowFaceVerifyPrompt(false); handleNextStep('LIVENESS'); }}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-gold-600 to-gold-400 text-slate-950 font-bold text-sm shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <ShieldCheck size={16} /> Evet, Yüz Doğrulaması Yapmak İstiyorum
                </button>
                <button
                  onClick={() => { setShowFaceVerifyPrompt(false); handleNextStep('GUIDELINES'); }}
                  className="w-full py-3 rounded-2xl border border-slate-700 text-slate-400 text-sm font-medium hover:text-white hover:border-slate-500 transition-all"
                >
                  Hayır, Şimdilik Devam Et
                </button>
              </div>
            </div>
          </div>
        </LayoutShell>
      );
    }

    return (
      <LayoutShell
        stepKey="PHOTOS"
        direction={direction}
        footer={
          <div className="flex flex-col gap-3">
            <button
              onClick={() => canProceed && setShowFaceVerifyPrompt(true)}
              disabled={!canProceed}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-gold-600 to-gold-400 text-slate-950 font-bold text-base shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              Devam Et <ChevronRight size={20} />
            </button>
            <button onClick={goBack} className="w-full py-2 text-slate-600 hover:text-slate-400 text-xs transition-colors">
              Geri Dön
            </button>
          </div>
        }
      >
        <div className="space-y-5 pt-4">
          {/* Header */}
          <div className="space-y-1">
            <h2 className="text-3xl font-serif text-white">Fotoğraflarınızı Ekleyin</h2>
            <p className="text-slate-400 text-sm">
              En az <span className="text-gold-400 font-semibold">3 fotoğraf</span> ekleyin
              <span className="text-slate-600"> ({uploadedPhotos.length}/{TOTAL_SLOTS})</span>
            </p>
          </div>

          {/* 6 fixed card grid */}
          <div className="grid grid-cols-3 gap-2.5">
            {Array.from({ length: TOTAL_SLOTS }).map((_, slotIndex) => {
              const photo = uploadedPhotos[slotIndex];
              const isFilled = Boolean(photo);
              const isNextEmpty = slotIndex === uploadedPhotos.length;

              return (
                <div key={slotIndex} className="relative aspect-[3/4]">
                  {isFilled ? (
                    // ── Filled card ─────────────────────────────────────
                    <div className="relative w-full h-full rounded-2xl overflow-hidden border border-slate-700 group">
                      <img
                        src={photo!.url}
                        alt={`Fotoğraf ${slotIndex + 1}`}
                        className="w-full h-full object-cover"
                      />
                      {/* Delete overlay */}
                      <button
                        onClick={() => removePhoto(slotIndex)}
                        className="absolute inset-0 bg-slate-950/55 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5"
                      >
                        <AlertCircle size={20} className="text-red-400" />
                        <span className="text-[10px] text-red-300 font-medium">Kaldır</span>
                      </button>
                      {/* Slot number badge */}
                      <div className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-slate-950/75 flex items-center justify-center">
                        <span className="text-[9px] text-gold-400 font-bold">{slotIndex + 1}</span>
                      </div>
                      {/* Primary badge on first photo */}
                      {slotIndex === 0 && (
                        <div className="absolute bottom-1.5 left-1.5 right-1.5">
                          <div className="bg-gold-500/20 border border-gold-500/30 rounded-lg px-1.5 py-0.5 text-center">
                            <span className="text-[9px] text-gold-400 font-semibold">Ana Fotoğraf</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    // ── Empty card ──────────────────────────────────────
                    <button
                      onClick={uploadedPhotos.length < TOTAL_SLOTS ? openPicker : undefined}
                      disabled={uploadedPhotos.length >= TOTAL_SLOTS}
                      className={[
                        'w-full h-full rounded-2xl border-2 border-dashed transition-all duration-200 flex flex-col items-center justify-center gap-2',
                        isNextEmpty
                          ? 'border-gold-500/40 bg-gold-500/5 hover:border-gold-500/70 hover:bg-gold-500/10'
                          : 'border-slate-800 bg-slate-900/30 hover:border-slate-600 hover:bg-slate-800/30',
                      ].join(' ')}
                    >
                      <div className={[
                        'w-9 h-9 rounded-full flex items-center justify-center transition-colors',
                        isNextEmpty ? 'bg-gold-500/15' : 'bg-slate-800',
                      ].join(' ')}>
                        <Upload size={15} className={isNextEmpty ? 'text-gold-400' : 'text-slate-600'} />
                      </div>
                      <span className={['text-[10px] font-medium', isNextEmpty ? 'text-gold-400/70' : 'text-slate-700'].join(' ')}>
                        {slotIndex + 1}. Ekle
                      </span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Hidden file input */}
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handlePhotoSelect}
          />

          {/* Progress bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-500">{uploadedPhotos.length} / {MIN_PHOTOS} minimum</span>
              {canProceed
                ? <span className="text-green-400 font-medium">✓ Devam edebilirsiniz</span>
                : <span className="text-slate-600">{MIN_PHOTOS - uploadedPhotos.length} fotoğraf daha ekleyin</span>
              }
            </div>
            <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-gold-600 to-gold-400 transition-all duration-500"
                style={{ width: `${Math.min((uploadedPhotos.length / MIN_PHOTOS) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </LayoutShell>
    );
  };


  const renderLivenessStep = () => (
    <LayoutShell stepKey="LIVENESS" direction={direction}>
      <div className="flex flex-col gap-4 pt-2">

        {(livenessSessionId && livenessScore !== null && !livenessNeedsReview) ? (
          // ── PASSED ────────────────────────────────────────────────────────
          <div className="flex flex-col items-center gap-6 py-10">
            <div className="w-24 h-24 rounded-full bg-green-500/10 border-2 border-green-500/30 flex items-center justify-center shadow-[0_0_40px_rgba(34,197,94,0.15)]">
              <CheckCircle2 className="w-12 h-12 text-green-400" />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-serif text-white">Kimlik Doğrulandı</h2>
              <p className="text-sm text-slate-400">Canlılık testi başarıyla tamamlandı.</p>
            </div>
            <button
              onClick={() => handleNextStep('GUIDELINES')}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-gold-600 to-gold-400 text-slate-950 font-bold text-base shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
            >
              Devam Et <ChevronRight className="w-5 h-5" />
            </button>
          </div>

        ) : livenessNeedsReview ? (
          // ── MANUAL REVIEW ─────────────────────────────────────────────────
          <div className="flex flex-col items-center gap-6 py-10">
            <div className="w-24 h-24 rounded-full bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center shadow-[0_0_40px_rgba(245,158,11,0.15)]">
              <AlertTriangle className="w-12 h-12 text-amber-400" />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-serif text-white">İnceleme Gerekiyor</h2>
              <p className="text-sm text-slate-400 max-w-[260px] mx-auto leading-relaxed">
                Ekibimiz kaydınızı 24 saat içinde inceleyecek ve size bilgi verecek.
              </p>
            </div>
            <button
              onClick={() => handleNextStep('GUIDELINES')}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-gold-600 to-gold-400 text-slate-950 font-bold text-base shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
            >
              Kayıt Sürecine Devam Et <ChevronRight className="w-5 h-5" />
            </button>
          </div>

        ) : (
          // ── LIVENESS CHECK — rendered by LivenessCheck component ─────────
          <>
            <LivenessCheck
              onSuccess={(sid, score) => {
                setLivenessSessionId(sid);
                setLivenessScore(score);
                setLivenessSkipped(false);
              }}
              onFailed={(sid) => {
                setLivenessSessionId(sid);
                setLivenessScore(null);
              }}
              onManualReview={(sid) => {
                setLivenessSessionId(sid);
                setLivenessNeedsReview(true);
              }}
              maxAttempts={3}
            />
          </>
        )}
      </div>
    </LayoutShell>
  );

  const renderGuidelinesStep = () => (
    <CommunityGuidelines
      mode="ONBOARDING"
      onAccept={() => {
        setStep('PENDING');
      }}
    />
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

  // Device blocked — show hard stop
  if (deviceBlocked) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center space-y-4">
          <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center justify-center mx-auto">
            <ShieldCheck size={28} className="text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-white">Kayıt Yapılamıyor</h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            Bu cihazdan çok sayıda hesap oluşturma girişimi tespit edildi.
            Daha fazla bilgi için destek ekibimize başvurun.
          </p>
          <button
            type="button"
            onClick={onCancel}
            className="w-full py-3 rounded-xl border border-slate-700 text-sm text-slate-400 hover:text-white transition-colors"
          >
            Geri Dön
          </button>
        </div>
      </div>
    );
  }

  // Device requires extra verification — show ExtraVerificationRequired
  if (showExtraVerification) {
    return (
      <ExtraVerificationRequired
        deviceFingerprint={deviceFingerprint}
        onVerified={() => {
          // After extra verify passes, proceed with registration
          setShowExtraVerification(false);
          const verification: VerificationPayload =
            verificationStep === 'EMAIL_OTP' && matchedDomain && otpSent
              ? { method: 'EMAIL', workEmail, tier: matchedDomain.tier, domain: matchedDomain.domain }
              : { method: 'DOCUMENT', documentFile: documentFile ?? undefined };
          onComplete(getValues(), verification);
        }}
        onCancel={onCancel}
      />
    );
  }

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
        {step === 'LOCATION' && renderLocationStep()}
        {step === 'ROLE' && renderRoleStep()}
        {step === 'SPECIALTY' && renderSpecialtyStep()}
        {step === 'UNIVERSITY' && renderUniversityStep()}
        {step === 'EMAIL' && renderEmailStep()}
        {step === 'PHONE' && renderPhoneStep()}
        {step === 'PASSWORD' && renderPasswordStep()}
        {step === 'DOCUMENTS' && renderDocumentsStep()}
        {step === 'PHOTOS' && renderPhotosStep()}
        {step === 'LIVENESS' && renderLivenessStep()}
        {step === 'GUIDELINES' && renderGuidelinesStep()}
        {step === 'PENDING' && renderPendingStep()}
      </div>
    </div>
  );
};
