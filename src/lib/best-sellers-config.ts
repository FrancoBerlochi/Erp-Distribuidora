'use client';

import useSWR, { mutate } from 'swr';
import { supabase } from './supabase';

export interface BestSellersConfig {
  is_active: boolean;
  title: string;
  subtitle: string;
  badge_text: string;
  product_ids: string[];
}

const STORAGE_KEY = 'best_sellers_config';
export const BEST_SELLERS_CACHE_KEY = 'best_sellers_cache';

export const DEFAULT_BEST_SELLERS_CONFIG: BestSellersConfig = {
  is_active: true,
  title: 'Los Más Vendidos',
  subtitle: 'Descubre los artículos preferidos por nuestros clientes con la mejor calidad y precio',
  badge_text: 'TOP VENTAS',
  product_ids: [],
};

function getLocalConfig(): BestSellersConfig {
  if (typeof window === 'undefined') return DEFAULT_BEST_SELLERS_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return {
          is_active: parsed.is_active ?? true,
          title: parsed.title || DEFAULT_BEST_SELLERS_CONFIG.title,
          subtitle: parsed.subtitle ?? DEFAULT_BEST_SELLERS_CONFIG.subtitle,
          badge_text: parsed.badge_text || DEFAULT_BEST_SELLERS_CONFIG.badge_text,
          product_ids: Array.isArray(parsed.product_ids) ? parsed.product_ids : [],
        };
      }
    }
  } catch {
    // ignore
  }
  return DEFAULT_BEST_SELLERS_CONFIG;
}

function setLocalConfig(config: BestSellersConfig) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // ignore
  }
}

async function fetchBestSellersConfig(): Promise<BestSellersConfig> {
  const local = getLocalConfig();
  try {
    const { data, error } = await supabase
      .from('landing_config')
      .select('config')
      .eq('id', 'best_sellers')
      .single();

    if (!error && data?.config) {
      const merged: BestSellersConfig = {
        is_active: data.config.is_active ?? true,
        title: data.config.title || DEFAULT_BEST_SELLERS_CONFIG.title,
        subtitle: data.config.subtitle ?? DEFAULT_BEST_SELLERS_CONFIG.subtitle,
        badge_text: data.config.badge_text || DEFAULT_BEST_SELLERS_CONFIG.badge_text,
        product_ids: Array.isArray(data.config.product_ids) ? data.config.product_ids : [],
      };
      setLocalConfig(merged);
      return merged;
    }
  } catch {
    // Fallback silencioso si no existe en BD
  }
  return local;
}

/**
 * Hook reactivo para obtener la configuración de los productos más vendidos
 */
export function useBestSellersConfig() {
  const fallback = typeof window !== 'undefined' ? getLocalConfig() : DEFAULT_BEST_SELLERS_CONFIG;

  const { data, isLoading, mutate: mutateConfig } = useSWR<BestSellersConfig>(
    BEST_SELLERS_CACHE_KEY,
    fetchBestSellersConfig,
    {
      fallbackData: fallback,
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  );

  return {
    config: data || fallback,
    loading: isLoading && !data,
    mutateConfig,
  };
}

export interface SaveBestSellersResult {
  success: boolean;
  cloudSynced: boolean;
  error?: string;
}

/**
 * Guarda la configuración de más vendidos en Supabase, localStorage y refresca la caché
 */
export async function saveBestSellersConfig(newConfig: BestSellersConfig): Promise<SaveBestSellersResult> {
  setLocalConfig(newConfig);
  let cloudSynced = false;
  let errorMsg: string | undefined;

  try {
    const { error } = await supabase
      .from('landing_config')
      .upsert({
        id: 'best_sellers',
        config: newConfig,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      errorMsg = error.message;
      console.warn('[BEST_SELLERS] Error en Supabase:', error);
    } else {
      cloudSynced = true;
    }
  } catch (err: any) {
    errorMsg = err.message || 'Error de conexión';
    console.warn('[BEST_SELLERS] Excepción al guardar:', err);
  }

  await mutate(BEST_SELLERS_CACHE_KEY, newConfig, false);

  return {
    success: true,
    cloudSynced,
    error: errorMsg,
  };
}
