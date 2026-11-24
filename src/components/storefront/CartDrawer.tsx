import {
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { createCustomerOrder } from '../../services/api.ts';
import type { CartItem, ContactInfo, Order, Product } from '../../types.ts';
import {
  buildWhatsAppCheckoutUrl,
  buildWhatsAppOrderMessage,
  formatRupiah,
} from '../../utils/format.ts';

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
  cart: CartItem[];
  products: Product[];
  contact: ContactInfo;
  onUpdateQty: (productId: string, delta: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
}

export function CartDrawer({
  open,
  onClose,
  cart,
  products,
  contact,
  onUpdateQty,
  onRemoveItem,
  onClearCart,
}: CartDrawerProps) {
  const [customerNote, setCustomerNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [completedOrder, setCompletedOrder] = useState<{
    order: Order;
    waUrl: string;
    message: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  const cartLines = cart
    .map((item) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product) return null;
      return {
        product,
        quantity: item.quantity,
        subtotal: product.price * item.quantity,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  const totalItems = cartLines.reduce((sum, line) => sum + line.quantity, 0);
  const totalPrice = cartLines.reduce((sum, line) => sum + line.subtotal, 0);
  const hasUnavailableItem = cartLines.some((line) => line.product.status !== 'Tersedia');

  const handleCheckout = async () => {
    if (cartLines.length === 0 || hasUnavailableItem || submitting) return;
    setErrorMsg(null);
    setSubmitting(true);

    try {
      const order = await createCustomerOrder(
        cartLines.map((line) => ({
          productId: line.product.id,
          quantity: line.quantity,
        })),
        customerNote.trim() || undefined
      );

      const message = buildWhatsAppOrderMessage(
        order.items,
        order.totalPrice,
        order.customerNote
      );
      const waUrl = buildWhatsAppCheckoutUrl(contact, message);

      setCompletedOrder({ order, waUrl, message });
      setCustomerNote('');
      onClearCart();

      // Trigger standard anchor click (avoids window.open popup blocking where possible)
      const anchor = document.createElement('a');
      anchor.href = waUrl;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      anchor.click();
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Gagal memproses pesanan. Silakan coba lagi.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyMessage = async () => {
    if (!completedOrder) return;
    try {
      await navigator.clipboard.writeText(completedOrder.message);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard may be unavailable in restricted contexts
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#3d291a]/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Keranjang belanja Moco"
        className="relative z-10 w-full max-w-[430px] h-dvh bg-[#fffdf8] border-l border-[#ebe0cc] shadow-[-12px_0_40px_rgba(61,41,26,0.14)] flex flex-col"
      >
        <div className="px-6 py-5 border-b border-[#ebe0cc] flex items-center justify-between">
          <div>
            <h3 className="font-display text-[24px] font-bold text-[#523925] leading-none">
              Your Cart
            </h3>
            <p className="text-[12px] text-[#766450] mt-1 tabular-nums">
              {completedOrder ? 'Pesanan berhasil dicatat' : `${totalItems} item dipilih`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setCompletedOrder(null);
              onClose();
            }}
            aria-label="Tutup keranjang"
            className="w-9 h-9 rounded-full bg-[#f7edda] hover:bg-[#efe0c2] text-[#523925] inline-flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {completedOrder ? (
            <div className="py-4 space-y-5">
              <div className="rounded-2xl bg-[#f7edda] border border-[#e5d5b6] p-5">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-[#15803d] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[15px] font-bold text-[#523925]">
                      Pesanan Tercatat · Menunggu Konfirmasi
                    </p>
                    <p className="text-[12px] text-[#766450] mt-1 leading-relaxed">
                      ID Pesanan:{' '}
                      <span className="font-mono font-semibold text-[#523925]">
                        {completedOrder.order.id}
                      </span>
                      . Transaksi dilanjutkan melalui WhatsApp penjual untuk konfirmasi pembayaran
                      dan pengiriman.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-white border border-[#ebe0cc] p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[12px] font-semibold text-[#766450]">
                    Format Pesan WhatsApp
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyMessage}
                    className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#9c7426] hover:text-[#523925]"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Tersalin</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Salin Pesan</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-[#523925] bg-[#fff9ed] rounded-xl p-3.5 border border-[#f0e5d1]">
                  {completedOrder.message}
                </pre>
              </div>

              <div className="space-y-2.5">
                <a
                  href={completedOrder.waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#523925] hover:bg-[#3d291a] text-white py-3.5 px-5 text-[14px] font-semibold transition-colors"
                >
                  <span>Lanjutkan ke WhatsApp ({contact.whatsappNumber})</span>
                  <ExternalLink className="w-4 h-4 text-[#e9c66d]" />
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setCompletedOrder(null);
                    onClose();
                  }}
                  className="w-full rounded-full border border-[#d8c7aa] hover:bg-white text-[#523925] py-3 px-5 text-[13px] font-semibold transition-colors"
                >
                  Kembali ke Menu Moco
                </button>
              </div>
            </div>
          ) : cartLines.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-14 px-4">
              <div className="w-14 h-14 rounded-full bg-[#f7edda] text-[#9c7426] inline-flex items-center justify-center mb-4">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <p className="font-display text-[20px] font-semibold text-[#523925]">
                Keranjang masih kosong
              </p>
              <p className="mt-1.5 text-[13px] text-[#766450] max-w-[260px] leading-relaxed">
                Pilih varian mochi favoritmu dari menu untuk mulai memesan lewat WhatsApp.
              </p>
              <a
                href="#menu"
                onClick={onClose}
                className="mt-5 inline-flex items-center justify-center rounded-full bg-[#e9c66d] hover:bg-[#dfb957] text-[#3d291a] px-5 py-2.5 text-[13px] font-semibold transition-colors"
              >
                Jelajahi Menu
              </a>
            </div>
          ) : (
            <div className="divide-y divide-[#ebe0cc]">
              {cartLines.map(({ product, quantity, subtotal }) => {
                const unavailable = product.status !== 'Tersedia';
                return (
                  <div key={product.id} className="py-4 flex gap-3.5 items-start">
                    <img
                      src={product.image}
                      alt={product.name}
                      referrerPolicy="no-referrer"
                      className="w-16 h-16 rounded-xl object-cover bg-[#f7edda] shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[14px] font-bold text-[#523925] truncate">
                            {product.name}
                          </p>
                          <p className="text-[12px] text-[#766450] tabular-nums">
                            {formatRupiah(product.price)} / pcs
                          </p>
                        </div>
                        <p className="text-[14px] font-bold text-[#523925] tabular-nums shrink-0">
                          {formatRupiah(subtotal)}
                        </p>
                      </div>

                      {unavailable && (
                        <p className="mt-1 text-[11px] font-semibold text-[#b45309]">
                          Produk sedang tidak tersedia — hapus untuk melanjutkan checkout.
                        </p>
                      )}

                      <div className="mt-2.5 flex items-center justify-between">
                        <div className="inline-flex items-center gap-2 rounded-full border border-[#ebe0cc] bg-white px-1.5 py-0.5">
                          <button
                            type="button"
                            onClick={() => onUpdateQty(product.id, -1)}
                            aria-label={`Kurangi jumlah ${product.name}`}
                            className="w-7 h-7 rounded-full inline-flex items-center justify-center text-[#523925] hover:bg-[#f7edda]"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-6 text-center text-[13px] font-bold tabular-nums text-[#523925]">
                            {quantity}
                          </span>
                          <button
                            type="button"
                            disabled={quantity >= 99}
                            onClick={() => onUpdateQty(product.id, 1)}
                            aria-label={`Tambah jumlah ${product.name}`}
                            className="w-7 h-7 rounded-full inline-flex items-center justify-center text-[#523925] hover:bg-[#f7edda] disabled:opacity-40"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => onRemoveItem(product.id)}
                          className="inline-flex items-center gap-1 text-[12px] text-[#8b7964] hover:text-[#b91c1c] transition-colors py-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Hapus</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Optional note */}
              <div className="pt-4">
                <label
                  htmlFor="cart-customer-note"
                  className="block text-[12px] font-semibold text-[#523925] mb-1.5"
                >
                  Catatan Pesanan (opsional)
                </label>
                <input
                  id="cart-customer-note"
                  type="text"
                  maxLength={200}
                  value={customerNote}
                  onChange={(e) => setCustomerNote(e.target.value)}
                  placeholder="Misal: atas nama Budi / ambil jam 15.00"
                  className="w-full rounded-xl border border-[#dfd1b8] bg-white px-3.5 py-2.5 text-[13px] text-[#523925] placeholder:text-[#a2907c]"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer totals & checkout */}
        {!completedOrder && (
          <div className="px-6 py-5 border-t border-[#ebe0cc] bg-[#fff9ed]">
            {errorMsg && (
              <p
                role="alert"
                className="mb-3 rounded-xl bg-[#fef2f2] border border-[#fecaca] px-3.5 py-2.5 text-[12px] font-medium text-[#b91c1c]"
              >
                {errorMsg}
              </p>
            )}

            <div className="space-y-1.5 mb-4">
              <div className="flex items-center justify-between text-[13px] text-[#766450]">
                <span>Total Item</span>
                <span className="font-semibold text-[#523925] tabular-nums">{totalItems} pcs</span>
              </div>
              <div className="flex items-center justify-between text-[16px] font-bold text-[#523925]">
                <span>Total Pembayaran</span>
                <span className="tabular-nums">{formatRupiah(totalPrice)}</span>
              </div>
            </div>

            <button
              type="button"
              disabled={cartLines.length === 0 || hasUnavailableItem || submitting}
              onClick={handleCheckout}
              className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#523925] hover:bg-[#3d291a] disabled:bg-[#d8cfc2] disabled:text-[#8b7964] disabled:cursor-not-allowed text-white py-3.5 px-6 text-[14px] font-semibold transition-colors"
            >
              <span>{submitting ? 'Menyiapkan Pesanan...' : 'Checkout via WhatsApp'}</span>
              {!submitting && <ExternalLink className="w-4 h-4 text-[#e9c66d]" />}
            </button>

            <p className="mt-2.5 text-[11px] text-[#766450] text-center leading-relaxed">
              Pesanan akan dicatat dengan status Menunggu Konfirmasi lalu diarahkan ke WhatsApp
              penjual ({contact.whatsappNumber}).
            </p>
          </div>
        )}
      </aside>
    </div>
  );
}
