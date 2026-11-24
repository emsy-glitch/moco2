import {
  CheckCircle2,
  Download,
  KeyRound,
  Search,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import { type ChangeEvent, type FormEvent, useEffect, useState } from 'react';
import {
  adminChangePassword,
  exportAdminBackup,
  fetchAdminAuditLogs,
  fetchAdminMfaSetup,
  type MfaSetupInfo,
  restoreAdminBackup,
} from '../../services/api.ts';
import type { AuditLogEntry, BackupPayload } from '../../types.ts';
import { formatDateTime } from '../../utils/format.ts';

interface SecurityAndLogsProps {
  token: string;
  onPasswordChanged: () => void;
  onDataRestored: () => Promise<void>;
}

const SEVERITY_STYLE: Record<AuditLogEntry['severity'], string> = {
  info: 'text-[#523925]',
  warning: 'text-[#b45309]',
  critical: 'text-[#b91c1c]',
};

export function SecurityAndLogs({
  token,
  onPasswordChanged,
  onDataRestored,
}: SecurityAndLogsProps) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [retentionDays, setRetentionDays] = useState(90);
  const [logSearch, setLogSearch] = useState('');
  const [mfaInfo, setMfaInfo] = useState<MfaSetupInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // Password change form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passMsg, setPassMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [savingPass, setSavingPass] = useState(false);

  // Backup / Restore state
  const [backupMsg, setBackupMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [restoring, setRestoring] = useState(false);

  const loadSecurityData = async () => {
    setLoading(true);
    try {
      const [logRes, mfaRes] = await Promise.all([
        fetchAdminAuditLogs(token),
        fetchAdminMfaSetup(token),
      ]);
      setLogs(logRes.logs);
      setRetentionDays(logRes.retentionDays);
      setMfaInfo(mfaRes);
    } catch {
      // Errors handled gracefully
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSecurityData();
  }, [token]);

  const handlePasswordChange = async (e: FormEvent) => {
    e.preventDefault();
    setPassMsg(null);
    if (newPassword !== confirmPassword) {
      setPassMsg({ type: 'err', text: 'Konfirmasi password baru tidak cocok.' });
      return;
    }
    if (newPassword.length < 8) {
      setPassMsg({ type: 'err', text: 'Password baru minimal 8 karakter dengan huruf dan angka.' });
      return;
    }

    setSavingPass(true);
    try {
      await adminChangePassword(token, currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPassMsg({
        type: 'ok',
        text: 'Password admin berhasil diperbarui dan disimpan dalam bentuk hash tersalt.',
      });
      onPasswordChanged();
      await loadSecurityData();
    } catch (err) {
      setPassMsg({
        type: 'err',
        text: err instanceof Error ? err.message : 'Gagal memperbarui password.',
      });
    } finally {
      setSavingPass(false);
    }
  };

  const handleExportBackup = async () => {
    setBackupMsg(null);
    try {
      const backup = await exportAdminBackup(token);
      const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const stamp = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `moco-backup-${stamp}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setBackupMsg({
        type: 'ok',
        text: `Backup berhasil diunduh (${backup.products.length} produk, ${backup.orders.length} pesanan). Kredensial tidak disertakan dalam file backup.`,
      });
      await loadSecurityData();
    } catch (err) {
      setBackupMsg({
        type: 'err',
        text: err instanceof Error ? err.message : 'Gagal membuat file backup.',
      });
    }
  };

  const handleRestoreFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 2_500_000) {
      setBackupMsg({ type: 'err', text: 'Ukuran file backup maksimal 2.5 MB.' });
      return;
    }

    setBackupMsg(null);
    setRestoring(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as BackupPayload;
      const result = await restoreAdminBackup(token, parsed);
      setBackupMsg({
        type: 'ok',
        text: `Pemulihan berhasil: ${result.restoredProducts} produk dan ${result.restoredOrders} pesanan dipulihkan.`,
      });
      await onDataRestored();
      await loadSecurityData();
    } catch (err) {
      setBackupMsg({
        type: 'err',
        text:
          err instanceof Error
            ? err.message
            : 'File backup tidak valid atau gagal dipulihkan.',
      });
    } finally {
      setRestoring(false);
    }
  };

  const filteredLogs = logs.filter((entry) => {
    const q = logSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      entry.action.toLowerCase().includes(q) ||
      entry.actor.toLowerCase().includes(q) ||
      entry.detail.toLowerCase().includes(q) ||
      entry.target.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top 2 columns: Password & MFA + Backup & Restore */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Password Change */}
        <section className="rounded-2xl bg-white border border-[#ebe0cc] p-6 space-y-4">
          <div className="flex items-center gap-2.5">
            <KeyRound className="w-5 h-5 text-[#9c7426]" aria-hidden="true" />
            <h2 className="text-[16px] font-bold text-[#523925]">Ganti Password Admin</h2>
          </div>
          <p className="text-[13px] text-[#766450]">
            Password disimpan di server menggunakan hash <code className="font-mono text-[12px]">scrypt</code>{' '}
            tersalt dan tidak pernah disimpan dalam bentuk teks biasa.
          </p>

          {passMsg && (
            <p
              role="alert"
              className={`rounded-xl border px-3.5 py-2.5 text-[12px] font-medium ${
                passMsg.type === 'ok'
                  ? 'bg-[#f0fdf4] border-[#bbf7d0] text-[#15803d]'
                  : 'bg-[#fef2f2] border-[#fecaca] text-[#b91c1c]'
              }`}
            >
              {passMsg.text}
            </p>
          )}

          <form onSubmit={handlePasswordChange} className="space-y-3">
            <div>
              <label className="block text-[12px] font-semibold text-[#523925] mb-1">
                Password Saat Ini
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-xl border border-[#dfd1b8] bg-[#fffdf8] px-3.5 py-2 text-[13px]"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-semibold text-[#523925] mb-1">
                  Password Baru
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 8 karakter (huruf + angka)"
                  className="w-full rounded-xl border border-[#dfd1b8] bg-[#fffdf8] px-3.5 py-2 text-[13px]"
                />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[#523925] mb-1">
                  Konfirmasi Password Baru
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-xl border border-[#dfd1b8] bg-[#fffdf8] px-3.5 py-2 text-[13px]"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={savingPass}
              className="rounded-full bg-[#523925] hover:bg-[#3d291a] disabled:opacity-50 text-white px-5 py-2.5 text-[13px] font-semibold"
            >
              {savingPass ? 'Memperbarui...' : 'Perbarui Password'}
            </button>
          </form>
        </section>

        {/* Backup, Restore & MFA Info */}
        <div className="space-y-6">
          <section className="rounded-2xl bg-white border border-[#ebe0cc] p-6 space-y-4">
            <h2 className="text-[16px] font-bold text-[#523925]">
              Backup &amp; Pemulihan Data (JSON)
            </h2>
            <p className="text-[13px] text-[#766450]">
              Unduh cadangan rutin katalog produk, data pesanan, dan pengaturan kontak. Anda juga
              dapat memulihkan data dari file backup terverifikasi.
            </p>

            {backupMsg && (
              <p
                role="alert"
                className={`rounded-xl border px-3.5 py-2.5 text-[12px] font-medium ${
                  backupMsg.type === 'ok'
                    ? 'bg-[#f0fdf4] border-[#bbf7d0] text-[#15803d]'
                    : 'bg-[#fef2f2] border-[#fecaca] text-[#b91c1c]'
                }`}
              >
                {backupMsg.text}
              </p>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleExportBackup}
                className="inline-flex items-center gap-2 rounded-full bg-[#e9c66d] hover:bg-[#dfb957] text-[#3d291a] px-5 py-2.5 text-[13px] font-semibold transition-colors"
              >
                <Download className="w-4 h-4" aria-hidden="true" />
                <span>Unduh Backup JSON</span>
              </button>

              <label className="inline-flex items-center gap-2 rounded-full border border-[#dfd1b8] hover:bg-[#fff9ed] text-[#523925] px-5 py-2.5 text-[13px] font-semibold cursor-pointer transition-colors">
                <Upload className="w-4 h-4 text-[#9c7426]" aria-hidden="true" />
                <span>{restoring ? 'Memulihkan...' : 'Pulihkan dari Backup'}</span>
                <input
                  type="file"
                  accept="application/json,.json"
                  disabled={restoring}
                  onChange={handleRestoreFile}
                  className="hidden"
                />
              </label>
            </div>
          </section>

          <section className="rounded-2xl bg-white border border-[#ebe0cc] p-6 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#15803d]" aria-hidden="true" />
                <h2 className="text-[15px] font-bold text-[#523925]">
                  Multi-Factor Authentication (TOTP)
                </h2>
              </div>
              <span className="text-[12px] font-semibold text-[#15803d]">Aktif</span>
            </div>
            {mfaInfo && (
              <div className="text-[12px] text-[#766450] space-y-1.5">
                <p>
                  Akun: <strong className="text-[#523925]">{mfaInfo.accountName}</strong> · Issuer:{' '}
                  <strong className="text-[#523925]">{mfaInfo.issuer}</strong>
                </p>
                <p>
                  Secret Key:{' '}
                  <code className="font-mono text-[#523925] bg-[#fff9ed] px-2 py-0.5 rounded border border-[#ebe0cc]">
                    {mfaInfo.secretMasked}
                  </code>
                </p>
                <p className="text-[11px] leading-relaxed">
                  Kompatibel dengan Google Authenticator / Authy (RFC 6238, SHA-1, 6 digit, interval
                  30 detik). Di produksi, atur <code className="font-mono">ADMIN_MFA_SECRET</code>{' '}
                  melalui Secrets/environment variables.
                </p>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Audit Logs (90-day retention) */}
      <section className="rounded-2xl bg-white border border-[#ebe0cc] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#ebe0cc] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-[16px] font-bold text-[#523925]">
              Log Aktivitas Keamanan (Retensi {retentionDays} Hari)
            </h2>
            <p className="text-[12px] text-[#766450] mt-0.5">
              Mencatat login, kegagalan autentikasi, perubahan produk, perubahan status pesanan, dan
              backup tanpa menyimpan password atau rahasia.
            </p>
          </div>
          <div className="relative w-full sm:w-[260px]">
            <Search
              className="w-4 h-4 text-[#8b7964] absolute left-3 top-1/2 -translate-y-1/2"
              aria-hidden="true"
            />
            <input
              type="search"
              value={logSearch}
              onChange={(e) => setLogSearch(e.target.value)}
              placeholder="Filter log aktivitas..."
              className="w-full rounded-xl border border-[#dfd1b8] bg-[#fffdf8] pl-9 pr-3 py-2 text-[12px] text-[#523925]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[12px]">
            <thead>
              <tr className="border-b border-[#ebe0cc] bg-[#fffdf8] text-[#766450] font-semibold">
                <th className="py-3 px-5">Waktu</th>
                <th className="py-3 px-4">Aktor</th>
                <th className="py-3 px-4">Aktivitas</th>
                <th className="py-3 px-4">Detail</th>
                <th className="py-3 px-5 text-right">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f3ead9]">
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[#766450]">
                    Memuat log aktivitas...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[#766450]">
                    Tidak ada catatan log yang sesuai.
                  </td>
                </tr>
              ) : (
                filteredLogs.slice(0, 60).map((entry) => (
                  <tr key={entry.id} className="hover:bg-[#fffdf8]">
                    <td className="py-3 px-5 font-mono text-[#766450] whitespace-nowrap tabular-nums">
                      {formatDateTime(entry.timestamp)}
                    </td>
                    <td className="py-3 px-4 font-semibold text-[#523925] whitespace-nowrap">
                      {entry.actor}
                    </td>
                    <td
                      className={`py-3 px-4 font-mono font-semibold whitespace-nowrap ${
                        SEVERITY_STYLE[entry.severity]
                      }`}
                    >
                      {entry.action}
                    </td>
                    <td className="py-3 px-4 text-[#523925] max-w-[380px]">{entry.detail}</td>
                    <td className="py-3 px-5 text-right font-mono text-[#766450] whitespace-nowrap">
                      {entry.ip}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* UMKM Security Verification Summary */}
      <section className="rounded-2xl bg-[#fffdf8] border border-[#ebe0cc] p-6">
        <h2 className="text-[15px] font-bold text-[#523925] mb-3">
          Ringkasan Perlindungan Keamanan UMKM
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[13px] text-[#766450]">
          {[
            'Autentikasi admin berbasis server dengan password hash scrypt tersalt dan verifikasi MFA TOTP 6 digit.',
            'Pembatasan percobaan login (rate limiting) dengan penguncian sementara setelah 5 kegagalan beruntun.',
            'Validasi input ketat di frontend & server (harga non-negatif, sanitasi teks, validasi URL aman anti-XSS).',
            'Isolasi akses: rute /api/admin/* memverifikasi token sesi di server, bukan hanya menyembunyikan tombol.',
            'Audit log terpusat dengan retensi otomatis 90 hari serta fitur Backup & Restore JSON tervalidasi.',
            'File .gitignore mengecualikan .env*, kunci rahasia, dan direktori data/ agar tidak terunggah ke repository.',
          ].map((item) => (
            <div key={item} className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#15803d] shrink-0 mt-0.5" aria-hidden="true" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
