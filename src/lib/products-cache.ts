/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import useSWR, { mutate } from 'swr';
import { supabase } from './supabase';

export interface ProductItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  stock: number;
  discount_percentage?: number;
  image_url_1?: string;
  image_url_2?: string;
  category?: string;
  barcode?: string;
  cost_price?: number;
  min_stock?: number;
  supplier_id?: string;
  supplier_name?: string;
  wholesale_price?: number | null;
  wholesale_min_qty?: number | null;
  promo_type?: 'none' | '2x1' | '3x2' | '4x3' | 'second_unit_discount' | 'volume_discount' | null;
  promo_second_unit_discount?: number | null;
  promo_min_qty?: number | null;
  promo_discount_percentage?: number | null;
  created_at?: string;
  [key: string]: any;
}

export const CACHE_KEYS = {
  ALL_PRODUCTS: 'products_all',
  DISCOUNTED_PRODUCTS: 'products_discounted',
  ADMIN_PRODUCTS: 'products_admin',
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Columnas base de contingencia (por si la BD aún no corrió la migración de promociones o proveedores)
export const PRODUCT_COLUMNS_BASE = 'id, name, description, price, stock, discount_percentage, image_url_1, image_url_2, category, barcode, cost_price, min_stock, created_at';

// Columnas completas con listas mayoristas, promociones y proveedores
export const PRODUCT_COLUMNS_FULL = 'id, name, description, price, stock, discount_percentage, image_url_1, image_url_2, category, barcode, cost_price, min_stock, supplier_id, supplier_name, wholesale_price, wholesale_min_qty, promo_type, promo_second_unit_discount, promo_min_qty, promo_discount_percentage, created_at';

let activeProductColumns = PRODUCT_COLUMNS_FULL;

export function getProductColumns(): string {
  return activeProductColumns;
}

export function fallbackToBaseColumns() {
  console.warn('[PRODUCTS_CACHE] ⚠️ Degradando consultas a columnas base por incompatibilidad en Supabase.');
  activeProductColumns = PRODUCT_COLUMNS_BASE;
}

// Helper para leer caché persistente de localStorage de forma segura
export function getSavedCache(key: string): any[] | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const item = localStorage.getItem(`cache_${key}`);
    if (!item) return undefined;
    const parsed = JSON.parse(item);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : undefined;
  } catch {
    return undefined;
  }
}

// Helper para guardar caché persistente
export function setSavedCache(key: string, data: any) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`cache_${key}`, JSON.stringify(data));
    console.log(`[DISTRIBUIDORA-CACHE] 💾 Guardados ${data?.length || 0} productos en cache_${key}`);
  } catch (err: any) {
    console.warn(`[DISTRIBUIDORA-CACHE] ⚠️ No se pudo guardar en localStorage:`, err?.message);
  }
}

// Helper para optimizar imágenes en móviles (Cloudinary y Unsplash)
export function optimizeImageUrl(url: string | null | undefined, width = 500): string {
  if (!url) return '';
  if (url.includes('res.cloudinary.com') && url.includes('/upload/')) {
    return url.replace('/upload/', `/upload/f_auto,q_auto,w_${width}/`);
  }
  if (url.includes('images.unsplash.com')) {
    const cleanUrl = url.split('&w=')[0].split('?w=')[0];
    const separator = cleanUrl.includes('?') ? '&' : '?';
    return `${cleanUrl}${separator}auto=format&fit=crop&w=${width}&q=75`;
  }
  return url;
}

// Helper con timeout para evitar que una petición de Supabase se quede colgada indefinidamente
function withTimeout<T = any>(promise: Promise<T>, ms: number = 3000): Promise<T> {
  let timer: any;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`Demora en conexión con base de datos (timeout de ${ms}ms)`));
    }, ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timer);
  });
}

// Fetch directo vía REST HTTP nativo de PostgREST (bypassea cualquier deadlock del cliente Supabase)
async function fetchViaRestApi(endpointParams: string): Promise<any[]> {
  const url = `${SUPABASE_URL}/rest/v1/products?${endpointParams}`;
  console.log(`[DISTRIBUIDORA-REST] 🌐 Petición directa a Supabase REST...`);
  
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4500);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    const data = await res.json();
    console.log(`[DISTRIBUIDORA-REST] ✅ Éxito REST: ${Array.isArray(data) ? data.length : 0} productos recibidos.`);
    return Array.isArray(data) ? data : [];
  } catch (err: any) {
    clearTimeout(timer);
    console.warn(`[DISTRIBUIDORA-REST] ⚠️ Error en petición REST:`, err.message);
    throw err;
  }
}

