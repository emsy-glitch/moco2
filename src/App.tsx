import { useCallback, useEffect, useState } from 'react';
import { AdminLayout, type AdminTab } from './components/admin/AdminLayout.tsx';
import { AdminLogin } from './components/admin/AdminLogin.tsx';
import { ContactManager } from './components/admin/ContactManager.tsx';
import { DashboardOverview } from './components/admin/DashboardOverview.tsx';
import { OrderManager } from './components/admin/OrderManager.tsx';
import { ProductManager } from './components/admin/ProductManager.tsx';
import { SecurityAndLogs } from './components/admin/SecurityAndLogs.tsx';
import { AboutSection } from './components/storefront/AboutSection.tsx';
import { CartDrawer } from './components/storefront/CartDrawer.tsx';
import { ContactSection } from './components/storefront/ContactSection.tsx';
import { CustomerNavbar } from './components/storefront/CustomerNavbar.tsx';
import { Footer } from './components/storefront/Footer.tsx';
import { HeroSection } from './components/storefront/HeroSection.tsx';
import { MenuSection } from './components/storefront/MenuSection.tsx';
import { PrivacyPolicyModal } from './components/storefront/PrivacyPolicyModal.tsx';
import { ProductDetailModal } from './components/storefront/ProductDetailModal.tsx';
import {
  adminLogout,
  ApiError,
  fetchAdminDashboard,
  fetchAdminOrders,
  fetchAdminProducts,
  fetchStorefront,
  loadCachedStorefront,
  loadCartFromStorage,
  saveCartToStorage,
} from './services/api.ts';
import type {
  AdminOverviewStats,
  AdminUserInfo,
  CartItem,
  Order,
  Product,
  StorefrontData,
} from './types.ts';

function isAdminRouteLocation(): boolean {
  const path = window.location.pathname.toLowerCase();
  const hash = window.location.hash.toLowerCase();
  return path.startsWith('/admin') || hash.startsWith('#/admin') || hash === '#admin';
}

