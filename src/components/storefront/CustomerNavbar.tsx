import { Menu, ShoppingBag, X } from 'lucide-react';
import { useState } from 'react';

interface CustomerNavbarProps {
  cartCount: number;
  onOpenCart: () => void;
}

const NAV_LINKS = [
  { href: '#home', label: 'Home' },
  { href: '#about', label: 'About' },
  { href: '#menu', label: 'Menu' },
  { href: '#contact', label: 'Contact' },
];

export function CustomerNavbar({ cartCount, onOpenCart }: CustomerNavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 bg-[#fff9ed]/95 backdrop-blur-md border-b border-[#ebe0cc]">
      <div className="max-w-[1140px] mx-auto px-5 sm:px-6 h-[72px] flex items-center justify-between gap-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <a
          href="#home"
          className="font-display text-[30px] font-bold tracking-[-0.04em] text-[#523925] whitespace-nowrap shrink-0"
        >
          mo<span className="text-[#c89c3d]">co</span>.
        </a>

        {/* Zone 2: Clean single-line navigation links */}
        <nav
          aria-label="Navigasi pelanggan"
          className="hidden md:flex items-center gap-8 text-[14px] font-medium text-[#766450]"
        >
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="whitespace-nowrap shrink-0 py-1 hover:text-[#523925] transition-colors relative after:content-[''] after:absolute after:left-0 after:bottom-0 after:h-[1.5px] after:w-0 after:bg-[#c89c3d] hover:after:w-full after:transition-all"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Zone 3: Single primary action (Cart) + Mobile menu toggle */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onOpenCart}
            aria-label={`Buka keranjang belanja, ${cartCount} item`}
            className="inline-flex items-center gap-2.5 bg-[#523925] hover:bg-[#3d291a] text-white rounded-full px-4 sm:px-5 py-2.5 text-[13px] font-semibold transition-colors whitespace-nowrap shrink-0 min-h-[42px]"
          >
            <ShoppingBag className="w-4 h-4 text-[#e9c66d]" aria-hidden="true" />
            <span>Cart</span>
            <span className="tabular-nums inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-[#e9c66d] text-[#3d291a] text-[12px] font-bold">
              {cartCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label={mobileMenuOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
            aria-expanded={mobileMenuOpen}
            className="md:hidden inline-flex items-center justify-center w-[42px] h-[42px] rounded-full border border-[#ebe0cc] bg-white text-[#523925]"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile navigation dropdown */}
      {mobileMenuOpen && (
        <nav
          aria-label="Navigasi mobile"
          className="md:hidden border-t border-[#ebe0cc] bg-[#fffdf8] px-5 py-3 flex items-center justify-between gap-2 overflow-x-auto"
        >
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 text-[14px] font-medium text-[#523925] hover:text-[#9c7426] whitespace-nowrap shrink-0"
            >
              {link.label}
            </a>
          ))}
        </nav>
      )}
    </header>
  );
}
