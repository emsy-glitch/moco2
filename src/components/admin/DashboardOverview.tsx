import { ArrowRight } from 'lucide-react';
import type { AdminOverviewStats, OrderStatus, Product } from '../../types.ts';
import { formatDateTime, formatRupiah } from '../../utils/format.ts';
import type { AdminTab } from './AdminLayout.tsx';

interface DashboardOverviewProps {
  stats: AdminOverviewStats | null;
  products: Product[];
  loading: boolean;
  onNavigateTab: (tab: AdminTab) => void;
}

const STATUS_TEXT_CLASS: Record<OrderStatus, string> = {
  'Menunggu Konfirmasi': 'text-[#b45309]',
  Diproses: 'text-[#1d4ed8]',
  Selesai: 'text-[#15803d]',
  Dibatalkan: 'text-[#b91c1c]',
};

export function DashboardOverview({
  stats,
  products,
  loading,
  onNavigateTab,
}: DashboardOverviewProps) {
  if (loading && !stats) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((n) => (
          <div
            key={n}
            className="h-[112px] rounded-2xl bg-white border border-[#ebe0cc] animate-pulse"
          />
        ))}
      </div>
    );
  }

  const totalProducts = stats?.totalProducts ?? products.length;
  const availableProducts =
    stats?.availableProducts ?? products.filter((p) => p.status === 'Tersedia').length;
  const totalOrders = stats?.totalOrders ?? 0;
  const totalItemsSold = stats?.totalItemsSold ?? 0;
  const totalOrderValue = stats?.totalOrderValue ?? 0;
  const pendingOrders = stats?.pendingOrders ?? 0;
  const recentOrders = stats?.recentOrders ?? [];

  const statCards = [
    {
      label: 'Total Produk',
      value: String(totalProducts),
      meta: `${availableProducts} tersedia di menu`,
    },
    {
      label: 'Total Pesanan',
      value: String(totalOrders),
      meta: `${pendingOrders} menunggu konfirmasi`,
    },
    {
      label: 'Total Item Terjual',
      value: `${totalItemsSold} pcs`,
      meta: 'Tidak termasuk pesanan dibatalkan',
    },
    {
      label: 'Total Nilai Pesanan',
      value: formatRupiah(totalOrderValue),
      meta: 'Akumulasi pesanan tercatat',
    },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Stat Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl bg-white border border-[#ebe0cc] p-5 flex flex-col justify-between"
          >
            <p className="text-[12px] font-medium text-[#766450]">{card.label}</p>
            <p className="mt-2 font-mono text-[26px] font-semibold text-[#523925] tabular-nums tracking-tight">
              {card.value}
            </p>
            <p className="mt-2 text-[12px] text-[#8b7964]">{card.meta}</p>
          </div>
        ))}
      </div>

      {/* Recent Orders Table */}
      <section className="rounded-2xl bg-white border border-[#ebe0cc] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#ebe0cc] flex items-center justify-between gap-4">
          <div>
            <h2 className="text-[16px] font-bold text-[#523925]">Pesanan Terbaru</h2>
            <p className="text-[12px] text-[#766450] mt-0.5">
              Pesanan yang masuk melalui checkout WhatsApp dicatat otomatis dengan status awal
              Menunggu Konfirmasi.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('orders')}
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#9c7426] hover:text-[#523925] whitespace-nowrap shrink-0"
          >
            <span>Semua Pesanan</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {recentOrders.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-[14px] font-medium text-[#523925]">Belum ada pesanan tercatat</p>
            <p className="mt-1 text-[13px] text-[#766450]">
              Pesanan akan muncul otomatis setelah pelanggan menekan tombol Checkout via WhatsApp
              di keranjang belanja.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-[#ebe0cc] bg-[#fffdf8] text-[#766450] font-semibold">
                  <th className="py-3 px-5">ID Pesanan</th>
                  <th className="py-3 px-4">Tanggal</th>
                  <th className="py-3 px-4">Produk</th>
                  <th className="py-3 px-4 text-right">Jumlah</th>
                  <th className="py-3 px-4 text-right">Total</th>
                  <th className="py-3 px-5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f3ead9]">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-[#fffdf8] transition-colors">
                    <td className="py-3.5 px-5 font-mono text-[12px] font-medium text-[#523925] whitespace-nowrap">
                      {order.id}
                    </td>
                    <td className="py-3.5 px-4 text-[#766450] whitespace-nowrap tabular-nums">
                      {formatDateTime(order.createdAt)}
                    </td>
                    <td className="py-3.5 px-4 text-[#523925]">
                      {order.items.map((item) => `${item.name} (${item.quantity})`).join(', ')}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-[#523925]">
                      {order.totalItems}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-semibold tabular-nums text-[#523925] whitespace-nowrap">
                      {formatRupiah(order.totalPrice)}
                    </td>
                    <td className="py-3.5 px-5 whitespace-nowrap">
                      <span className={`font-semibold ${STATUS_TEXT_CLASS[order.status]}`}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Catalog Quick Summary */}
      <section className="rounded-2xl bg-white border border-[#ebe0cc] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#ebe0cc] flex items-center justify-between gap-4">
          <h2 className="text-[16px] font-bold text-[#523925]">Ringkasan Katalog Mochi</h2>
          <button
            type="button"
            onClick={() => onNavigateTab('products')}
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#9c7426] hover:text-[#523925] whitespace-nowrap shrink-0"
          >
            <span>Kelola Produk</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
        <div className="divide-y divide-[#f3ead9]">
          {products.map((product) => (
            <div
              key={product.id}
              className="px-5 py-3 flex items-center justify-between gap-4 text-[13px]"
            >
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={product.image}
                  alt={product.name}
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 rounded-lg object-cover bg-[#f7edda] shrink-0"
                />
                <div className="min-w-0">
                  <p className="font-semibold text-[#523925] truncate">
                    {product.name}
                    {product.featured ? ' · Unggulan' : ''}
                  </p>
                  <p className="text-[12px] text-[#766450] truncate">{product.tag}</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-5 text-right shrink-0">
                <span className="font-mono font-semibold tabular-nums text-[#523925]">
                  {formatRupiah(product.price)}
                </span>
                <span
                  className={`text-[12px] font-semibold sm:min-w-[96px] text-right ${
                    product.status === 'Tersedia' ? 'text-[#15803d]' : 'text-[#b45309]'
                  }`}
                >
                  {product.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
