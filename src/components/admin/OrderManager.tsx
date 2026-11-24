import { Search, X } from 'lucide-react';
import { useState } from 'react';
import { updateAdminOrderStatus } from '../../services/api.ts';
import type { Order, OrderStatus } from '../../types.ts';
import { formatDateTime, formatRupiah } from '../../utils/format.ts';

interface OrderManagerProps {
  token: string;
  orders: Order[];
  onRefresh: () => Promise<void>;
}

const ORDER_STATUSES: OrderStatus[] = [
  'Menunggu Konfirmasi',
  'Diproses',
  'Selesai',
  'Dibatalkan',
];

const STATUS_STYLE: Record<OrderStatus, string> = {
  'Menunggu Konfirmasi': 'text-[#b45309] border-[#f5d08a] bg-[#fffbeb]',
  Diproses: 'text-[#1d4ed8] border-[#bfdbfe] bg-[#eff6ff]',
  Selesai: 'text-[#15803d] border-[#bbf7d0] bg-[#f0fdf4]',
  Dibatalkan: 'text-[#b91c1c] border-[#fecaca] bg-[#fef2f2]',
};

export function OrderManager({ token, orders, onRefresh }: OrderManagerProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const filteredOrders = orders.filter((order) => {
    if (statusFilter !== 'all' && order.status !== statusFilter) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const itemNames = order.items.map((i) => i.name.toLowerCase()).join(' ');
    return (
      order.id.toLowerCase().includes(q) ||
      itemNames.includes(q) ||
      (order.customerNote?.toLowerCase().includes(q) ?? false)
    );
  });

  const handleStatusChange = async (orderId: string, nextStatus: OrderStatus) => {
    setUpdatingId(orderId);
    setFeedback(null);
    try {
      await updateAdminOrderStatus(token, orderId, nextStatus);
      setFeedback(`Status pesanan ${orderId} diperbarui menjadi "${nextStatus}".`);
      await onRefresh();
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Gagal memperbarui status pesanan.');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-5">
      {feedback && (
        <div className="rounded-xl bg-white border border-[#ebe0cc] px-4 py-3 text-[13px] text-[#523925] flex items-center justify-between gap-4">
          <span>{feedback}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            aria-label="Tutup notifikasi"
            className="text-[#766450] hover:text-[#523925]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Info Banner */}
      <div className="rounded-2xl bg-[#fffdf8] border border-[#ebe0cc] px-5 py-3.5 text-[13px] text-[#766450] leading-relaxed">
        Pesanan pelanggan dicatat secara otomatis sebelum pelanggan diarahkan ke WhatsApp dengan
        status awal <strong className="text-[#523925]">Menunggu Konfirmasi</strong>. Perbarui
        status pesanan di bawah ini setelah pembayaran atau pengantaran dikonfirmasi di WhatsApp.
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-[360px]">
          <Search
            className="w-4 h-4 text-[#8b7964] absolute left-3.5 top-1/2 -translate-y-1/2"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari ID pesanan, produk, atau catatan..."
            className="w-full rounded-xl border border-[#dfd1b8] bg-white pl-10 pr-4 py-2.5 text-[13px] text-[#523925] placeholder:text-[#a2907c]"
          />
        </div>

        <div
          role="tablist"
          aria-label="Filter status pesanan"
          className="flex items-center gap-1 p-1 rounded-xl bg-[#f2e7d2] border border-[#ebe0cc] overflow-x-auto"
        >
          <button
            type="button"
            role="tab"
            aria-selected={statusFilter === 'all'}
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold whitespace-nowrap transition-colors ${
              statusFilter === 'all'
                ? 'bg-white text-[#523925] shadow-xs'
                : 'text-[#766450] hover:text-[#523925]'
            }`}
          >
            Semua ({orders.length})
          </button>
          {ORDER_STATUSES.map((st) => {
            const count = orders.filter((o) => o.status === st).length;
            return (
              <button
                key={st}
                type="button"
                role="tab"
                aria-selected={statusFilter === st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold whitespace-nowrap transition-colors ${
                  statusFilter === st
                    ? 'bg-white text-[#523925] shadow-xs'
                    : 'text-[#766450] hover:text-[#523925]'
                }`}
              >
                {st} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Orders Table */}
      <div className="rounded-2xl bg-white border border-[#ebe0cc] overflow-hidden">
        {filteredOrders.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-[15px] font-semibold text-[#523925]">
              {orders.length === 0 ? 'Belum ada pesanan masuk' : 'Tidak ada pesanan sesuai filter'}
            </p>
            <p className="mt-1.5 text-[13px] text-[#766450]">
              {orders.length === 0
                ? 'Setiap checkout pelanggan dari halaman toko akan tercatat di tabel ini.'
                : 'Coba ubah kata kunci pencarian atau pilih tab status lainnya.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-[#ebe0cc] bg-[#fffdf8] text-[#766450] font-semibold">
                  <th className="py-3.5 px-5">ID Pesanan</th>
                  <th className="py-3.5 px-4">Tanggal</th>
                  <th className="py-3.5 px-4">Rincian Produk</th>
                  <th className="py-3.5 px-4 text-right">Jumlah</th>
                  <th className="py-3.5 px-4 text-right">Total Harga</th>
                  <th className="py-3.5 px-5">Status Pesanan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f3ead9]">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-[#fffdf8] transition-colors align-top">
                    <td className="py-4 px-5 font-mono text-[12px] font-semibold text-[#523925] whitespace-nowrap">
                      {order.id}
                    </td>
                    <td className="py-4 px-4 text-[#766450] whitespace-nowrap tabular-nums">
                      {formatDateTime(order.createdAt)}
                    </td>
                    <td className="py-4 px-4">
                      <ul className="space-y-0.5 text-[#523925]">
                        {order.items.map((item) => (
                          <li key={`${order.id}-${item.productId}`} className="tabular-nums">
                            {item.name} ×{item.quantity}{' '}
                            <span className="text-[#8b7964]">
                              ({formatRupiah(item.subtotal)})
                            </span>
                          </li>
                        ))}
                      </ul>
                      {order.customerNote && (
                        <p className="mt-1.5 text-[12px] text-[#766450]">
                          Catatan: {order.customerNote}
                        </p>
                      )}
                    </td>
                    <td className="py-4 px-4 text-right font-mono tabular-nums text-[#523925] whitespace-nowrap">
                      {order.totalItems} pcs
                    </td>
                    <td className="py-4 px-4 text-right font-mono font-semibold tabular-nums text-[#523925] whitespace-nowrap">
                      {formatRupiah(order.totalPrice)}
                    </td>
                    <td className="py-4 px-5 whitespace-nowrap">
                      <select
                        aria-label={`Ubah status pesanan ${order.id}`}
                        disabled={updatingId === order.id}
                        value={order.status}
                        onChange={(e) =>
                          handleStatusChange(order.id, e.target.value as OrderStatus)
                        }
                        className={`rounded-lg border px-2.5 py-1.5 text-[12px] font-semibold transition-colors ${
                          STATUS_STYLE[order.status]
                        }`}
                      >
                        {ORDER_STATUSES.map((st) => (
                          <option key={st} value={st} className="bg-white text-[#523925]">
                            {st}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