// Fetchers con estrategia dual (Supabase SDK + Fallback REST Directo)
async function fetchAllProducts(): Promise<any[]> {
  console.log('[DISTRIBUIDORA] 🚀 Iniciando fetchAllProducts (stock > 0)...');
  const local = getSavedCache(CACHE_KEYS.ALL_PRODUCTS);
  if (local) {
    console.log(`[DISTRIBUIDORA] 💾 Cache local encontrada: ${local.length} productos.`);
  }

  // 1. Intentar SDK Supabase
  try {
    const t0 = Date.now();
    let cols = getProductColumns();
    let res: any = await withTimeout(
      supabase
        .from('products')
        .select(cols)
        .gt('stock', 0)
        .order('created_at', { ascending: false }) as any,
      3000
    );

    // Si falló por columna faltante (error 42703), degradar a base
    if (res.error && (res.error.code === '42703' || res.error.message?.includes('column'))) {
      console.warn('[DISTRIBUIDORA] ⚠️ Columna no soportada en Supabase. Reintentando con columnas base...');
      fallbackToBaseColumns();
      res = await withTimeout(
        supabase
          .from('products')
          .select(PRODUCT_COLUMNS_BASE)
          .gt('stock', 0)
          .order('created_at', { ascending: false }) as any,
        3000
      );
    }

    const duration = Date.now() - t0;

    if (!res.error && Array.isArray(res.data)) {
      console.log(`[DISTRIBUIDORA] ✅ Supabase SDK respondió en ${duration}ms con ${res.data.length} productos.`);
      setSavedCache(CACHE_KEYS.ALL_PRODUCTS, res.data);
      return res.data;
    }
    if (res.error) {
      console.warn(`[DISTRIBUIDORA] ⚠️ Supabase SDK retornó error:`, res.error.message);
    }
  } catch (err: any) {
    console.warn(`[DISTRIBUIDORA] ⚠️ SDK demoró o falló (${err.message}). Recurriendo a REST directo...`);
  }

  // 2. Fallback a REST directo
  try {
    let cols = getProductColumns();
    let params = `select=${encodeURIComponent(cols)}&stock=gt.0&order=created_at.desc`;
    let restData: any;
    try {
      restData = await fetchViaRestApi(params);
    } catch {
      if (cols !== PRODUCT_COLUMNS_BASE) {
        fallbackToBaseColumns();
        params = `select=${encodeURIComponent(PRODUCT_COLUMNS_BASE)}&stock=gt.0&order=created_at.desc`;
        restData = await fetchViaRestApi(params);
      }
    }

    if (Array.isArray(restData)) {
      setSavedCache(CACHE_KEYS.ALL_PRODUCTS, restData);
      return restData;
    }
  } catch (err: any) {
    console.error(`[DISTRIBUIDORA] ❌ Falló también REST directo en fetchAllProducts:`, err.message);
  }

  if (local && Array.isArray(local) && local.length > 0) {
    console.log(`[DISTRIBUIDORA] 🛡️ Usando caché previa de localStorage (${local.length} items).`);
    return local;
  }
  return [];
}

async function fetchDiscountedProducts(): Promise<any[]> {
  console.log('[DISTRIBUIDORA] 🚀 Iniciando fetchDiscountedProducts...');
  const local = getSavedCache(CACHE_KEYS.DISCOUNTED_PRODUCTS);
  if (local) {
    console.log(`[DISTRIBUIDORA] 💾 Cache local ofertas: ${local.length} productos.`);
  }

  // 1. Intentar SDK Supabase
  try {
    const t0 = Date.now();
    let cols = getProductColumns();
    let res: any = await withTimeout(
      supabase
        .from('products')
        .select(cols)
        .gt('stock', 0)
        .gt('discount_percentage', 0)
        .order('discount_percentage', { ascending: false }) as any,
      3000
    );

    if (res.error && (res.error.code === '42703' || res.error.message?.includes('column'))) {
      fallbackToBaseColumns();
      res = await withTimeout(
        supabase
          .from('products')
          .select(PRODUCT_COLUMNS_BASE)
          .gt('stock', 0)
          .gt('discount_percentage', 0)
          .order('discount_percentage', { ascending: false }) as any,
        3000
      );
    }

    const duration = Date.now() - t0;

    if (!res.error && Array.isArray(res.data)) {
      console.log(`[DISTRIBUIDORA] ✅ Supabase SDK ofertas respondió en ${duration}ms con ${res.data.length} productos.`);
      setSavedCache(CACHE_KEYS.DISCOUNTED_PRODUCTS, res.data);
      return res.data;
    }
    if (res.error) {
      console.warn(`[DISTRIBUIDORA] ⚠️ Supabase SDK ofertas error:`, res.error.message);
    }
  } catch (err: any) {
    console.warn(`[DISTRIBUIDORA] ⚠️ SDK ofertas demoró (${err.message}). Probando REST directo...`);
  }

  // 2. Fallback a REST directo
  try {
    let cols = getProductColumns();
    let params = `select=${encodeURIComponent(cols)}&stock=gt.0&discount_percentage=gt.0&order=discount_percentage.desc`;
    let restData: any;
    try {
      restData = await fetchViaRestApi(params);
    } catch {
      if (cols !== PRODUCT_COLUMNS_BASE) {
        fallbackToBaseColumns();
        params = `select=${encodeURIComponent(PRODUCT_COLUMNS_BASE)}&stock=gt.0&discount_percentage=gt.0&order=discount_percentage.desc`;
        restData = await fetchViaRestApi(params);
      }
    }

    if (Array.isArray(restData)) {
      setSavedCache(CACHE_KEYS.DISCOUNTED_PRODUCTS, restData);
      return restData;
    }
  } catch (err: any) {
    console.error(`[DISTRIBUIDORA] ❌ Falló REST ofertas:`, err.message);
  }

  if (local && Array.isArray(local) && local.length > 0) {
    return local;
  }
  return [];
}

