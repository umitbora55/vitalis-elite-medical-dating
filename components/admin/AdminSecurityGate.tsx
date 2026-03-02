/**
 * AdminSecurityGate — Multi-layer security for the admin panel
 *
 * Layer 1: Stealth — shows a realistic 404 page to unauthorized visitors
 * Layer 2: IP Whitelist — checks the visitor's public IP against an allowed list
 * Layer 3: Device Fingerprint — canvas + navigator hash to identify trusted devices
 * Layer 4: Admin Passcode — requires a secret passcode to enter
 *
 * Only after ALL layers pass does the AdminPanelV2 render.
 */

import React, { useCallback, useEffect, useState } from 'react';


// ── Configuration ─────────────────────────────────────────────────────────────
// Add your IP addresses here. Use ipify.org to find your public IP.
const ALLOWED_IPS: string[] = [
    '176.236.192.167',
];

// Device fingerprints of trusted devices (generated on first access)
// After first login, check browser console for your fingerprint hash and add it here.
const TRUSTED_DEVICE_FINGERPRINTS: string[] = [
    'f0e90a6b13c916e82f31863cb1c4d52425e094ce8a392f7ef690c0def1f8fd88',
];

// AUDIT-FIX: TEAM1-P0 — Admin passcode moved to env. Falls back to a long random default
// so the app never ships with a guessable hardcoded secret.
const ADMIN_PASSCODE =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ADMIN_PASSCODE as string | undefined)
    || 'CHANGE_ME_BEFORE_DEPLOY_' + Math.random().toString(36);

// If true, bypasses IP and device checks (for initial setup)
const SETUP_MODE = false;

// ── Utility: Generate device fingerprint ──────────────────────────────────────
async function generateDeviceFingerprint(): Promise<string> {
    const components: string[] = [];

    // Navigator data
    components.push(navigator.userAgent);
    components.push(navigator.language);
    components.push(String(navigator.hardwareConcurrency || 0));
    components.push(String(screen.width) + 'x' + String(screen.height));
    components.push(String(screen.colorDepth));
    components.push(Intl.DateTimeFormat().resolvedOptions().timeZone);
    components.push(navigator.platform || '');

    // Canvas fingerprint
    try {
        const canvas = document.createElement('canvas');
        canvas.width = 200;
        canvas.height = 50;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.textBaseline = 'top';
            ctx.font = '14px Arial';
            ctx.fillStyle = '#f60';
            ctx.fillRect(125, 1, 62, 20);
            ctx.fillStyle = '#069';
            ctx.fillText('Vitalis FP', 2, 15);
            ctx.fillStyle = 'rgba(102,204,0,0.7)';
            ctx.fillText('Vitalis FP', 4, 17);
            components.push(canvas.toDataURL());
        }
    } catch {
        components.push('canvas-unavailable');
    }

    // WebGL renderer
    try {
        const gl = document.createElement('canvas').getContext('webgl');
        if (gl) {
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            if (debugInfo) {
                components.push(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '');
                components.push(gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || '');
            }
        }
    } catch {
        components.push('webgl-unavailable');
    }

    // Hash all components
    const raw = components.join('|||');
    const encoder = new TextEncoder();
    const data = encoder.encode(raw);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ── Utility: Get public IP ────────────────────────────────────────────────────
async function getPublicIP(): Promise<string | null> {
    try {
        const response = await fetch('https://api.ipify.org?format=json', {
            signal: AbortSignal.timeout(5000),
        });
        const data = await response.json();
        return data.ip ?? null;
    } catch {
        return null;
    }
}

// ── Component ─────────────────────────────────────────────────────────────────
type GatePhase = 'checking' | 'fake404' | 'passcode' | 'granted';

interface AdminSecurityGateProps {
    children: React.ReactNode;
    onClose: () => void;
}

