import { ArrowUpRight } from 'lucide-react';
import { MOCO_IMAGES } from '../../data/mocoImages.ts';
import type { Product } from '../../types.ts';
import { formatRupiah } from '../../utils/format.ts';

interface HeroSectionProps {
  featuredProducts: Product[];
  onSelectProduct: (product: Product) => void;
}

export function HeroSection({ featuredProducts, onSelectProduct }: HeroSectionProps) {
  const highlights = featuredProducts.slice(0, 2);

  return (
    <section id="home" className="pt-10 pb-16 sm:pt-14 sm:pb-20 scroll-mt-20">
      <div className="max-w-[1140px] mx-auto px-5 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left editorial copy */}
          <div className="lg:col-span-6">
            <p className="text-[12px] font-semibold tracking-[0.14em] text-[#9c7426] mb-4">
              Moco — Japanese Mochi Dessert Store
            </p>
            <h1 className="font-display text-[40px] sm:text-[56px] lg:text-[64px] font-bold leading-[1.06] tracking-[-0.03em] text-[#523925]">
              A little piece of <em className="not-italic text-[#c89c3d]">happiness.</em>
            </h1>
            <p className="mt-5 text-[15px] sm:text-[16px] leading-[1.75] text-[#766450] max-w-[470px]">
              Mochi lembut bergaya dessert Jepang dengan isian cream yang halus dan lima pilihan rasa
              favorit. Dibuat untuk menemani waktu santai dan momen manismu setiap hari.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3.5">
              <a
                href="#menu"
                className="inline-flex items-center gap-2 rounded-full bg-[#e9c66d] hover:bg-[#dfb957] text-[#3d291a] px-6 py-3.5 text-[14px] font-semibold transition-transform duration-200 hover:-translate-y-0.5 whitespace-nowrap"
              >
                <span>Explore Menu</span>
                <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
              </a>
              <a
                href="#about"
                className="inline-flex items-center justify-center rounded-full border border-[#d8c7aa] hover:bg-white text-[#523925] px-6 py-3.5 text-[14px] font-semibold transition-colors whitespace-nowrap"
              >
                About Moco
              </a>
            </div>

            {/* Featured Mango Cream & Strawberry Cream strip */}
            {highlights.length > 0 && (
              <div className="mt-10 pt-7 border-t border-[#ebe0cc]">
                <p className="text-[12px] font-semibold text-[#766450] mb-3.5">
                  Produk Unggulan Hari Ini
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {highlights.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSelectProduct(item)}
                      className="group flex items-center gap-3.5 p-2.5 rounded-2xl bg-white/85 hover:bg-white border border-[#ebe0cc] text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(82,57,37,0.07)]"
                    >
                      <img
                        src={item.image}
                        alt={item.name}
                        referrerPolicy="no-referrer"
                        className="w-14 h-14 rounded-xl object-cover bg-[#f7edda] shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-medium text-[#9c7426] truncate">
                          Unggulan · {item.status}
                        </p>
                        <p className="font-display text-[15px] font-semibold text-[#523925] truncate group-hover:text-[#9c7426] transition-colors">
                          {item.name}
                        </p>
                        <p className="text-[13px] font-semibold text-[#766450] tabular-nums">
                          {formatRupiah(item.price)}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right organic mochi visual showcase */}
          <div className="lg:col-span-6">
            <div className="relative mx-auto max-w-[540px]">
              <div
                aria-hidden="true"
                className="absolute inset-x-4 top-5 bottom-3 mochi-blob bg-[#f2dfb9] -rotate-6"
              />
              <div className="relative overflow-hidden mochi-blob bg-[#f7edda] shadow-[0_18px_40px_rgba(82,57,37,0.10)] aspect-[4/3] sm:aspect-[5/4]">
                <img
                  src={MOCO_IMAGES.hero}
                  alt="Hidangan mochi lembut Moco dengan varian cream segar"
                  referrerPolicy="no-referrer"
                  fetchPriority="high"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="mt-4 sm:mt-0 sm:absolute sm:-bottom-3 sm:right-2 bg-white border border-[#ebe0cc] rounded-2xl px-4 py-3 shadow-[0_12px_30px_rgba(82,57,37,0.08)] inline-block">
                <p className="text-[13px] font-semibold text-[#523925]">
                  Freshly crafted sweet break
                </p>
                <p className="text-[12px] text-[#766450] mt-0.5">
                  Soft texture · Mulai Rp10.000 / pcs
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
