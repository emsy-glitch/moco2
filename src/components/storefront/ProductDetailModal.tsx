import { Minus, Plus, ShoppingBag, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Product } from '../../types.ts';
import { formatRupiah } from '../../utils/format.ts';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (product: Product, quantity: number) => void;
}

export function ProductDetailModal({
  product,
  onClose,
  onAddToCart,
}: ProductDetailModalProps) {
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    setQuantity(1);
  }, [product?.id]);

  useEffect(() => {
    if (!product) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [product, onClose]);

  if (!product) return null;

  const isAvailable = product.status === 'Tersedia';
  const subtotal = product.price * quantity;

  const handleAdd = () => {
    if (!isAvailable) return;
    onAddToCart(product, quantity);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#3d291a]/45 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-detail-title"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[760px] max-h-[90dvh] overflow-y-auto rounded-3xl bg-[#fffdf8] border border-[#ebe0cc] shadow-[0_24px_60px_rgba(61,41,26,0.22)] grid grid-cols-1 md:grid-cols-2"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup detail produk"
          className="absolute top-3.5 right-3.5 z-10 inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/95 hover:bg-white border border-[#ebe0cc] text-[#523925] transition-colors shadow-xs"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Left: Product image */}
        <div className="bg-[#f7edda] aspect-[4/3] sm:aspect-square md:aspect-auto md:h-full max-h-[300px] sm:max-h-[360px] md:max-h-none overflow-hidden">
          <img
            src={product.image}
            alt={product.name}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Right: Contiguous Purchase Module */}
        <div className="p-6 sm:p-8 flex flex-col justify-between">
          <div>
            <p className="text-[12px] font-semibold text-[#9c7426] flex items-center gap-2">
              <span>{product.featured ? 'Produk Unggulan' : product.tag}</span>
              <span aria-hidden="true">·</span>
              <span className={isAvailable ? 'text-[#15803d]' : 'text-[#b45309]'}>
                {product.status}
              </span>
            </p>

            <h3
              id="product-detail-title"
              className="mt-2 font-display text-[28px] sm:text-[32px] font-bold text-[#523925] leading-tight"
            >
              {product.name}
            </h3>

            <p className="mt-3 text-[22px] font-bold text-[#523925] tabular-nums">
              {formatRupiah(product.price)}
              <span className="ml-1.5 text-[13px] font-normal text-[#766450]">/ pcs</span>
            </p>

            <p className="mt-4 text-[14px] sm:text-[15px] leading-[1.7] text-[#766450]">
              {product.description}
            </p>
          </div>

          <div className="mt-7 pt-5 border-t border-[#ebe0cc] space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-semibold text-[#523925]">Jumlah Pembelian</span>
              <div className="inline-flex items-center gap-3 rounded-full border border-[#ebe0cc] bg-white px-2 py-1">
                <button
                  type="button"
                  disabled={!isAvailable || quantity <= 1}
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  aria-label="Kurangi jumlah"
                  className="w-8 h-8 rounded-full inline-flex items-center justify-center text-[#523925] hover:bg-[#f7edda] disabled:opacity-40"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-7 text-center text-[15px] font-bold tabular-nums text-[#523925]">
                  {quantity}
                </span>
                <button
                  type="button"
                  disabled={!isAvailable || quantity >= 99}
                  onClick={() => setQuantity((q) => Math.min(99, q + 1))}
                  aria-label="Tambah jumlah"
                  className="w-8 h-8 rounded-full inline-flex items-center justify-center text-[#523925] hover:bg-[#f7edda] disabled:opacity-40"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-[14px]">
              <span className="text-[#766450]">Subtotal</span>
              <span className="font-bold text-[#523925] tabular-nums">
                {formatRupiah(subtotal)}
              </span>
            </div>

            <button
              type="button"
              disabled={!isAvailable}
              onClick={handleAdd}
              className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#523925] hover:bg-[#3d291a] disabled:bg-[#d8cfc2] disabled:text-[#8b7964] disabled:cursor-not-allowed text-white py-3.5 px-6 text-[14px] font-semibold transition-colors"
            >
              <ShoppingBag className="w-4 h-4 text-[#e9c66d]" aria-hidden="true" />
              <span>
                {isAvailable
                  ? `Add to Cart · ${formatRupiah(subtotal)}`
                  : 'Produk Sedang Tidak Tersedia'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
