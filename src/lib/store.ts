import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { calculatePromoPricing, PromoType } from './promotions-engine';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  discount_percentage: number;
  image_url: string;
  quantity: number;
  stock: number;
  wholesale_price?: number | null;
  wholesale_min_qty?: number | null;
  promo_type?: PromoType | string | null;
  promo_second_unit_discount?: number | null;
  promo_min_qty?: number | null;
  promo_discount_percentage?: number | null;
}

export function isWholesaleApplied(item: CartItem): boolean {
  const minQty = item.wholesale_min_qty && item.wholesale_min_qty > 0 ? item.wholesale_min_qty : 6;
  return Boolean(
    item.wholesale_price &&
    Number(item.wholesale_price) > 0 &&
    item.quantity >= minQty
  );
}

export function getItemPromoCalculation(item: CartItem) {
  if (isWholesaleApplied(item) || !item.promo_type || item.promo_type === 'none') {
    return null;
  }
  return calculatePromoPricing(Number(item.price) || 0, item.quantity, {
    promo_type: item.promo_type as PromoType,
    promo_second_unit_discount: item.promo_second_unit_discount,
    promo_min_qty: item.promo_min_qty,
    promo_discount_percentage: item.promo_discount_percentage,
  });
}

export function getItemLineTotal(item: CartItem): number {
  if (isWholesaleApplied(item)) {
    return Number(item.wholesale_price) * item.quantity;
  }
  const promo = getItemPromoCalculation(item);
  if (promo && promo.isPromoActive) {
    return promo.totalToPay;
  }
  return (Number(item.price) || 0) * item.quantity;
}

export function getItemEffectiveUnitPrice(item: CartItem): number {
  if (item.quantity <= 0) return Number(item.price) || 0;
  return getItemLineTotal(item) / item.quantity;
}

export function getCartTotalAmount(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + getItemLineTotal(item), 0);
}

interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) => {
        const currentItems = get().items;
        const existingItem = currentItems.find((i) => i.id === item.id);
        const qtyToAdd = item.quantity && item.quantity > 0 ? item.quantity : 1;
        
        if (existingItem) {
          const newQty = Math.min(existingItem.quantity + qtyToAdd, item.stock);
          set({
            items: currentItems.map((i) => 
              i.id === item.id ? { ...i, quantity: newQty } : i
            )
          });
        } else {
          const initialQty = Math.min(qtyToAdd, item.stock);
          set({ items: [...currentItems, { ...item, quantity: initialQty }] });
        }
      },
      removeItem: (id) => {
        set({ items: get().items.filter((i) => i.id !== id) });
      },
      updateQuantity: (id, quantity) => {
        if (quantity < 1) return;
        const item = get().items.find(i => i.id === id);
        if (item && quantity > item.stock) return;
        
        set({
          items: get().items.map((i) => 
            i.id === id ? { ...i, quantity } : i
          )
        });
      },
      clearCart: () => set({ items: [] }),
      getTotalItems: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },
    }),
    {
      name: 'distribuidora-cart',
    }
  )
);
