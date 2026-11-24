import type { ContactInfo, OrderItem, Product, ProductStatus } from '../types.ts';

export function formatRupiah(amount: number): string {
  const safe = Number.isFinite(amount) ? Math.max(0, Math.round(amount)) : 0;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  })
    .format(safe)
    .replace(/\u00a0/g, '');
}

export function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function sanitizePlainText(value: string, maxLength = 300): string {
  return value
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, maxLength);
}

export function isSafeExternalUrl(url: string): boolean {
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export function isSafeImageUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('/assets/') || trimmed.startsWith('/src/assets/')) {
    return !trimmed.includes('..');
  }
  if (/^data:image\/(webp|png|jpeg|jpg);base64,[A-Za-z0-9+/=]+$/.test(trimmed)) {
    return trimmed.length <= 1_800_000;
  }
  return isSafeExternalUrl(trimmed);
}

export function buildWhatsAppOrderMessage(
  items: OrderItem[],
  totalPrice: number,
  customerNote?: string
): string {
  const lines = items.map(
    (item) => `${item.name} x${item.quantity} = ${formatRupiah(item.subtotal)}`
  );
  const noteSection =
    customerNote && customerNote.trim().length > 0
      ? `\nCatatan: ${customerNote.trim()}\n`
      : '';
  return `Halo Moco, saya ingin memesan:\n\n${lines.join('\n')}\n\nTotal: ${formatRupiah(
    totalPrice
  )}${noteSection}\nMohon informasi selanjutnya. Terima kasih.`;
}

export function buildWhatsAppCheckoutUrl(
  contact: ContactInfo,
  message: string
): string {
  const base = isSafeExternalUrl(contact.whatsappLink)
    ? contact.whatsappLink.trim().replace(/\?.*$/, '')
    : 'https://wa.me/6281283115852';
  return `${base}?text=${encodeURIComponent(message)}`;
}

export interface ProductInputValidation {
  valid: boolean;
  error?: string;
  data?: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>;
}

export function validateProductInput(input: {
  name: string;
  tag: string;
  description: string;
  price: number | string;
  image: string;
  status: ProductStatus;
  featured: boolean;
}): ProductInputValidation {
  const name = sanitizePlainText(String(input.name ?? ''), 80);
  const tag = sanitizePlainText(String(input.tag ?? ''), 40) || 'Signature';
  const description = sanitizePlainText(String(input.description ?? ''), 300);
  const priceNum = Number(input.price);
  const status: ProductStatus =
    input.status === 'Tidak Tersedia' ? 'Tidak Tersedia' : 'Tersedia';
  const featured = Boolean(input.featured);
  const image = String(input.image ?? '').trim();

  if (name.length < 2) {
    return { valid: false, error: 'Nama produk minimal 2 karakter.' };
  }
  if (description.length < 5) {
    return { valid: false, error: 'Deskripsi produk minimal 5 karakter.' };
  }
  if (!Number.isFinite(priceNum) || !Number.isInteger(priceNum) || priceNum < 1000) {
    return {
      valid: false,
      error: 'Harga produk harus berupa bilangan bulat minimal Rp1.000 dan tidak boleh negatif.',
    };
  }
  if (priceNum > 10_000_000) {
    return { valid: false, error: 'Harga produk melebihi batas wajar (Rp10.000.000).' };
  }
  if (!isSafeImageUrl(image)) {
    return {
      valid: false,
      error: 'URL atau file gambar tidak valid. Gunakan gambar JPG/PNG/WebP atau tautan HTTPS.',
    };
  }

  return {
    valid: true,
    data: { name, tag, description, price: priceNum, image, status, featured },
  };
}

export function validateContactInput(input: ContactInfo): {
  valid: boolean;
  error?: string;
  data?: ContactInfo;
} {
  const whatsappNumber = sanitizePlainText(String(input.whatsappNumber ?? ''), 30);
  const whatsappLink = String(input.whatsappLink ?? '').trim();
  const instagramUsername = sanitizePlainText(String(input.instagramUsername ?? ''), 50);
  const instagramLink = String(input.instagramLink ?? '').trim();

  if (!/^[0-9+\-\s]{8,20}$/.test(whatsappNumber)) {
    return { valid: false, error: 'Format nomor WhatsApp tidak valid (8–20 angka).' };
  }
  if (!isSafeExternalUrl(whatsappLink) || !whatsappLink.startsWith('https://')) {
    return { valid: false, error: 'Link WhatsApp harus diawali https:// yang valid.' };
  }
  if (!/^@?[a-zA-Z0-9._]{2,40}$/.test(instagramUsername)) {
    return { valid: false, error: 'Username Instagram tidak valid.' };
  }
  if (!isSafeExternalUrl(instagramLink) || !instagramLink.startsWith('https://')) {
    return { valid: false, error: 'Link Instagram harus diawali https:// yang valid.' };
  }

  const normalizedIg = instagramUsername.startsWith('@')
    ? instagramUsername
    : `@${instagramUsername}`;

  return {
    valid: true,
    data: {
      whatsappNumber,
      whatsappLink,
      instagramUsername: normalizedIg,
      instagramLink,
    },
  };
}