async function fetchAdminProducts(): Promise<any[]> {
  console.log('[DISTRIBUIDORA] 🚀 Iniciando fetchAdminProducts (todos los productos)...');
  const local = getSavedCache(CACHE_KEYS.ADMIN_PRODUCTS);
  if (local) {
    console.log(`[DISTRIBUIDORA] 💾 Cache local admin: ${local.length} productos.`);
  }

  // 1. Intentar SDK Supabase
  try {
    const t0 = Date.now();
    let cols = getProductColumns();
    let res: any = await withTimeout(
      supabase
        .from('products')
        .select(cols)
        .order('created_at', { ascending: false }) as any,
      3000
    );

    if (res.error && (res.error.code === '42703' || res.error.message?.includes('column'))) {
      console.warn('[DISTRIBUIDORA] ⚠️ Error de columna en Supabase. Reintentando admin con columnas base...');
      fallbackToBaseColumns();
      res = await withTimeout(
        supabase
          .from('products')
          .select(PRODUCT_COLUMNS_BASE)
          .order('created_at', { ascending: false }) as any,
        3000
      );
    }

    const duration = Date.now() - t0;

    if (!res.error && Array.isArray(res.data)) {
      console.log(`[DISTRIBUIDORA] ✅ Supabase SDK admin respondió en ${duration}ms con ${res.data.length} productos.`);
      setSavedCache(CACHE_KEYS.ADMIN_PRODUCTS, res.data);
      return res.data;
    }
    if (res.error) {
      console.warn(`[DISTRIBUIDORA] ⚠️ Supabase SDK admin error:`, res.error.message);
    }
  } catch (err: any) {
    console.warn(`[DISTRIBUIDORA] ⚠️ SDK admin demoró o falló (${err.message}). Recurriendo a REST directo...`);
  }

  // 2. Fallback a REST directo
  try {
    let cols = getProductColumns();
    let params = `select=${encodeURIComponent(cols)}&order=created_at.desc`;
    let restData: any;
    try {
      restData = await fetchViaRestApi(params);
    } catch {
      if (cols !== PRODUCT_COLUMNS_BASE) {
        fallbackToBaseColumns();
        params = `select=${encodeURIComponent(PRODUCT_COLUMNS_BASE)}&order=created_at.desc`;
        restData = await fetchViaRestApi(params);
      }
    }

    if (Array.isArray(restData)) {
      setSavedCache(CACHE_KEYS.ADMIN_PRODUCTS, restData);
      return restData;
    }
  } catch (err: any) {
    console.error(`[DISTRIBUIDORA] ❌ Falló REST admin:`, err.message);
  }

  if (local && Array.isArray(local) && local.length > 0) {
    console.log(`[DISTRIBUIDORA] 🛡️ Usando caché local admin (${local.length} productos).`);
    return local;
  }

  console.warn('[DISTRIBUIDORA] ⚠️ No se pudieron obtener productos para admin ni por red ni por caché.');
  return [];
}

/**
 * Función para forzar la carga directa inmediata por REST (bypasseando cualquier traba de SWR o SDK)
 * y actualizando instantáneamente la memoria de la app.
 */
