import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { MedicalRole, Specialty } from '../types';
import { ChevronRight, Upload, FileCheck, ShieldCheck, CheckCircle2, AlertCircle, Loader2, User, Mail, Phone, Building2, Stethoscope, ChevronLeft, Lock } from 'lucide-react';
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
};

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
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  phone: z.string().optional(),
  role: z
    .string()
    .min(1, 'Medical role is required')
    .refine((value) => Object.values(MedicalRole).includes(value as MedicalRole), 'Select a role'),
  specialty: z
    .string()
    .min(1, 'Specialty is required')
    .refine(
      (value) => Object.values(Specialty).includes(value as Specialty),
      'Select a specialty',
    ),
  institution: z.string().optional(),
  document: z.string().min(1, 'Upload a document to continue'),
});

type RegistrationFormData = z.infer<typeof registrationSchema>;

export const RegistrationFlow: React.FC<RegistrationFlowProps> = ({ onComplete, onCancel }) => {
  const [step, setStep] = useState<Step>('BASIC');
  const [verificationStep, setVerificationStep] = useState<VerificationStep>('EMAIL_INPUT');
  const [workEmail, setWorkEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [matchedDomain, setMatchedDomain] = useState<{ domain: string; tier: number } | null>(null);
  const {
    register,
    trigger,
    setValue,
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
      email: '',
      password: '',
      phone: '',
      role: '',
      specialty: '',
      institution: '',
      document: '',
    },
  });

  const formData = watch();

  const [isUploading, setIsUploading] = useState(false);

  const handleBasicNext = async () => {
    const isValid = await trigger(['name', 'age', 'email', 'password']);
    if (isValid) setStep('PROFESSIONAL');
  };

  const handleProfessionalNext = async () => {
    const isValid = await trigger(['role', 'specialty']);
    if (isValid) setStep('DOCUMENTS');
  };

  const handleDocumentsNext = async () => {
    const isValid = await trigger(['document']);
    if (isValid) setStep('GUIDELINES');
  };

  const handleStartEmailVerification = async () => {
    setOtpError(null);
    setIsVerifyingEmail(true);
    const { domain, error } = await getVerifiedDomain(workEmail);

    if (error || !domain) {
      setOtpError('Kurumsal domain doğrulanamadı. Belge ile doğrulayın.');
      setIsVerifyingEmail(false);
      setVerificationStep('DOCUMENT');
      return;
    }

    setMatchedDomain({ domain: domain.domain, tier: domain.tier });
    const otpResult = await sendVerificationOtp(workEmail);
    if (otpResult.error) {
      setOtpError(otpResult.error.message);
      setIsVerifyingEmail(false);
      return;
    }

    setOtpSent(true);
    setVerificationStep('EMAIL_OTP');
    setIsVerifyingEmail(false);
  };

  const handleVerifyOtp = async () => {
    setOtpError(null);
    setIsVerifyingEmail(true);
    const result = await verifyOtp(workEmail, otpCode);
    if (result.error) {
      setOtpError(result.error.message);
      setIsVerifyingEmail(false);
      return;
    }

    setIsVerifyingEmail(false);
    setStep('GUIDELINES');
  };

  const renderVerification = () => (
    <div className="w-full max-w-md animate-fade-in">
      <button onClick={() => setStep('PROFESSIONAL')} className="mb-6 text-slate-500 hover:text-white flex items-center gap-1">
        <ChevronLeft size={16} /> Back
      </button>

      <div className="text-center mb-6">
        <h2 className="text-2xl font-serif text-white mb-2">Kurumsal Email Doğrulama</h2>
        <p className="text-slate-400 text-sm max-w-xs mx-auto">
          Kurumsal email adresinizi doğrulayarak hızlıca verified olun.
        </p>
      </div>

      {verificationStep === 'EMAIL_INPUT' && (
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Kurumsal Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-3.5 text-slate-500" size={18} />
              <input
                type="email"
                placeholder="ornek@saglik.gov.tr"
                value={workEmail}
                onChange={(e) => setWorkEmail(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-white focus:border-gold-500 focus:outline-none transition-colors"
              />
            </div>
          </div>

          {otpError && <p className="text-xs text-red-400">{otpError}</p>}

          <button
            onClick={handleStartEmailVerification}
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
            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Doğrulama Kodu</label>
            <input
              type="text"
              placeholder="123456"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 px-4 text-white focus:border-gold-500 focus:outline-none transition-colors"
            />
          </div>

          {otpError && <p className="text-xs text-red-400">{otpError}</p>}

          <button
            onClick={handleVerifyOtp}
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
        <p className="text-slate-400 text-sm">Let's start with the basics.</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase ml-1">Full Name</label>
          <div className="relative">
            <User className="absolute left-4 top-3.5 text-slate-500" size={18} />
            <input
              type="text"
              placeholder="Dr. Jane Doe"
              {...register('name')}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-white focus:border-gold-500 focus:outline-none transition-colors"
            />
          </div>
          {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Age</label>
            <input
              type="number"
              placeholder="28"
              {...register('age')}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 px-4 text-white focus:border-gold-500 focus:outline-none transition-colors"
            />
            {errors.age && <p className="text-xs text-red-400 mt-1">{errors.age.message}</p>}
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Gender</label>
            <select
              {...register('gender')}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 px-4 text-white focus:border-gold-500 focus:outline-none transition-colors appearance-none"
            >
              <option value="">Select</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Non-binary">Non-binary</option>
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase ml-1">Email</label>
          <div className="relative">
            <Mail className="absolute left-4 top-3.5 text-slate-500" size={18} />
            <input
              type="email"
              placeholder="jane@hospital.com"
              {...register('email')}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-white focus:border-gold-500 focus:outline-none transition-colors"
            />
          </div>
          {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>}
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase ml-1">Password</label>
          <div className="relative">
            <Lock className="absolute left-4 top-3.5 text-slate-500" size={18} />
            <input
              type="password"
              placeholder="Create a password"
              {...register('password')}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-white focus:border-gold-500 focus:outline-none transition-colors"
            />
          </div>
          {errors.password && <p className="text-xs text-red-400 mt-1">{errors.password.message}</p>}
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase ml-1">Phone</label>
          <div className="relative">
            <Phone className="absolute left-4 top-3.5 text-slate-500" size={18} />
            <input
              type="tel"
              placeholder="+1 (555) 000-0000"
              {...register('phone')}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-white focus:border-gold-500 focus:outline-none transition-colors"
            />
          </div>
        </div>
      </div>

      <div className="mt-8 flex gap-3">
        <button onClick={onCancel} className="px-6 py-4 rounded-xl text-slate-400 font-bold hover:text-white transition-colors">
          Cancel
        </button>
        <button
          onClick={handleBasicNext}
          disabled={!formData.name || !formData.age || !formData.email || !formData.password}
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
          <label className="text-xs font-bold text-slate-500 uppercase ml-1">Medical Role</label>
          <select
            {...register('role')}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 px-4 text-white focus:border-gold-500 focus:outline-none transition-colors appearance-none"
          >
            <option value="">Select Role</option>
            {Object.values(MedicalRole).map(role => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
          {errors.role && <p className="text-xs text-red-400 mt-1">{errors.role.message}</p>}
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase ml-1">Specialty</label>
          <select
            {...register('specialty')}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 px-4 text-white focus:border-gold-500 focus:outline-none transition-colors appearance-none"
          >
            <option value="">Select Specialty</option>
            {Object.values(Specialty).map(spec => (
              <option key={spec} value={spec}>{spec}</option>
            ))}
          </select>
          {errors.specialty && (
            <p className="text-xs text-red-400 mt-1">{errors.specialty.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase ml-1">Institution (Optional)</label>
          <div className="relative">
            <Building2 className="absolute left-4 top-3.5 text-slate-500" size={18} />
            <input
              type="text"
              placeholder="City General Hospital"
              {...register('institution')}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-white focus:border-gold-500 focus:outline-none transition-colors"
            />
          </div>
        </div>
      </div>

      <button
        onClick={handleProfessionalNext}
        disabled={!formData.role || !formData.specialty}
        className="w-full mt-8 py-4 rounded-xl bg-gradient-to-r from-gold-600 to-gold-400 text-slate-950 font-bold text-lg shadow-lg hover:scale-[1.02] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Next Step <ChevronRight size={20} />
      </button>
    </div>
  );

  // --- Step 3: Document Upload ---
  const handleFileUpload = () => {
    setIsUploading(true);
    setTimeout(() => {
      setValue('document', 'uploaded_doc.pdf', { shouldValidate: true });
      setIsUploading(false);
    }, 1500);
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
        {isUploading ? (
          <Loader2 size={48} className="text-gold-500 animate-spin mb-4" />
        ) : formData.document ? (
          <>
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 size={32} className="text-green-500" />
            </div>
            <h3 className="text-white font-bold mb-1">Document Uploaded</h3>
            <p className="text-slate-500 text-xs">{formData.document}</p>
            <button
              className="text-xs text-red-400 mt-4 hover:underline"
              onClick={(e) => {
                e.stopPropagation();
                setValue('document', '', { shouldValidate: true });
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
        onClick={handleDocumentsNext}
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

      {/* DEMO SIMULATION BUTTON */}
      <button
        onClick={() => {
          const verification: VerificationPayload =
            verificationStep === 'EMAIL_OTP' && matchedDomain && otpSent
              ? {
                method: 'EMAIL',
                workEmail,
                tier: matchedDomain.tier,
                domain: matchedDomain.domain,
              }
              : { method: 'DOCUMENT' };
          onComplete(getValues(), verification);
        }}
        className="text-xs text-slate-600 hover:text-green-500 border border-transparent hover:border-green-500/30 px-4 py-2 rounded transition-colors"
      >
        [DEV: Simulate Admin Approval]
      </button>
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