export default function App() {
  const [viewMode, setViewMode] = useState<'storefront' | 'admin'>(() =>
    isAdminRouteLocation() ? 'admin' : 'storefront'
  );

  // Public Storefront State (synced with API + cached in LocalStorage)
  const [storefront, setStorefront] = useState<StorefrontData>(() => loadCachedStorefront());
  const [cart, setCart] = useState<CartItem[]>(() => loadCartFromStorage());
  const [cartOpen, setCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [privacyOpen, setPrivacyOpen] = useState(false);

  // Admin Auth State (kept strictly in React memory, never in localStorage)
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [adminUser, setAdminUser] = useState<AdminUserInfo | null>(null);
  const [adminTab, setAdminTab] = useState<AdminTab>('dashboard');
  const [adminStats, setAdminStats] = useState<AdminOverviewStats | null>(null);
  const [adminProducts, setAdminProducts] = useState<Product[]>([]);
  const [adminOrders, setAdminOrders] = useState<Order[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);

  // Sync URL navigation (/ and /admin)
  useEffect(() => {
    const handleNavChange = () => {
      setViewMode(isAdminRouteLocation() ? 'admin' : 'storefront');
    };
    window.addEventListener('popstate', handleNavChange);
    window.addEventListener('hashchange', handleNavChange);
    return () => {
      window.removeEventListener('popstate', handleNavChange);
      window.removeEventListener('hashchange', handleNavChange);
    };
  }, []);

  const navigateTo = useCallback((mode: 'storefront' | 'admin') => {
    const targetPath = mode === 'admin' ? '/admin' : '/';
    if (window.location.pathname !== targetPath) {
      window.history.pushState({}, '', targetPath);
    }
    setViewMode(mode);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  // Load latest public storefront data from backend
  const refreshStorefront = useCallback(async () => {
    try {
      const fresh = await fetchStorefront();
      setStorefront(fresh);
    } catch {
      // Retain cached/fallback storefront gracefully
    }
  }, []);

  useEffect(() => {
    void refreshStorefront();
  }, [refreshStorefront]);

  // Persist customer cart to LocalStorage whenever it changes
  useEffect(() => {
    saveCartToStorage(cart);
  }, [cart]);

  // Load Admin Data when authenticated
  const refreshAdminData = useCallback(
    async (tokenOverride?: string) => {
      const activeToken = tokenOverride ?? adminToken;
      if (!activeToken) return;
      setAdminLoading(true);
      try {
        const [stats, products, orders, freshStorefront] = await Promise.all([
          fetchAdminDashboard(activeToken),
          fetchAdminProducts(activeToken),
          fetchAdminOrders(activeToken),
          fetchStorefront(),
        ]);
        setAdminStats(stats);
        setAdminProducts(products);
        setAdminOrders(orders);
        setStorefront(freshStorefront);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          setAdminToken(null);
          setAdminUser(null);
        }
      } finally {
        setAdminLoading(false);
      }
    },
    [adminToken]
  );

  useEffect(() => {
    if (viewMode === 'admin' && adminToken) {
      void refreshAdminData(adminToken);
    }
  }, [viewMode, adminToken, refreshAdminData]);

  // Customer Cart Handlers
  const handleAddToCart = (product: Product, quantity = 1) => {
    if (product.status !== 'Tersedia') return;
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: Math.min(99, item.quantity + quantity) }
            : item
        );
      }
      return [...prev, { productId: product.id, quantity: Math.min(99, quantity) }];
    });
  };

  const handleUpdateCartQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.productId === productId
            ? { ...item, quantity: Math.min(99, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const handleRemoveCartItem = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const handleClearCart = () => {
    setCart([]);
  };

  // Admin Auth Handlers
  const handleAdminAuthenticated = (token: string, user: AdminUserInfo) => {
    setAdminToken(token);
    setAdminUser(user);
    setAdminTab('dashboard');
    void refreshAdminData(token);
  };

  const handleAdminLogout = async () => {
    const tokenToRevoke = adminToken;
    setAdminToken(null);
    setAdminUser(null);
    setAdminStats(null);
    setAdminOrders([]);
    setAdminProducts([]);
    if (tokenToRevoke) {
      try {
        await adminLogout(tokenToRevoke);
      } catch {
        // Ignore network errors on logout after clearing local state
      }
    }
  };

  // =========================================================================
  // ADMIN VIEW (Strictly isolated from Customer Website)
  // =========================================================================
  if (viewMode === 'admin') {
    if (!adminToken || !adminUser) {
      return (
        <AdminLogin
          onAuthenticated={handleAdminAuthenticated}
          onBackToStore={() => {
            void refreshStorefront();
            navigateTo('storefront');
          }}
        />
      );
    }

    return (
      <AdminLayout
        activeTab={adminTab}
        onSelectTab={setAdminTab}
        user={adminUser}
        onLogout={handleAdminLogout}
        onViewStorefront={() => {
          void refreshStorefront();
          navigateTo('storefront');
        }}
      >
        {adminTab === 'dashboard' && (
          <DashboardOverview
            stats={adminStats}
            products={adminProducts}
            loading={adminLoading}
            onNavigateTab={setAdminTab}
          />
        )}

        {adminTab === 'products' && (
          <ProductManager
            token={adminToken}
            products={adminProducts}
            onRefresh={() => refreshAdminData(adminToken)}
          />
        )}

        {adminTab === 'orders' && (
          <OrderManager
            token={adminToken}
            orders={adminOrders}
            onRefresh={() => refreshAdminData(adminToken)}
          />
        )}

        {adminTab === 'contact' && (
          <ContactManager
            token={adminToken}
            contact={storefront.contact}
            onRefresh={() => refreshAdminData(adminToken)}
          />
        )}

        {adminTab === 'security' && (
          <SecurityAndLogs
            token={adminToken}
            onPasswordChanged={() =>
              setAdminUser((prev) => (prev ? { ...prev, isDefaultPassword: false } : prev))
            }
            onDataRestored={() => refreshAdminData(adminToken)}
          />
        )}
      </AdminLayout>
    );
  }

  // =========================================================================
  // CUSTOMER STOREFRONT VIEW
  // =========================================================================
  const totalCartCount = cart.reduce((sum, item) => {
    const exists = storefront.products.some((p) => p.id === item.productId);
    return exists ? sum + item.quantity : sum;
  }, 0);

  const featuredProducts = storefront.products.filter((p) => p.featured);

  return (
    <div className="min-h-dvh flex flex-col bg-[#fff9ed] text-[#523925]">
      <CustomerNavbar
        cartCount={totalCartCount}
        onOpenCart={() => setCartOpen(true)}
      />

      <main className="flex-1">
        <HeroSection
          featuredProducts={
            featuredProducts.length > 0 ? featuredProducts : storefront.products.slice(0, 2)
          }
          onSelectProduct={(product) => setSelectedProduct(product)}
        />

        <MenuSection
          products={storefront.products}
          onSelectProduct={(product) => setSelectedProduct(product)}
          onQuickAdd={(product) => handleAddToCart(product, 1)}
        />

        <AboutSection />

        <ContactSection contact={storefront.contact} />
      </main>

      <Footer
        contact={storefront.contact}
        onOpenPrivacy={() => setPrivacyOpen(true)}
        onNavigateAdmin={() => navigateTo('admin')}
      />

      <ProductDetailModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={(product, qty) => {
          handleAddToCart(product, qty);
          setCartOpen(true);
        }}
      />

      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        cart={cart}
        products={storefront.products}
        contact={storefront.contact}
        onUpdateQty={handleUpdateCartQty}
        onRemoveItem={handleRemoveCartItem}
        onClearCart={handleClearCart}
      />

      <PrivacyPolicyModal
        open={privacyOpen}
        onClose={() => setPrivacyOpen(false)}
        contact={storefront.contact}
      />
    </div>
  );
}
