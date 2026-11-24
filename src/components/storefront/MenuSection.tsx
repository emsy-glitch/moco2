import { Check, Plus } from 'lucide-react';
import { useState } from 'react';
import type { Product } from '../../types.ts';
import { formatRupiah } from '../../utils/format.ts';

interface MenuSectionProps {
  products: Product[];
  onSelectProduct: (product: Product) => void;
  onQuickAdd: (product: Product) => void;
}

export function MenuSection({
  products,
  onSelectProduct,
  onQuickAdd,
}: MenuSectionProps) {
  const [filter, setFilter] = useState<'all' | 'featured'>('all');
  const [justAddedId, setJustAddedId] = useState<string | null>(null);

  const visibleProducts =
    filter === 'featured' ? products.filter((p) => p.featured) : products;

  const handleQuickAdd = (product: Product) => {
    if (product.status !== 'Tersedia') return;
    onQuickAdd(product);
    setJustAddedId(product.id);
    window.setTimeout(() => {
      setJustAddedId((curr) => (curr === product.id ? null : curr));
    }, 900);
  };

  return (
    <section
      id="menu"
      className="py-16 sm:py-20 bg-[#fffdf8] border-y border-[#ebe0cc] scroll-mt-20"
    >
      <div className="max-w-[1140px] mx-auto px-5 sm:px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <p className="text-[12px] font-semibold tracking-[0.14em] text-[#9c7426]">
              Our Mochi Collection
            </p>
            <h2 className="mt-2 font-display text-[32px] sm:text-[40px] font-bold leading-[1.12] tracking-[-0.02em] text-[#523925]">
              Pilih Varian Mochi Favoritmu
            </h2>
            <p className="mt-2.5 text-[14px] sm:text-[15px] text-[#766450] max-w-[500px] leading-relaxed">
              Klik produk untuk melihat detail rasa dan pilih jumlah pembelian, atau langsung
              tambahkan ke keranjang.
            </p>
          </div>

          {/* Interactive segmented filter control */}
          <div
            role="tablist"
            aria-label="Filter menu mochi"
            className="inline-flex items-center gap-1 p-1 rounded-full bg-[#f7edda] border border-[#ebe0cc] self-start md:self-auto"
          >
            <button
              type="button"
              role="tab"
              aria-selected={filter === 'all'}
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-full text-[13px] font-semibold transition-colors whitespace-nowrap ${
                filter === 'all'
                  ? 'bg-white text-[#523925] shadow-xs'
                  : 'text-[#766450] hover:text-[#523925]'
              }`}
            >
              Semua Varian ({products.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={filter === 'featured'}
              onClick={() => setFilter('featured')}
              className={`px-4 py-2 rounded-full text-[13px] font-semibold transition-colors whitespace-nowrap ${
                filter === 'featured'
                  ? 'bg-white text-[#523925] shadow-xs'
                  : 'text-[#766450] hover:text-[#523925]'
              }`}
            >
              Produk Unggulan
            </button>
          </div>
        </div>

        {visibleProducts.length === 0 ? (
          <div className="rounded-2xl border border-[#ebe0cc] bg-white p-10 text-center">
            <p className="text-[15px] text-[#766450]">
              Belum ada produk yang tersedia untuk kategori ini.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
            {visibleProducts.map((product) => {
              const isAvailable = product.status === 'Tersedia';
              const isAdded = justAddedId === product.id;

              return (
                <article
                  key={product.id}
                  className={`group flex flex-col rounded-2xl bg-white border border-[#ebe0cc] overflow-hidden transition-all duration-200 ${
                    isAvailable
                      ? 'hover:-translate-y-1 hover:shadow-[0_14px_32px_rgba(82,57,37,0.08)]'
                      : 'opacity-75'
                  }`}
                >
                  {/* Clickable Product Image -> Opens Product Detail */}
                  <button
                    type="button"
                    onClick={() => onSelectProduct(product)}
                    className="relative block w-full aspect-square overflow-hidden bg-[#f7edda] text-left focus-visible:outline-none"
                    aria-label={`Lihat detail ${product.name}`}
                  >
                    <img
                      src={product.image}
                      alt={product.name}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className={`w-full h-full object-cover transition-transform duration-300 ${
                        isAvailable ? 'group-hover:scale-[1.03]' : 'grayscale-[40%]'
                      }`}
                    />
                    {!isAvailable && (
                      <div className="absolute inset-0 bg-[#3d291a]/45 flex items-center justify-center">
                        <span className="bg-white/95 text-[#523925] text-[12px] font-semibold px-3.5 py-1.5 rounded-full">
                          Tidak Tersedia
                        </span>
                      </div>
                    )}
                  </button>

                  {/* Product Card Body */}
                  <div className="flex flex-col flex-1 p-4">
                    <div className="text-[11px] font-medium text-[#9c7426] flex items-center gap-1.5 truncate">
                      <span>{product.featured ? 'Unggulan' : product.tag}</span>
                      <span aria-hidden="true">·</span>
                      <span className={isAvailable ? 'text-[#766450]' : 'text-[#b45309]'}>
                        {product.status}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => onSelectProduct(product)}
                      className="mt-1.5 text-left font-display text-[18px] font-semibold text-[#523925] hover:text-[#9c7426] transition-colors leading-snug"
                    >
                      {product.name}
                    </button>

                    <p className="mt-1.5 text-[13px] leading-[1.55] text-[#766450] line-clamp-2 flex-1">
                      {product.description}
                    </p>

                    <div className="mt-4 pt-3.5 border-t border-[#f3ead9] flex items-center justify-between gap-2">
                      <div>
                        <span className="block text-[15px] font-bold text-[#523925] tabular-nums">
                          {formatRupiah(product.price)}
                        </span>
                        <span className="text-[11px] text-[#766450]">per pcs</span>
                      </div>

                      <button
                        type="button"
                        disabled={!isAvailable}
                        onClick={() => handleQuickAdd(product)}
                        aria-label={`Tambah ${product.name} ke keranjang`}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-semibold transition-colors whitespace-nowrap min-h-[38px] ${
                          !isAvailable
                            ? 'bg-[#f2eadb] text-[#9b8a77] cursor-not-allowed'
                            : isAdded
                            ? 'bg-[#523925] text-white'
                            : 'bg-[#e9c66d] hover:bg-[#dfb957] text-[#3d291a]'
                        }`}
                      >
                        {isAdded ? (
                          <>
                            <Check className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Ditambah</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Add to Cart</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