export async function forceDirectProductsFetch(type: 'admin' | 'all' | 'discounted' = 'admin'): Promise<any[]> {
  console.log(`[DISTRIBUIDORA] ⚡ FORZANDO CARGA DIRECTA REST para: ${type}`);
  let cols = getProductColumns();
  let params = `select=${encodeURIComponent(cols)}&order=created_at.desc`;
  let key = CACHE_KEYS.ADMIN_PRODUCTS;

  if (type === 'all') {
    params = `select=${encodeURIComponent(cols)}&stock=gt.0&order=created_at.desc`;
    key = CACHE_KEYS.ALL_PRODUCTS;
  } else if (type === 'discounted') {
    params = `select=${encodeURIComponent(cols)}&stock=gt.0&discount_percentage=gt.0&order=discount_percentage.desc`;
    key = CACHE_KEYS.DISCOUNTED_PRODUCTS;
  }

  let data: any[];
  try {
    data = await fetchViaRestApi(params);
  } catch {
    if (cols !== PRODUCT_COLUMNS_BASE) {
      fallbackToBaseColumns();
      if (type === 'all') {
        params = `select=${encodeURIComponent(PRODUCT_COLUMNS_BASE)}&stock=gt.0&order=created_at.desc`;
      } else if (type === 'discounted') {
        params = `select=${encodeURIComponent(PRODUCT_COLUMNS_BASE)}&stock=gt.0&discount_percentage=gt.0&order=discount_percentage.desc`;
      } else {
        params = `select=${encodeURIComponent(PRODUCT_COLUMNS_BASE)}&order=created_at.desc`;
      }
      data = await fetchViaRestApi(params);
    } else {
      data = [];
    }
  }

  if (Array.isArray(data)) {
    setSavedCache(key, data);
    await mutate(key, data, false);
    console.log(`[DISTRIBUIDORA] 🎯 Mutación SWR aplicada con éxito para ${key}: ${data.length} productos.`);
  }
  return data || [];
}

/**
 * Hook para obtener el catálogo completo activo (stock > 0).
 */
export function useProducts() {
  const fallback = typeof window !== 'undefined' ? getSavedCache(CACHE_KEYS.ALL_PRODUCTS) : undefined;

  const { data, error, isLoading, isValidating, mutate: mutateThis } = useSWR<any[]>(
    CACHE_KEYS.ALL_PRODUCTS,
    fetchAllProducts,
    {
      fallbackData: fallback,
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 15000,
      revalidateIfStale: true,
      errorRetryCount: 2,
    }
  );

  const productList: any[] = data || fallback || [];

  return {
    products: productList,
    loading: isLoading && productList.length === 0,
    isValidating,
    error,
    mutate: mutateThis,
  };
}

/**
 * Hook para obtener los productos en oferta con descuento activo.
 */
export function useDiscountedProducts() {
  const fallback = typeof window !== 'undefined' ? getSavedCache(CACHE_KEYS.DISCOUNTED_PRODUCTS) : undefined;

  const { data, error, isLoading, isValidating, mutate: mutateThis } = useSWR<any[]>(
    CACHE_KEYS.DISCOUNTED_PRODUCTS,
    fetchDiscountedProducts,
    {
      fallbackData: fallback,
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 15000,
      revalidateIfStale: true,
      errorRetryCount: 2,
    }
  );

  const productList: any[] = data || fallback || [];

  return {
    products: productList,
    loading: isLoading && productList.length === 0,
    isValidating,
    error,
    mutate: mutateThis,
  };
}

/**
 * Hook para el panel de administración (todos los productos, incluyendo stock 0).
 */
export function useAdminProducts() {
  const fallback = typeof window !== 'undefined' ? getSavedCache(CACHE_KEYS.ADMIN_PRODUCTS) : undefined;

  const { data, error, isLoading, isValidating, mutate: mutateThis } = useSWR<any[]>(
    CACHE_KEYS.ADMIN_PRODUCTS,
    fetchAdminProducts,
    {
      fallbackData: fallback,
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 10000,
      revalidateIfStale: true,
      errorRetryCount: 2,
    }
  );

  const productList: any[] = data || fallback || [];

  return {
    products: productList,
    loading: isLoading && productList.length === 0,
    isValidating,
    error,
    mutate: mutateThis,
  };
}

/**
 * Invalida y refresca instantáneamente toda la caché de productos bajo demanda.
 */
export async function invalidateProductsCache() {
  console.log('[DISTRIBUIDORA] 🔄 Invalidando caché de productos...');
  await Promise.all([
    mutate(CACHE_KEYS.ALL_PRODUCTS),
    mutate(CACHE_KEYS.DISCOUNTED_PRODUCTS),
    mutate(CACHE_KEYS.ADMIN_PRODUCTS),
  ]);
}

