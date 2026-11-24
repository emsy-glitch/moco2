import { ArrowLeft, KeyRound, Lock, ShieldCheck } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import {
  adminLoginStep1,
  adminVerifyMfa,
  ApiError,
} from '../../services/api.ts';
import type { AdminUserInfo } from '../../types.ts';

interface AdminLoginProps {
  onAuthenticated: (token: string, user: AdminUserInfo) => void;
  onBackToStore: () => void;
}

export function AdminLogin({ onAuthenticated, onBackToStore }: AdminLoginProps) {
  const [step, setStep] = useState<'credentials' | 'mfa'>('credentials');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [challengeToken, setChallengeToken] = useState('');
  const [prototypeTotpCode, setPrototypeTotpCode] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const timer = window.setInterval(() => {
      setLockoutSeconds((s) => (s > 1 ? s - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [lockoutSeconds]);

  const handleCredentialsSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (loading || lockoutSeconds > 0) return;

    const cleanUser = username.trim();
    if (!cleanUser || !password) {
      setError('Username dan password wajib diisi.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const res = await adminLoginStep1(cleanUser, password);
      setChallengeToken(res.challengeToken);
      setPrototypeTotpCode(res.prototypeTotpCode ?? null);
      setMfaCode('');
      setStep('mfa');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.retryAfterSeconds && err.retryAfterSeconds > 0) {
          setLockoutSeconds(err.retryAfterSeconds);
        }
      } else {
        setError('Gagal terhubung ke server autentikasi.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMfaSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (loading || lockoutSeconds > 0) return;

    const cleanCode = mfaCode.replace(/\s+/g, '');
    if (!/^\d{6}$/.test(cleanCode)) {
      setError('Masukkan 6 digit kode verifikasi MFA.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const res = await adminVerifyMfa(challengeToken, cleanCode);
      setPassword('');
      setMfaCode('');
      onAuthenticated(res.token, res.user);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.prototypeTotpCode) {
          setPrototypeTotpCode(err.prototypeTotpCode);
        }
        if (err.retryAfterSeconds && err.retryAfterSeconds > 0) {
          setLockoutSeconds(err.retryAfterSeconds);
          setStep('credentials');
        }
      } else {
        setError('Gagal memverifikasi kode MFA.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-[#fff9ed] flex flex-col justify-between px-4 py-8">
      <div className="max-w-[1140px] w-full mx-auto">
        <button
          type="button"
          onClick={onBackToStore}
          className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#766450] hover:text-[#523925] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>Kembali ke Website Pelanggan</span>
        </button>
      </div>

      <main className="w-full max-w-[440px] mx-auto my-8">
        <div className="rounded-3xl bg-white border border-[#ebe0cc] shadow-[0_18px_45px_rgba(82,57,37,0.08)] p-7 sm:p-9">
          <div className="text-center">
            <span className="font-display text-[32px] font-bold tracking-[-0.04em] text-[#523925]">
              mo<span className="text-[#c89c3d]">co</span>.
            </span>
            <h1 className="mt-3 font-display text-[24px] font-bold text-[#523925]">
              {step === 'credentials' ? 'Admin Dashboard Login' : 'Verifikasi MFA (2FA)'}
            </h1>
            <p className="mt-1.5 text-[13px] text-[#766450]">
              {step === 'credentials'
                ? 'Akses khusus pengelola Moco – Mochi Dessert Store.'
                : 'Masukkan kode OTP 6 digit untuk menyelesaikan autentikasi.'}
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mt-5 rounded-xl bg-[#fef2f2] border border-[#fecaca] px-4 py-3 text-[13px] text-[#b91c1c]"
            >
              <p className="font-medium">{error}</p>
              {lockoutSeconds > 0 && (
                <p className="mt-1 font-mono text-[12px] font-semibold tabular-nums">
                  Coba lagi dalam {lockoutSeconds} detik
                </p>
              )}
            </div>
          )}

          {step === 'credentials' ? (
            <form onSubmit={handleCredentialsSubmit} className="mt-6 space-y-4" noValidate>
              <div>
                <label
                  htmlFor="admin-username"
                  className="block text-[13px] font-semibold text-[#523925] mb-1.5"
                >
                  Username
                </label>
                <input
                  id="admin-username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading || lockoutSeconds > 0}
                  placeholder="Masukkan username admin"
                  className="w-full rounded-xl border border-[#dfd1b8] bg-[#fffdf8] px-4 py-3 text-[14px] text-[#523925] placeholder:text-[#a2907c] disabled:opacity-60"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="admin-password"
                  className="block text-[13px] font-semibold text-[#523925] mb-1.5"
                >
                  Password
                </label>
                <input
                  id="admin-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading || lockoutSeconds > 0}
                  placeholder="Masukkan password admin"
                  className="w-full rounded-xl border border-[#dfd1b8] bg-[#fffdf8] px-4 py-3 text-[14px] text-[#523925] placeholder:text-[#a2907c] disabled:opacity-60"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading || lockoutSeconds > 0}
                className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#523925] hover:bg-[#3d291a] disabled:opacity-50 text-white py-3.5 px-6 text-[14px] font-semibold transition-colors"
              >
                <Lock className="w-4 h-4 text-[#e9c66d]" aria-hidden="true" />
                <span>
                  {lockoutSeconds > 0
                    ? `Terkunci (${lockoutSeconds}d)`
                    : loading
                    ? 'Memverifikasi...'
                    : 'Login'}
                </span>
              </button>

              <div className="pt-4 border-t border-[#f0e5d1] text-[12px] text-[#766450] space-y-1.5 leading-relaxed">
                <p className="font-semibold text-[#523925]">Keamanan Autentikasi Aktif</p>
                <p>
                  Verifikasi password dilakukan di server menggunakan hash tersalt, dibatasi
                  rate limiting setelah 5 percobaan gagal, dan dilanjutkan verifikasi MFA 6 digit.
                </p>
              </div>
            </form>
          ) : (
            <form onSubmit={handleMfaSubmit} className="mt-6 space-y-4" noValidate>
              {prototypeTotpCode && (
                <div className="rounded-2xl bg-[#fff9ed] border border-[#e5d5b6] p-4">
                  <div className="flex items-start gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-[#9c7426] shrink-0 mt-0.5" />
                    <div className="text-[12px] text-[#766450] leading-relaxed">
                      <p className="font-semibold text-[#523925]">
                        Mode Prototype — Kode TOTP Aktif
                      </p>
                      <p className="mt-1">
                        Gunakan kode verifikasi 6 digit berikut (pada mode produksi, kode hanya
                        tersedia di aplikasi Authenticator):
                      </p>
                      <div className="mt-2 flex items-center justify-between gap-2 bg-white border border-[#ebe0cc] rounded-xl px-3.5 py-2">
                        <span className="font-mono text-[20px] font-bold tracking-[0.22em] text-[#523925] tabular-nums">
                          {prototypeTotpCode}
                        </span>
                        <button
                          type="button"
                          onClick={() => setMfaCode(prototypeTotpCode)}
                          className="text-[12px] font-semibold text-[#9c7426] hover:text-[#523925]"
                        >
                          Isi Otomatis
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label
                  htmlFor="admin-mfa-code"
                  className="block text-[13px] font-semibold text-[#523925] mb-1.5"
                >
                  Kode MFA (6 Digit)
                </label>
                <input
                  id="admin-mfa-code"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  autoComplete="one-time-code"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  disabled={loading}
                  placeholder="000000"
                  className="w-full rounded-xl border border-[#dfd1b8] bg-[#fffdf8] px-4 py-3 text-center font-mono text-[20px] tracking-[0.3em] text-[#523925] placeholder:text-[#c7b8a3] tabular-nums"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading || mfaCode.length !== 6}
                className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#523925] hover:bg-[#3d291a] disabled:opacity-50 text-white py-3.5 px-6 text-[14px] font-semibold transition-colors"
              >
                <KeyRound className="w-4 h-4 text-[#e9c66d]" aria-hidden="true" />
                <span>{loading ? 'Memverifikasi MFA...' : 'Verifikasi & Masuk Dashboard'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep('credentials');
                  setError(null);
                  setMfaCode('');
                }}
                className="w-full text-center text-[13px] font-medium text-[#766450] hover:text-[#523925] py-1.5"
              >
                Gunakan akun lain / Kembali
              </button>
            </form>
          )}
        </div>
      </main>

      <p className="text-center text-[12px] text-[#8b7964]">
        Moco Admin Portal · Sesi terisolasi dari halaman pelanggan
      </p>
    </div>
  );
}
