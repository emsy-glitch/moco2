import { CheckCircle2, Instagram, MessageCircle, Save } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import { updateAdminContact } from '../../services/api.ts';
import type { ContactInfo } from '../../types.ts';
import { validateContactInput } from '../../utils/format.ts';

interface ContactManagerProps {
  token: string;
  contact: ContactInfo;
  onRefresh: () => Promise<void>;
}

export function ContactManager({ token, contact, onRefresh }: ContactManagerProps) {
  const [form, setForm] = useState<ContactInfo>(contact);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    setForm(contact);
  }, [contact]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;

    const validation = validateContactInput(form);
    if (!validation.valid || !validation.data) {
      setError(validation.error || 'Data kontak tidak valid.');
      return;
    }

    setError(null);
    setSavedNotice(false);
    setSaving(true);
    try {
      await updateAdminContact(token, validation.data);
      await onRefresh();
      setSavedNotice(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memperbarui informasi kontak.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <form
        onSubmit={handleSubmit}
        className="lg:col-span-7 rounded-2xl bg-white border border-[#ebe0cc] p-6 space-y-5"
      >
        <div>
          <h2 className="text-[16px] font-bold text-[#523925]">Pengaturan Kontak Toko</h2>
          <p className="mt-1 text-[13px] text-[#766450]">
            Perubahan di sini langsung memperbarui bagian Contact, tombol Checkout WhatsApp, dan
            Footer pada halaman pelanggan.
          </p>
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-xl bg-[#fef2f2] border border-[#fecaca] px-4 py-3 text-[13px] font-medium text-[#b91c1c]"
          >
            {error}
          </p>
        )}

        {savedNotice && (
          <div className="rounded-xl bg-[#f0fdf4] border border-[#bbf7d0] px-4 py-3 text-[13px] font-medium text-[#15803d] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Informasi kontak berhasil diperbarui dan disinkronkan ke website pelanggan.</span>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label
              htmlFor="contact-wa-number"
              className="block text-[12px] font-semibold text-[#523925] mb-1.5"
            >
              Nomor WhatsApp (Tampilan)
            </label>
            <input
              id="contact-wa-number"
              type="text"
              required
              value={form.whatsappNumber}
              onChange={(e) => setForm((prev) => ({ ...prev, whatsappNumber: e.target.value }))}
              placeholder="0812 8311 5852"
              className="w-full rounded-xl border border-[#dfd1b8] bg-[#fffdf8] px-4 py-2.5 text-[14px] font-mono tabular-nums text-[#523925]"
            />
          </div>

          <div>
            <label
              htmlFor="contact-wa-link"
              className="block text-[12px] font-semibold text-[#523925] mb-1.5"
            >
              Link WhatsApp (HTTPS)
            </label>
            <input
              id="contact-wa-link"
              type="url"
              required
              value={form.whatsappLink}
              onChange={(e) => setForm((prev) => ({ ...prev, whatsappLink: e.target.value }))}
              placeholder="https://wa.me/6281283115852"
              className="w-full rounded-xl border border-[#dfd1b8] bg-[#fffdf8] px-4 py-2.5 text-[14px] text-[#523925]"
            />
          </div>

          <div className="pt-2 border-t border-[#f3ead9]">
            <label
              htmlFor="contact-ig-user"
              className="block text-[12px] font-semibold text-[#523925] mb-1.5"
            >
              Username Instagram
            </label>
            <input
              id="contact-ig-user"
              type="text"
              required
              value={form.instagramUsername}
              onChange={(e) => setForm((prev) => ({ ...prev, instagramUsername: e.target.value }))}
              placeholder="@muhammad.syauqal"
              className="w-full rounded-xl border border-[#dfd1b8] bg-[#fffdf8] px-4 py-2.5 text-[14px] text-[#523925]"
            />
          </div>

          <div>
            <label
              htmlFor="contact-ig-link"
              className="block text-[12px] font-semibold text-[#523925] mb-1.5"
            >
              Link Instagram (HTTPS)
            </label>
            <input
              id="contact-ig-link"
              type="url"
              required
              value={form.instagramLink}
              onChange={(e) => setForm((prev) => ({ ...prev, instagramLink: e.target.value }))}
              placeholder="https://www.instagram.com/muhammad.syauqal/"
              className="w-full rounded-xl border border-[#dfd1b8] bg-[#fffdf8] px-4 py-2.5 text-[14px] text-[#523925]"
            />
          </div>
        </div>

        <div className="pt-3 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full bg-[#523925] hover:bg-[#3d291a] disabled:opacity-50 text-white px-6 py-2.5 text-[13px] font-semibold transition-colors"
          >
            <Save className="w-4 h-4 text-[#e9c66d]" aria-hidden="true" />
            <span>{saving ? 'Menyimpan...' : 'Simpan Kontak'}</span>
          </button>
        </div>
      </form>

      {/* Live Preview Panel */}
      <aside className="lg:col-span-5 rounded-2xl bg-[#fffdf8] border border-[#ebe0cc] p-6 space-y-4 self-start">
        <h3 className="text-[14px] font-bold text-[#523925]">Pratinjau Tampilan Pelanggan</h3>
        <p className="text-[12px] text-[#766450]">
          Begini tampilan tautan kontak pada bagian Contact dan Footer website Moco:
        </p>

        <div className="space-y-3 pt-1">
          <div className="rounded-xl bg-white border border-[#ebe0cc] p-4 flex items-center gap-3">
            <span className="w-9 h-9 rounded-full bg-[#f5ead5] text-[#523925] inline-flex items-center justify-center shrink-0">
              <MessageCircle className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] text-[#766450]">WhatsApp</p>
              <p className="text-[14px] font-bold text-[#523925] tabular-nums truncate">
                {form.whatsappNumber || '-'}
              </p>
              <p className="text-[11px] text-[#8b7964] truncate">{form.whatsappLink || '-'}</p>
            </div>
          </div>

          <div className="rounded-xl bg-white border border-[#ebe0cc] p-4 flex items-center gap-3">
            <span className="w-9 h-9 rounded-full bg-[#f5ead5] text-[#523925] inline-flex items-center justify-center shrink-0">
              <Instagram className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] text-[#766450]">Instagram</p>
              <p className="text-[14px] font-bold text-[#523925] truncate">
                {form.instagramUsername || '-'}
              </p>
              <p className="text-[11px] text-[#8b7964] truncate">{form.instagramLink || '-'}</p>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
