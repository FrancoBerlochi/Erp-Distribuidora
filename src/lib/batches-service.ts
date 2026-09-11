/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from './supabase';
import { generateUUID } from './formatters';
import { invalidateProductsCache } from './products-cache';

export type BatchStatus = 'active' | 'exhausted' | 'discarded';
export type BatchUrgency = 'expired' | 'critical' | 'warning' | 'ok';

export interface ProductBatch {
  id: string;
  product_id: string;
  batch_code: string;
  expiration_date: string; // YYYY-MM-DD
  manufacturing_date?: string;
  initial_quantity: number;
  current_quantity: number;
  cost_price?: number;
  location?: string;
  supplier_id?: string;
  notes?: string;
  status: BatchStatus;
  created_at?: string;
  updated_at?: string;
  products?: {
    id: string;
    name: string;
    category?: string;
    barcode?: string;
    price?: number;
    cost_price?: number;
    stock?: number;
    image_url_1?: string;
  };
}

export interface UrgencyConfig {
  id: BatchUrgency;
  label: string;
  shortLabel: string;
  badgeClass: string;
  borderClass: string;
  bgPulse: string;
  textColor: string;
}

export const BATCH_URGENCY_CONFIG: Record<BatchUrgency, UrgencyConfig> = {
  expired: {
    id: 'expired',
    label: 'Vencido (Baja Urgente)',
    shortLabel: 'Vencido',
    badgeClass: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300 dark:border-rose-800',
    borderClass: 'border-rose-500',
    bgPulse: 'bg-rose-500',
    textColor: 'text-rose-600 dark:text-rose-400',
  },
  critical: {
    id: 'critical',
    label: 'Crítico (< 15 días)',
    shortLabel: 'Crítico',
    badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800',
    borderClass: 'border-amber-500',
    bgPulse: 'bg-amber-500',
    textColor: 'text-amber-600 dark:text-amber-400',
  },
  warning: {
    id: 'warning',
    label: 'Alerta (< 30 días)',
    shortLabel: 'Por Vencer',
    badgeClass: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/60 dark:text-yellow-300 border-yellow-300 dark:border-yellow-800',
    borderClass: 'border-yellow-500',
    bgPulse: 'bg-yellow-500',
    textColor: 'text-yellow-600 dark:text-yellow-400',
  },
  ok: {
    id: 'ok',
    label: 'Óptimo (> 30 días)',
    shortLabel: 'Óptimo',
    badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
    borderClass: 'border-emerald-500',
    bgPulse: 'bg-emerald-500',
    textColor: 'text-emerald-600 dark:text-emerald-400',
  },
};

const LOCAL_BATCHES_KEY = 'distribuidora_local_batches';

/**
 * Calcula los días enteros restantes hasta la fecha de caducidad
 */
