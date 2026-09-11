'use client';

import useSWR, { mutate } from 'swr';
import { supabase } from './supabase';

export interface CategoryShowcase {
  id: string;
  category: string;             // Categoría vinculada (ej. "Verdulería", "Pescadería", "Limpieza")
  is_active: boolean;           // ON / OFF
  badge_discount: string;       // Ej. "15%" o "20%"
  badge_tag: string;            // Ej. "exclusivo online"
  title: string;                // Ej. "en seleccionados de verdulería"
  banner_image_url: string;     // Imagen temática del banner
  disclaimer_text: string;      // Legal inferior específico de la promo
  discount_percentage: number;  // Porcentaje numérico (ej. 15) para mostrar precio promo
}

const STORAGE_KEY = 'category_showcases_config';
export const CATEGORY_SHOWCASES_CACHE_KEY = 'category_showcases_cache';

export const DEFAULT_CATEGORY_SHOWCASES: CategoryShowcase[] = [
  {
    id: 'showcase-1',
    category: 'Bebidas',
    is_active: true,
    badge_discount: '15%',
    badge_tag: 'exclusivo online',
    title: 'en seleccionados de bebidas y refrescos',
    banner_image_url: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=1200&q=80',
    disclaimer_text: 'HASTA EL 07/09/2026. PARA MÁS INFORMACIÓN Y CONDICIONES APLICABLES CONSULTAR EN LEGALES SECCIÓN "BEBIDAS". VER LEGALES',
    discount_percentage: 15,
  },
  {
    id: 'showcase-2',
    category: 'Snacks',
    is_active: true,
    badge_discount: '20%',
    badge_tag: 'exclusivo online',
    title: 'en toda nuestra línea de snacks y aperitivos',
    banner_image_url: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&w=1200&q=80',
    disclaimer_text: 'HASTA EL 30/09/2026. PROMOCIÓN VÁLIDA EN SNACKS SELECCIONADOS HASTA AGOTAR STOCK. VER LEGALES',
    discount_percentage: 20,
  }
];

function getLocalShowcases(): CategoryShowcase[] {
  if (typeof window === 'undefined') return DEFAULT_CATEGORY_SHOWCASES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  return DEFAULT_CATEGORY_SHOWCASES;
}

function setLocalShowcases(showcases: CategoryShowcase[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(showcases));
  } catch {
    // ignore
  }
}

async function fetchCategoryShowcases(): Promise<CategoryShowcase[]> {
  const local = getLocalShowcases();
  try {
    const { data, error } = await supabase
      .from('landing_config')
      .select('config')
      .eq('id', 'category_showcases')
      .single();

    if (!error && data?.config && Array.isArray(data.config)) {
      setLocalShowcases(data.config);
      return data.config;
    }
  } catch {
    // Fallback silencioso si la tabla no está creada aún
  }
  return local;
}

/**
 * Hook reactivo para obtener las secciones de categorías destacadas
 */
export function useCategoryShowcases() {
  const fallback = typeof window !== 'undefined' ? getLocalShowcases() : DEFAULT_CATEGORY_SHOWCASES;

  const { data, isLoading, mutate: mutateShowcases } = useSWR<CategoryShowcase[]>(
    CATEGORY_SHOWCASES_CACHE_KEY,
    fetchCategoryShowcases,
    {
      fallbackData: fallback,
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  );

  return {
    showcases: data || fallback,
    loading: isLoading && !data,
    mutateShowcases,
  };
}

export interface SaveCategoriesResult {
  success: boolean;
  cloudSynced: boolean;
  error?: string;
}

/**
 * Guarda las secciones tanto en Supabase como en localStorage y refresca la caché
 */
export async function saveCategoryShowcases(newShowcases: CategoryShowcase[]): Promise<SaveCategoriesResult> {
  setLocalShowcases(newShowcases);
  let cloudSynced = false;
  let errorMsg: string | undefined;

  try {
    const { error } = await supabase
      .from('landing_config')
      .upsert({
        id: 'category_showcases',
        config: newShowcases,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      errorMsg = error.message;
      console.warn('[CATEGORY_SHOWCASES] Error en Supabase:', error);
    } else {
      cloudSynced = true;
    }
  } catch (err: any) {
    errorMsg = err.message || 'Error de conexión';
    console.warn('[CATEGORY_SHOWCASES] Excepción al guardar:', err);
  }

  await mutate(CATEGORY_SHOWCASES_CACHE_KEY, newShowcases, false);

  return {
    success: true,
    cloudSynced,
    error: errorMsg,
  };
}
