import { ShieldCheck, X } from 'lucide-react';
import { useEffect } from 'react';
import type { ContactInfo } from '../../types.ts';

interface PrivacyPolicyModalProps {
  open: boolean;
  onClose: () => void;
  contact: ContactInfo;
}

export function PrivacyPolicyModal({
  open,
  onClose,
  contact,
}: PrivacyPolicyModalProps) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#3d291a]/45 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="privacy-policy-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[660px] max-h-[85dvh] rounded-3xl bg-[#fffdf8] border border-[#ebe0cc] shadow-[0_24px_60px_rgba(61,41,26,0.22)] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-[#ebe0cc] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-[#9c7426]" aria-hidden="true" />
            <h3
              id="privacy-policy-title"
              className="font-display text-[22px] font-bold text-[#523925]"
            >
              Kebijakan Privasi Moco
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup kebijakan privasi"
            className="w-9 h-9 rounded-full bg-[#f7edda] hover:bg-[#efe0c2] text-[#523925] inline-flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5 text-[14px] leading-[1.75] text-[#523925]">
          <p className="text-[#766450]">
            Moco – Mochi Dessert Store menghargai privasi setiap pelanggan. Kebijakan ini menjelaskan
            secara transparan bagaimana informasi digunakan saat kamu menjelajahi menu dan memesan
            mochi melalui website kami.
          </p>

          <div>
            <h4 className="font-semibold text-[#523925] mb-1">1. Data yang Dikumpulkan</h4>
            <p className="text-[#766450]">
              Website Moco hanya menyimpan informasi minimal yang diperlukan untuk pemesanan, yaitu
              daftar produk dan jumlah pilihan di keranjang belanja (disimpan di penyimpanan lokal
              perangkat kamu) serta ringkasan pesanan (daftar item, total harga, waktu pemesanan,
              dan catatan opsional yang kamu ketikkan saat checkout). Kami tidak mengumpulkan nomor
              kartu kredit, kata sandi pelanggan, atau data sensitif yang tidak diperlukan.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-[#523925] mb-1">2. Tujuan Penggunaan Data</h4>
            <p className="text-[#766450]">
              Data ringkasan pesanan digunakan semata-mata untuk mencatat pesanan yang masuk,
              membantu pengelola menyiapkan pesanan mochi, dan memudahkan konfirmasi pesanan.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-[#523925] mb-1">
              3. Transaksi Melalui WhatsApp
            </h4>
            <p className="text-[#766450]">
              Saat kamu menekan tombol Checkout, pesanan dicatat dengan status{' '}
              <strong className="font-semibold text-[#523925]">Menunggu Konfirmasi</strong> lalu
              kamu akan diarahkan ke aplikasi WhatsApp resmi penjual ({contact.whatsappNumber}).
              Percakapan, konfirmasi pembayaran, dan detail pengantaran selanjutnya berlangsung di
              WhatsApp dan tunduk pada kebijakan privasi WhatsApp.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-[#523925] mb-1">
              4. Perlindungan &amp; Larangan Berbagi Data
            </h4>
            <p className="text-[#766450]">
              Moco tidak menjual, menyewakan, atau membagikan informasi pesanan maupun kontak
              pelanggan kepada pihak ketiga tanpa dasar yang sah dan persetujuan pelanggan. Akses
              terhadap catatan pesanan dibatasi hanya untuk pengelola yang terautentikasi.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-[#523925] mb-1">5. Hubungi Kami</h4>
            <p className="text-[#766450]">
              Jika ada pertanyaan mengenai kebijakan privasi atau permintaan penghapusan catatan
              pesanan, silakan hubungi kami melalui WhatsApp {contact.whatsappNumber} atau Instagram{' '}
              {contact.instagramUsername}.
            </p>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-[#ebe0cc] bg-[#fff9ed] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-[#523925] hover:bg-[#3d291a] text-white px-6 py-2.5 text-[13px] font-semibold transition-colors"
          >
            Saya Mengerti
          </button>
        </div>
      </div>
    </div>
  );
}
