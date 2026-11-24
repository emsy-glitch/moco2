import {
  AlertTriangle,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Phone,
  ShieldCheck,
  ShoppingBag,
  X,
} from 'lucide-react';
import { type ReactNode, useState } from 'react';
import type { AdminUserInfo } from '../../types.ts';

export type AdminTab = 'dashboard' | 'products' | 'orders' | 'contact' | 'security';

interface AdminLayoutProps {
  activeTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  user: AdminUserInfo;
  onLogout: () => void;
  onViewStorefront: () => void;
  children: ReactNode;
}

const SIDEBAR_ITEMS: Array<{ id: AdminTab; label: string; icon: typeof LayoutDashboard }> = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'products', label: 'Produk', icon: Package },
  { id: 'orders', label: 'Pesanan', icon: ShoppingBag },
  { id: 'contact', label: 'Kontak', icon: Phone },
  { id: 'security', label: 'Keamanan & Log', icon: ShieldCheck },
];

const TAB_TITLES: Record<AdminTab, { title: string; subtitle: string }> = {
  dashboard: {
    title: 'Dashboard Overview',
    subtitle: 'Ringkasan katalog mochi, pesanan tercatat, dan aktivitas toko.',
  },
  products: {
    title: 'Manajemen Produk',
    subtitle: 'Kelola varian mochi, harga, foto, deskripsi, dan status ketersediaan.',
  },
  orders: {
    title: 'Manajemen Pesanan',
    subtitle: 'Pantau pesanan pelanggan yang tercatat dan perbarui status pengerjaan.',
  },
  contact: {
    title: 'Manajemen Kontak',
    subtitle: 'Perbarui informasi WhatsApp dan Instagram yang tampil di website pelanggan.',
  },
  security: {
    title: 'Keamanan, Audit Log & Backup',
    subtitle: 'Kontrol autentikasi, riwayat aktivitas 90 hari, dan pencadangan data toko.',
  },
};

export function AdminLayout({
  activeTab,
  onSelectTab,
  user,
  onLogout,
  onViewStorefront,
  children,
}: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const currentMeta = TAB_TITLES[activeTab];

  const renderNavContent = () => (
    <div className="flex flex-col h-full">
      <div className="px-6 h-[72px] flex items-center justify-between border-b border-[#ebe0cc]">
        <div>
          <span className="font-display text-[26px] font-bold tracking-[-0.04em] text-[#523925] leading-none">
            mo<span className="text-[#c89c3d]">co</span>.
          </span>
          <span className="ml-2 text-[11px] font-semibold text-[#766450]">Admin</span>
        </div>
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          aria-label="Tutup sidebar"
          className="lg:hidden p-1.5 rounded-lg text-[#766450] hover:bg-[#f7edda]"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav aria-label="Navigasi admin" className="flex-1 px-3 py-5 space-y-1">
        {SIDEBAR_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelectTab(item.id);
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[14px] font-medium transition-colors whitespace-nowrap ${
                active
                  ? 'bg-[#523925] text-white'
                  : 'text-[#6c5945] hover:bg-[#f7edda] hover:text-[#523925]'
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 ${active ? 'text-[#e9c66d]' : 'text-[#9c7426]'}`}
                aria-hidden="true"
              />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-3 border-t border-[#ebe0cc] space-y-1.5">
        <button
          type="button"
          onClick={onViewStorefront}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-medium text-[#6c5945] hover:bg-[#f7edda] hover:text-[#523925] transition-colors whitespace-nowrap"
        >
          <ExternalLink className="w-4 h-4 text-[#9c7426] shrink-0" aria-hidden="true" />
          <span>Lihat Toko Pelanggan</span>
        </button>

        <button
          type="button"
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-semibold text-[#b91c1c] hover:bg-[#fef2f2] transition-colors whitespace-nowrap"
        >
          <LogOut className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh bg-[#faf6ee] flex text-[#523925]">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-[248px] shrink-0 bg-[#fffdf8] border-r border-[#ebe0cc] sticky top-0 h-dvh">
        {renderNavContent()}
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-[#3d291a]/40"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative z-10 w-[264px] max-w-[85vw] bg-[#fffdf8] h-dvh shadow-xl">
            {renderNavContent()}
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-20 h-[72px] bg-[#fffdf8]/95 backdrop-blur-md border-b border-[#ebe0cc] px-4 sm:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Buka menu sidebar admin"
              className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-xl border border-[#ebe0cc] bg-white text-[#523925]"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <p className="text-[12px] text-[#766450] truncate">
                Moco Admin / <span className="text-[#523925] font-medium">{currentMeta.title}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0 text-[13px]">
            <div className="text-right hidden sm:block">
              <p className="font-semibold text-[#523925] leading-tight">{user.username}</p>
              <p className="text-[11px] text-[#766450]">
                Pengelola · MFA Aktif
              </p>
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#dfd1b8] hover:bg-[#fff9ed] px-3.5 py-2 text-[12px] font-semibold text-[#523925] whitespace-nowrap"
            >
              <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Logout</span>
            </button>
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-8 py-6 sm:py-8 max-w-[1200px] w-full mx-auto space-y-6">
          {user.isDefaultPassword && (
            <div className="rounded-2xl bg-[#fffbeb] border border-[#f5d08a] px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5 text-[13px] text-[#78350f]">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-[#b45309]" />
                <p>
                  Akun masih menggunakan password awal prototype. Sebelum publikasi, ganti password
                  admin melalui menu Keamanan &amp; Log atau atur melalui environment variables.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onSelectTab('security')}
                className="text-[12px] font-semibold text-[#523925] underline underline-offset-4 whitespace-nowrap self-start sm:self-auto"
              >
                Ganti Password
              </button>
            </div>
          )}

          <div>
            <h1 className="font-display text-[26px] sm:text-[30px] font-bold text-[#523925] leading-tight">
              {currentMeta.title}
            </h1>
            <p className="mt-1 text-[14px] text-[#766450]">{currentMeta.subtitle}</p>
          </div>

          {children}
        </main>
      </div>
    </div>
  );
}