export const AdminSecurityGate: React.FC<AdminSecurityGateProps> = ({ children, onClose }) => {
    const [phase, setPhase] = useState<GatePhase>('checking');
    const [passcode, setPasscode] = useState('');
    const [passcodeError, setPasscodeError] = useState(false);
    const [attempts, setAttempts] = useState(0);
    const [locked, setLocked] = useState(false);

    const runSecurityChecks = useCallback(async () => {
        // If in SETUP_MODE, skip IP and device checks but still require passcode
        if (SETUP_MODE) {
            // AUDIT-FIX: TEAM1-P0 — Removed console.log that leaked device fingerprint and IP
            // In setup mode, fingerprint and IP are now only available via secure admin API
            void generateDeviceFingerprint();
            void getPublicIP();

            setPhase('passcode');
            return;
        }

        // Layer 2: IP Whitelist
        if (ALLOWED_IPS.length > 0) {
            const ip = await getPublicIP();
            if (!ip || !ALLOWED_IPS.includes(ip)) {
                setPhase('fake404');
                return;
            }
        }

        // Layer 3: Device Fingerprint
        if (TRUSTED_DEVICE_FINGERPRINTS.length > 0) {
            const fp = await generateDeviceFingerprint();
            if (!TRUSTED_DEVICE_FINGERPRINTS.includes(fp)) {
                setPhase('fake404');
                return;
            }
        }

        // Both checks passed → show passcode form
        setPhase('passcode');
    }, []);

    useEffect(() => {
        void runSecurityChecks();
    }, [runSecurityChecks]);

    const handlePasscodeSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (locked) return;

        if (passcode === ADMIN_PASSCODE) {
            setPhase('granted');
            setPasscodeError(false);
        } else {
            const newAttempts = attempts + 1;
            setAttempts(newAttempts);
            setPasscodeError(true);
            setPasscode('');

            // Lock after 3 failed attempts — show fake 404
            if (newAttempts >= 3) {
                setLocked(true);
                setTimeout(() => setPhase('fake404'), 500);
            }
        }
    };

    // ── Layer 1: Stealth — Fake 404 Page ──────────────────────────────────────
    if (phase === 'fake404') {
        return (
            <div className="fixed inset-0 z-[100] bg-white flex items-center justify-center" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                <div className="text-center px-6">
                    <h1 style={{ fontSize: '144px', fontWeight: 700, color: '#e0e0e0', lineHeight: 1, margin: 0 }}>404</h1>
                    <div style={{ borderTop: '1px solid #eee', paddingTop: '20px', marginTop: '12px' }}>
                        <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#333', margin: '0 0 8px' }}>
                            Bu sayfa bulunamadi
                        </h2>
                        <p style={{ fontSize: '14px', color: '#888', margin: '0 0 24px', maxWidth: '400px' }}>
                            Girmeye calistiginiz adres mevcut degil veya tasinmis olabilir.
                        </p>
                        <button
                            onClick={() => {
                                window.location.href = '/';
                            }}
                            style={{
                                display: 'inline-block',
                                padding: '10px 28px',
                                fontSize: '14px',
                                fontWeight: 600,
                                color: '#fff',
                                backgroundColor: '#333',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                textDecoration: 'none',
                            }}
                        >
                            Ana Sayfaya Don
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ── Loading Phase ─────────────────────────────────────────────────────────
    if (phase === 'checking') {
        // Show a completely blank dark screen — no indicators
        return <div className="fixed inset-0 z-[100] bg-slate-950" />;
    }

    // ── Layer 4: Admin Passcode ───────────────────────────────────────────────
    if (phase === 'passcode') {
        return (
            <div className="fixed inset-0 z-[100] bg-slate-950 flex items-center justify-center p-6">
                <div className="w-full max-w-xs">
                    {/* Minimal, cryptic login — no branding, no hints */}
                    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl shadow-2xl">
                        <div className="text-center mb-6">
                            <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto mb-4">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                </svg>
                            </div>
                            <p className="text-sm text-slate-500">Erisim kodu gerekli</p>
                        </div>

                        <form onSubmit={handlePasscodeSubmit}>
                            <input
                                type="password"
                                value={passcode}
                                onChange={(e) => {
                                    setPasscode(e.target.value);
                                    setPasscodeError(false);
                                }}
                                placeholder="••••••••"
                                autoFocus
                                autoComplete="off"
                                className={`w-full px-4 py-3 bg-slate-800 border rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none transition-colors text-center tracking-[0.3em] font-mono ${passcodeError
                                    ? 'border-red-500/50 bg-red-500/5 animate-shake'
                                    : 'border-slate-700 focus:border-slate-500'
                                    }`}
                            />

                            {passcodeError && (
                                <p className="text-xs text-red-400/80 text-center mt-2">
                                    Gecersiz kod ({3 - attempts} deneme kaldi)
                                </p>
                            )}

                            <button
                                type="submit"
                                disabled={!passcode || locked}
                                className="w-full mt-4 py-3 rounded-xl bg-slate-800 text-slate-300 font-semibold text-sm border border-slate-700 hover:bg-slate-700 hover:border-slate-600 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                Giris
                            </button>
                        </form>

                        <button
                            onClick={onClose}
                            className="w-full mt-3 text-xs text-slate-600 hover:text-slate-400 transition-colors text-center"
                        >
                            Iptal
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ── Granted: Render Admin Panel ───────────────────────────────────────────
    return <>{children}</>;
};
