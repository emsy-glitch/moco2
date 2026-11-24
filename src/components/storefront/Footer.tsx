import { Instagram, Lock, MessageCircle } from 'lucide-react';
import type { ContactInfo } from '../../types.ts';
import { isSafeExternalUrl } from '../../utils/format.ts';

interface FooterProps {
  contact: ContactInfo;
  onOpenPrivacy: () => void;
  onNavigateAdmin: () => void;
}

export function Footer({
  contact,
  onOpenPrivacy,
  onNavigateAdmin,
}: FooterProps) {
  const safeWaLink = isSafeExternalUrl(contact.whatsappLink)
    ? contact.whatsappLink
    : 'https://wa.me/6281283115852';
  const safeIgLink = isSafeExternalUrl(contact.instagramLink)
    ? contact.instagramLink
    : 'https://www.instagram.com/muhammad.syauqal/';

  return (
    <footer className="bg-[#fff9ed] border-t border-[#ebe0cc] text-[#766450]">
      <div className="max-w-[1140px] mx-auto px-5 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-8 border-b border-[#ebe0cc]">
          {/* Brand */}
          <div className="md:col-span-5">
            <a
              href="#home"
              className="font-display text-[28px] font-bold tracking-[-0.04em] text-[#523925]"
            >
              mo<span className="text-[#c89c3d]">co</span>.
            </a>
            <p className="mt-3 text-[13px] leading-[1.75] max-w-[360px]">
              Moco – Mochi Dessert Store. Mochi lembut ala Japanese dessert dengan lima varian rasa
              pilihan untuk menemani hari manismu.
            </p>
          </div>

          {/* Website Navigation */}
          <div className="md:col-span-3">
            <p className="text-[12px] font-semibold text-[#523925] mb-3">Navigasi</p>
            <ul className="space-y-2 text-[13px]">
              <li>
                <a href="#home" className="hover:text-[#523925] transition-colors">
                  Home
                </a>
              </li>
              <li>
                <a href="#about" className="hover:text-[#523925] transition-colors">
                  About
                </a>
              </li>
              <li>
                <a href="#menu" className="hover:text-[#523925] transition-colors">
                  Menu
                </a>
              </li>
              <li>
                <a href="#contact" className="hover:text-[#523925] transition-colors">
                  Contact
                </a>
              </li>
              <li>
                <button
                  type="button"
                  onClick={onOpenPrivacy}
                  className="hover:text-[#523925] transition-colors text-left"
                >
                  Kebijakan Privasi
                </button>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="md:col-span-4">
            <p className="text-[12px] font-semibold text-[#523925] mb-3">Hubungi Moco</p>
            <div className="space-y-2.5 text-[13px]">
              <a
                href={safeWaLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 hover:text-[#523925] transition-colors"
              >
                <MessageCircle className="w-4 h-4 text-[#9c7426] shrink-0" aria-hidden="true" />
                <span className="tabular-nums">WhatsApp: {contact.whatsappNumber}</span>
              </a>
              <a
                href={safeIgLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 hover:text-[#523925] transition-colors"
              >
                <Instagram className="w-4 h-4 text-[#9c7426] shrink-0" aria-hidden="true" />
                <span>Instagram: {contact.instagramUsername}</span>
              </a>
            </div>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[12px]">
          <p>© {new Date().getFullYear()} Moco – Mochi Dessert Store. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onOpenPrivacy}
              className="hover:text-[#523925] transition-colors"
            >
              Privacy Policy
            </button>
            <span aria-hidden="true" className="text-[#d6c7ad]">
              ·
            </span>
            <button
              type="button"
              onClick={onNavigateAdmin}
              className="inline-flex items-center gap-1 text-[#9a8874] hover:text-[#523925] transition-colors"
              title="Masuk ke halaman login pengelola"
            >
              <Lock className="w-3 h-3" aria-hidden="true" />
              <span>Portal Pengelola</span>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
