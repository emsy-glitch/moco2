import { ArrowUpRight, Instagram, MessageCircle } from 'lucide-react';
import type { ContactInfo } from '../../types.ts';
import { isSafeExternalUrl } from '../../utils/format.ts';

interface ContactSectionProps {
  contact: ContactInfo;
}

export function ContactSection({ contact }: ContactSectionProps) {
  const safeWaLink = isSafeExternalUrl(contact.whatsappLink)
    ? contact.whatsappLink
    : 'https://wa.me/6281283115852';
  const safeIgLink = isSafeExternalUrl(contact.instagramLink)
    ? contact.instagramLink
    : 'https://www.instagram.com/muhammad.syauqal/';

  return (
    <section
      id="contact"
      className="py-16 sm:py-20 bg-[#f5ead5] border-t border-[#ebe0cc] scroll-mt-20"
    >
      <div className="max-w-[1140px] mx-auto px-5 sm:px-6 text-center">
        <p className="text-[12px] font-semibold tracking-[0.14em] text-[#9c7426]">
          Contact &amp; Social Media
        </p>
        <h2 className="mt-2 font-display text-[32px] sm:text-[42px] font-bold tracking-[-0.02em] text-[#523925]">
          Have a sweet day with Moco
        </h2>
        <p className="mt-3 text-[15px] text-[#766450] max-w-[480px] mx-auto leading-relaxed">
          Untuk pertanyaan seputar varian rasa, ketersediaan, atau pemesanan langsung, hubungi kami
          melalui WhatsApp atau kunjungi Instagram Moco.
        </p>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-[660px] mx-auto">
          <a
            href={safeWaLink}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center justify-between gap-4 rounded-2xl bg-white/90 hover:bg-white border border-[#e3d3b6] px-5 py-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(82,57,37,0.08)]"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <span className="w-11 h-11 rounded-full bg-[#f5ead5] text-[#523925] inline-flex items-center justify-center shrink-0">
                <MessageCircle className="w-5 h-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-[12px] font-medium text-[#766450]">WhatsApp Pemesanan</p>
                <p className="text-[15px] font-bold text-[#523925] tabular-nums truncate">
                  {contact.whatsappNumber}
                </p>
              </div>
            </div>
            <ArrowUpRight
              className="w-4 h-4 text-[#9c7426] shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              aria-hidden="true"
            />
          </a>

          <a
            href={safeIgLink}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center justify-between gap-4 rounded-2xl bg-white/90 hover:bg-white border border-[#e3d3b6] px-5 py-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(82,57,37,0.08)]"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <span className="w-11 h-11 rounded-full bg-[#f5ead5] text-[#523925] inline-flex items-center justify-center shrink-0">
                <Instagram className="w-5 h-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-[12px] font-medium text-[#766450]">Instagram Resmi</p>
                <p className="text-[15px] font-bold text-[#523925] truncate">
                  {contact.instagramUsername}
                </p>
              </div>
            </div>
            <ArrowUpRight
              className="w-4 h-4 text-[#9c7426] shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              aria-hidden="true"
            />
          </a>
        </div>

        <div className="mt-8">
          <a
            href="#menu"
            className="inline-flex items-center justify-center rounded-full bg-[#e9c66d] hover:bg-[#dfb957] text-[#3d291a] px-7 py-3.5 text-[14px] font-semibold transition-colors"
          >
            Pilih Varian Mochi
          </a>
        </div>
      </div>
    </section>
  );
}
