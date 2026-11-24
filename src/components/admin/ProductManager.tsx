import { Pencil, Plus, Search, Trash2, Upload, X } from 'lucide-react';
import { type ChangeEvent, type FormEvent, useState } from 'react';
import { MOCO_IMAGES } from '../../data/mocoImages.ts';
import {
  createAdminProduct,
  deleteAdminProduct,
  updateAdminProduct,
} from '../../services/api.ts';
import type { Product, ProductStatus } from '../../types.ts';
import { formatRupiah, validateProductInput } from '../../utils/format.ts';

interface ProductManagerProps {
  token: string;
  products: Product[];
  onRefresh: () => Promise<void>;
}

interface ProductFormState {
  name: string;
  tag: string;
  price: string;
  description: string;
  image: string;
  status: ProductStatus;
  featured: boolean;
}

const EMPTY_FORM: ProductFormState = {
  name: '',
  tag: 'Signature',
  price: '10000',
  description: '',
  image: MOCO_IMAGES.products.mango,
  status: 'Tersedia',
  featured: false,
};

const PRESET_IMAGES = [
  { label: 'Mango', src: MOCO_IMAGES.products.mango },
  { label: 'Strawberry', src: MOCO_IMAGES.products.strawberry },
  { label: 'Matcha', src: MOCO_IMAGES.products.matcha },
  { label: 'Vanilla', src: MOCO_IMAGES.products.vanilla },
  { label: 'Red Bean', src: MOCO_IMAGES.products.redbean },
];