export function getDaysUntilExpiration(expirationDate: string): number {
  if (!expirationDate) return 999;
  const parts = expirationDate.split('-');
  if (parts.length < 3) return 999;

  const exp = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffTime = exp.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Clasifica la urgencia del lote en el semáforo preventivo
 */
export function getBatchUrgency(expirationDate: string): BatchUrgency {
  const days = getDaysUntilExpiration(expirationDate);
  if (days <= 0) return 'expired';
  if (days <= 15) return 'critical';
  if (days <= 30) return 'warning';
  return 'ok';
}

/**
 * Sugiere un código de lote automático estándar (ej: L-202609-482)
 */
export function suggestBatchCode(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const randomSuffix = Math.floor(100 + Math.random() * 900);
  return `L-${year}${month}-${randomSuffix}`;
}

/**
 * Carga todos los lotes registrados con datos de producto asociados
 */
export async function fetchProductBatches(): Promise<{ data: ProductBatch[]; error: any; isFallback: boolean }> {
  try {
    const { data, error } = await supabase
      .from('product_batches')
      .select('*, products(id, name, category, barcode, price, cost_price, stock, image_url_1)')
      .order('expiration_date', { ascending: true });

    if (error) {
      console.warn('[BATCHES_SERVICE] Error consultando tabla en Supabase, utilizando fallback local:', error.message);
      return { data: getStoredLocalBatches(), error, isFallback: true };
    }

    // Actualizar copia local en caso de desconexión
    if (typeof window !== 'undefined' && data) {
      localStorage.setItem(LOCAL_BATCHES_KEY, JSON.stringify(data));
    }

    return { data: data || [], error: null, isFallback: false };
  } catch (err: any) {
    console.warn('[BATCHES_SERVICE] Excepción al consultar lotes:', err);
    return { data: getStoredLocalBatches(), error: err, isFallback: true };
  }
}

/**
 * Obtiene los lotes almacenados en el storage local
 */
export function getStoredLocalBatches(): ProductBatch[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_BATCHES_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

/**
 * Registra un nuevo lote en Supabase y actualiza el stock general si se indica
 */
export async function createProductBatch(payload: {
  product_id: string;
  batch_code: string;
  expiration_date: string;
  manufacturing_date?: string;
  quantity: number;
  cost_price?: number;
  location?: string;
  notes?: string;
  updateProductStock?: boolean;
  productData?: any;
}): Promise<{ data: ProductBatch | null; error: any }> {
  const newId = generateUUID('batch');
  const batchRecord: ProductBatch = {
    id: newId,
    product_id: payload.product_id,
    batch_code: payload.batch_code.trim().toUpperCase(),
    expiration_date: payload.expiration_date,
    manufacturing_date: payload.manufacturing_date || undefined,
    initial_quantity: payload.quantity,
    current_quantity: payload.quantity,
    cost_price: payload.cost_price,
    location: payload.location?.trim() || undefined,
    notes: payload.notes?.trim() || undefined,
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    products: payload.productData,
  };

  try {
    // 1. Intentar insertar en Supabase
    const { data, error } = await supabase
      .from('product_batches')
      .insert([{
        id: newId,
        product_id: batchRecord.product_id,
        batch_code: batchRecord.batch_code,
        expiration_date: batchRecord.expiration_date,
        manufacturing_date: batchRecord.manufacturing_date || null,
        initial_quantity: batchRecord.initial_quantity,
        current_quantity: batchRecord.current_quantity,
        cost_price: batchRecord.cost_price || null,
        location: batchRecord.location || null,
        notes: batchRecord.notes || null,
        status: 'active'
      }])
      .select('*, products(id, name, category, barcode, price, cost_price, stock, image_url_1)')
      .single();

    // 2. Si se solicitó actualizar el stock general del producto
    if (payload.updateProductStock) {
      try {
        const { data: prod } = await supabase
          .from('products')
          .select('stock')
          .eq('id', payload.product_id)
          .single();

        if (prod) {
          const currentStock = Number(prod.stock) || 0;
          const newStock = currentStock + payload.quantity;
          await supabase.from('products').update({ stock: newStock }).eq('id', payload.product_id);
          await supabase.from('stock_movements').insert([{
            product_id: payload.product_id,
            type: 'restock',
            quantity: payload.quantity,
            previous_stock: currentStock,
            new_stock: newStock,
            reference_id: `LOTE-${batchRecord.batch_code}`,
          }]);
          invalidateProductsCache();
        }
      } catch (errStock) {
        console.warn('[BATCHES_SERVICE] Error sumando stock de lote a producto:', errStock);
      }
    }

    // Guardar en copia local
    const locals = getStoredLocalBatches();
    const resultItem = data || batchRecord;
    localStorage.setItem(LOCAL_BATCHES_KEY, JSON.stringify([resultItem, ...locals]));

    return { data: resultItem, error: error || null };
  } catch (err: any) {
    console.warn('[BATCHES_SERVICE] Error insertando en Supabase, guardando local:', err);
    const locals = getStoredLocalBatches();
    localStorage.setItem(LOCAL_BATCHES_KEY, JSON.stringify([batchRecord, ...locals]));
    return { data: batchRecord, error: null };
  }
}

/**
 * Registra una baja/merma formal por vencimiento, rotura o descarte
 */
export async function recordBatchWaste(
  batch: ProductBatch,
  quantityToDiscard: number,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const qty = Math.min(batch.current_quantity, Math.max(1, quantityToDiscard));
  const newBatchQty = batch.current_quantity - qty;
  const newBatchStatus: BatchStatus = newBatchQty <= 0 ? 'exhausted' : 'active';

  try {
    // 1. Actualizar el lote en Supabase
    await supabase
      .from('product_batches')
      .update({
        current_quantity: newBatchQty,
        status: newBatchStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', batch.id);

    // 2. Descontar el stock general del producto si está disponible
    const { data: prod } = await supabase
      .from('products')
      .select('stock')
      .eq('id', batch.product_id)
      .single();

    if (prod) {
      const curStock = Number(prod.stock) || 0;
      const updatedStock = Math.max(0, curStock - qty);

      await supabase.from('products').update({ stock: updatedStock }).eq('id', batch.product_id);

      // Registrar auditoría Kardex (tipo 'waste')
      await supabase.from('stock_movements').insert([{
        product_id: batch.product_id,
        type: 'waste',
        quantity: qty,
        previous_stock: curStock,
        new_stock: updatedStock,
        reference_id: `MERMA-LOTE-${batch.batch_code} (${reason})`,
      }]);

      invalidateProductsCache();
    }

    // Actualizar storage local
    const locals = getStoredLocalBatches().map((b) =>
      b.id === batch.id ? { ...b, current_quantity: newBatchQty, status: newBatchStatus } : b
    );
    localStorage.setItem(LOCAL_BATCHES_KEY, JSON.stringify(locals));

    return { success: true };
  } catch (err: any) {
    console.error('[BATCHES_SERVICE] Error registrando merma:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Aplica un descuento promocional de liquidación al producto para acelerar la rotación antes del vencimiento
 */
export async function applyClearanceDiscount(
  productId: string,
  discountPercentage: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('products')
      .update({
        discount_percentage: discountPercentage,
        promo_type: 'direct_discount',
        promo_discount_percentage: discountPercentage,
      })
      .eq('id', productId);

    if (error) throw error;
    invalidateProductsCache();
    return { success: true };
  } catch (err: any) {
    console.error('[BATCHES_SERVICE] Error aplicando oferta por vencimiento:', err);
    return { success: false, error: err.message };
  }
}