export function ProductManager({ token, products, onRefresh }: ProductManagerProps) {
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filteredProducts = products.filter((p) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      p.tag.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q)
    );
  });

  const openCreateModal = () => {
    setEditingProduct(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setForm({
      name: product.name,
      tag: product.tag,
      price: String(product.price),
      description: product.description,
      image: product.image,
      status: product.status,
      featured: product.featured,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setFormError('Format gambar harus JPG, PNG, atau WebP.');
      return;
    }
    if (file.size > 1_200_000) {
      setFormError('Ukuran gambar maksimal 1.2 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setForm((prev) => ({ ...prev, image: reader.result as string }));
        setFormError(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;

    const validation = validateProductInput({
      name: form.name,
      tag: form.tag,
      description: form.description,
      price: Number(form.price),
      image: form.image,
      status: form.status,
      featured: form.featured,
    });

    if (!validation.valid || !validation.data) {
      setFormError(validation.error || 'Periksa kembali input produk.');
      return;
    }

    setFormError(null);
    setSaving(true);
    try {
      if (editingProduct) {
        await updateAdminProduct(token, editingProduct.id, validation.data);
        setFeedback(`Produk "${validation.data.name}" berhasil diperbarui.`);
      } else {
        await createAdminProduct(token, validation.data);
        setFeedback(`Produk baru "${validation.data.name}" berhasil ditambahkan.`);
      }
      await onRefresh();
      setModalOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Gagal menyimpan produk.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (product: Product) => {
    const nextStatus: ProductStatus =
      product.status === 'Tersedia' ? 'Tidak Tersedia' : 'Tersedia';
    try {
      await updateAdminProduct(token, product.id, {
        name: product.name,
        tag: product.tag,
        description: product.description,
        price: product.price,
        image: product.image,
        status: nextStatus,
        featured: product.featured,
      });
      setFeedback(`Status "${product.name}" diubah menjadi ${nextStatus}.`);
      await onRefresh();
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Gagal mengubah status produk.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingProduct || deleting) return;
    setDeleting(true);
    try {
      await deleteAdminProduct(token, deletingProduct.id);
      setFeedback(`Produk "${deletingProduct.name}" berhasil dihapus.`);
      setDeletingProduct(null);
      await onRefresh();
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Gagal menghapus produk.');
    } finally {
      setDeleting(false);
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
            className="text-[#766450] hover:text-[#523925]"
            aria-label="Tutup notifikasi"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-[360px]">
          <Search
            className="w-4 h-4 text-[#8b7964] absolute left-3.5 top-1/2 -translate-y-1/2"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama atau rasa mochi..."
            className="w-full rounded-xl border border-[#dfd1b8] bg-white pl-10 pr-4 py-2.5 text-[13px] text-[#523925] placeholder:text-[#a2907c]"
          />
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[#523925] hover:bg-[#3d291a] text-white px-5 py-2.5 text-[13px] font-semibold transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4 text-[#e9c66d]" aria-hidden="true" />
          <span>Tambah Produk</span>
        </button>
      </div>

      {/* Product Table */}
      <div className="rounded-2xl bg-white border border-[#ebe0cc] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-[#ebe0cc] bg-[#fffdf8] text-[#766450] font-semibold">
                <th className="py-3.5 px-5">Produk</th>
                <th className="py-3.5 px-4">Deskripsi</th>
                <th className="py-3.5 px-4 text-right">Harga</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f3ead9]">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-[#766450]">
                    Tidak ada produk yang cocok dengan pencarian.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-[#fffdf8] transition-colors">
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3 min-w-[200px]">
                        <img
                          src={product.image}
                          alt={product.name}
                          referrerPolicy="no-referrer"
                          className="w-12 h-12 rounded-xl object-cover bg-[#f7edda] shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="font-semibold text-[#523925] truncate">{product.name}</p>
                          <p className="text-[11px] text-[#8b7964] truncate">
                            {product.tag}
                            {product.featured ? ' · Unggulan' : ''}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-[#766450] max-w-[300px]">
                      <p className="line-clamp-2">{product.description}</p>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-semibold tabular-nums text-[#523925] whitespace-nowrap">
                      {formatRupiah(product.price)}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(product)}
                        className={`text-[12px] font-semibold underline underline-offset-4 transition-colors ${
                          product.status === 'Tersedia'
                            ? 'text-[#15803d] hover:text-[#166534]'
                            : 'text-[#b45309] hover:text-[#92400e]'
                        }`}
                        title="Klik untuk mengubah ketersediaan produk"
                      >
                        {product.status}
                      </button>
                    </td>
                    <td className="py-3.5 px-5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(product)}
                          className="inline-flex items-center gap-1 rounded-lg border border-[#dfd1b8] hover:bg-[#fff9ed] px-2.5 py-1.5 text-[12px] font-semibold text-[#523925]"
                        >
                          <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingProduct(product)}
                          className="inline-flex items-center gap-1 rounded-lg border border-[#fecaca] hover:bg-[#fef2f2] px-2.5 py-1.5 text-[12px] font-semibold text-[#b91c1c]"
                        >
                          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Hapus</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#3d291a]/45 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="product-modal-title"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="w-full max-w-[580px] max-h-[90dvh] rounded-3xl bg-[#fffdf8] border border-[#ebe0cc] shadow-xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-[#ebe0cc] flex items-center justify-between">
              <h2
                id="product-modal-title"
                className="font-display text-[20px] font-bold text-[#523925]"
              >
                {editingProduct ? `Edit Produk: ${editingProduct.name}` : 'Tambah Produk Baru'}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Tutup form produk"
                className="w-8 h-8 rounded-full bg-[#f7edda] text-[#523925] inline-flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
              {formError && (
                <p
                  role="alert"
                  className="rounded-xl bg-[#fef2f2] border border-[#fecaca] px-3.5 py-2.5 text-[12px] font-medium text-[#b91c1c]"
                >
                  {formError}
                </p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-semibold text-[#523925] mb-1">
                    Nama Produk
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={80}
                    value={form.name}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Contoh: Choco Hazelnut"
                    className="w-full rounded-xl border border-[#dfd1b8] bg-white px-3.5 py-2.5 text-[13px] text-[#523925]"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-[#523925] mb-1">
                    Kategori / Label Rasa
                  </label>
                  <input
                    type="text"
                    maxLength={40}
                    value={form.tag}
                    onChange={(e) => setForm((prev) => ({ ...prev, tag: e.target.value }))}
                    placeholder="Contoh: Best Seller / Classic"
                    className="w-full rounded-xl border border-[#dfd1b8] bg-white px-3.5 py-2.5 text-[13px] text-[#523925]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-semibold text-[#523925] mb-1">
                    Harga (IDR)
                  </label>
                  <input
                    type="number"
                    required
                    min={1000}
                    max={10000000}
                    step={500}
                    value={form.price}
                    onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
                    className="w-full rounded-xl border border-[#dfd1b8] bg-white px-3.5 py-2.5 text-[13px] font-mono tabular-nums text-[#523925]"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-[#523925] mb-1">
                    Status Ketersediaan
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        status: e.target.value as ProductStatus,
                      }))
                    }
                    className="w-full rounded-xl border border-[#dfd1b8] bg-white px-3.5 py-2.5 text-[13px] text-[#523925]"
                  >
                    <option value="Tersedia">Tersedia</option>
                    <option value="Tidak Tersedia">Tidak Tersedia</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-[#523925] mb-1">
                  Deskripsi Produk
                </label>
                <textarea
                  rows={3}
                  required
                  maxLength={300}
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Jelaskan rasa dan tekstur isian mochi..."
                  className="w-full rounded-xl border border-[#dfd1b8] bg-white px-3.5 py-2.5 text-[13px] text-[#523925]"
                />
              </div>

              <label className="inline-flex items-center gap-2.5 text-[13px] text-[#523925] cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={(e) => setForm((prev) => ({ ...prev, featured: e.target.checked }))}
                  className="w-4 h-4 rounded accent-[#523925]"
                />
                <span>Tampilkan sebagai Produk Unggulan di halaman Home</span>
              </label>

              {/* Product Image Picker & Upload */}
              <div className="pt-2 border-t border-[#ebe0cc] space-y-3">
                <label className="block text-[12px] font-semibold text-[#523925]">
                  Gambar Produk
                </label>
                <div className="flex items-start gap-4">
                  <img
                    src={form.image}
                    alt="Pratinjau gambar produk"
                    referrerPolicy="no-referrer"
                    className="w-20 h-20 rounded-xl object-cover bg-[#f7edda] border border-[#ebe0cc] shrink-0"
                  />
                  <div className="flex-1 space-y-2.5">
                    <label className="inline-flex items-center gap-2 rounded-lg border border-[#dfd1b8] bg-white hover:bg-[#fff9ed] px-3.5 py-2 text-[12px] font-semibold text-[#523925] cursor-pointer">
                      <Upload className="w-3.5 h-3.5 text-[#9c7426]" />
                      <span>Unggah Foto (JPG/PNG/WebP)</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                    <input
                      type="url"
                      value={form.image.startsWith('data:') ? '' : form.image}
                      onChange={(e) => setForm((prev) => ({ ...prev, image: e.target.value }))}
                      placeholder="Atau tempel tautan gambar HTTPS..."
                      className="w-full rounded-xl border border-[#dfd1b8] bg-white px-3 py-2 text-[12px] text-[#523925]"
                    />
                  </div>
                </div>

                <div>
                  <p className="text-[11px] text-[#766450] mb-1.5">Atau pilih galeri foto Moco:</p>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_IMAGES.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, image: preset.src }))}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] font-medium transition-colors ${
                          form.image === preset.src
                            ? 'border-[#523925] bg-[#f7edda] text-[#523925]'
                            : 'border-[#ebe0cc] bg-white text-[#766450] hover:text-[#523925]'
                        }`}
                      >
                        <img
                          src={preset.src}
                          alt={preset.label}
                          className="w-5 h-5 rounded object-cover"
                        />
                        <span>{preset.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[#ebe0cc] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-full border border-[#dfd1b8] px-5 py-2.5 text-[13px] font-semibold text-[#523925] hover:bg-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-full bg-[#523925] hover:bg-[#3d291a] disabled:opacity-50 text-white px-6 py-2.5 text-[13px] font-semibold"
                >
                  {saving ? 'Menyimpan...' : editingProduct ? 'Simpan Perubahan' : 'Tambah Produk'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#3d291a]/45"
          role="dialog"
          aria-modal="true"
          onClick={() => setDeletingProduct(null)}
        >
          <div
            className="w-full max-w-[420px] rounded-2xl bg-white border border-[#ebe0cc] p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-[20px] font-bold text-[#523925]">Hapus Produk?</h3>
            <p className="mt-2 text-[13px] text-[#766450] leading-relaxed">
              Produk <strong className="text-[#523925]">{deletingProduct.name}</strong> akan dihapus
              dari katalog dan tidak lagi tampil di halaman pelanggan.
            </p>
            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeletingProduct(null)}
                className="rounded-full border border-[#dfd1b8] px-4 py-2 text-[13px] font-semibold text-[#523925]"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="rounded-full bg-[#b91c1c] hover:bg-[#991b1b] disabled:opacity-50 text-white px-5 py-2 text-[13px] font-semibold"
              >
                {deleting ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
