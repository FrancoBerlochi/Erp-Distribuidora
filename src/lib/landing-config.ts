'use client';

import useSWR, { mutate } from 'swr';
import { supabase } from './supabase';

export interface BannerSlide {
  id: string;
  is_active?: boolean; // Permite pausar/activar individualmente cada banner
  image_url: string;
  badge_text?: string; // Cuadrado rojo (1/4 de la imagen), ej. "3x2", "40% OFF"
  title?: string;
  link_url?: string;
  disclaimer_text?: string; // Aviso legal específico para esta imagen
}

export interface LandingConfig {
  carousel_active: boolean;
  slides: BannerSlide[];
  show_disclaimer: boolean;
  disclaimer_text?: string; // Global / fallback
  autoplay_interval: number; // en segundos (ej. 5)
}

export interface SaveConfigResult {
  success: boolean;
  cloudSynced: boolean;
  error?: string;
}

const STORAGE_KEY = 'landing_banner_config';
export const LANDING_CONFIG_CACHE_KEY = 'landing_config_cache';

// Configuración predeterminada inicial inspirada en la imagen del usuario
export const DEFAULT_LANDING_CONFIG: LandingConfig = {
  carousel_active: true,
  show_disclaimer: true,
  disclaimer_text: 'HASTA EL 08/09/2026. PARA MÁS INFORMACIÓN O LIMITACIONES APLICABLES CONSULTE EN SECCIÓN "SALÓN". EL CONSUMO EXCESIVO DE ALCOHOL ES PERJUDICIAL PARA LA SALUD. BEBER CON MODERACIÓN. PROHIBIDA SU VENTA A MENORES DE 18 AÑOS. VER LEGALES',
  autoplay_interval: 5,
  slides: [
    {
      id: 'slide-1',
      is_active: true,
      image_url: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=1200&q=80',
      badge_text: '3x2',
      title: 'en vinos finos, espumantes y champañas',
      link_url: '/ofertas',
      disclaimer_text: 'HASTA EL 08/09/2026. PARA MÁS INFORMACIÓN O LIMITACIONES APLICABLES CONSULTE EN SECCIÓN "SALÓN". EL CONSUMO EXCESIVO DE ALCOHOL ES PERJUDICIAL PARA LA SALUD. BEBER CON MODERACIÓN. PROHIBIDA SU VENTA A MENORES DE 18 AÑOS. VER LEGALES',
    },
    {
      id: 'slide-2',
      is_active: true,
      image_url: 'https://images.unsplash.com/photo-1584813470613-5b1c1cad3d69?auto=format&fit=crop&w=1200&q=80',
      badge_text: '40% OFF',
      title: 'Especial Limpieza Profesional y Hogar por Mayor',
      link_url: '/ofertas',
      disclaimer_text: 'VÁLIDO HASTA AGOTAR STOCK DE 500 UNIDADES. DESCUENTO APLICABLE EN EL TOTAL DE LA COMPRA.',
    },
    {
      id: 'slide-3',
      is_active: true,
      image_url: 'https://images.unsplash.com/photo-1621996346565-e3d5d6281691?auto=format&fit=crop&w=1200&q=80',
      badge_text: '2x1',
      title: 'Descuentos Exclusivos en Almacén y Bebidas',
      link_url: '/ofertas',
      disclaimer_text: 'PROMOCIÓN VÁLIDA PARA COMPRAS AL POR MAYOR EN PRODUCTOS SELECCIONADOS.',
    }
  ],
};

function getLocalConfig(): LandingConfig {
  if (typeof window === 'undefined') return DEFAULT_LANDING_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { 
        ...DEFAULT_LANDING_CONFIG, 
        ...parsed,
        slides: Array.isArray(parsed.slides) ? parsed.slides : DEFAULT_LANDING_CONFIG.slides
      };
    }
  } catch {
    // ignore
  }
  return DEFAULT_LANDING_CONFIG;
}

function setLocalConfig(config: LandingConfig) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // ignore
  }
}

/**
 * Comprueba si la tabla landing_config existe en Supabase y tiene permisos
 */
export async function checkLandingTableExists(): Promise<{ exists: boolean; code?: string; message?: string }> {
  try {
    const { error } = await supabase
      .from('landing_config')
      .select('id')
      .limit(1);

    if (error) {
      // Si la tabla no existe en la base de datos remota
      if (error.code === 'PGRST205' || error.message?.toLowerCase().includes('does not exist')) {
        return { exists: false, code: error.code, message: error.message };
      }

      // Si el error fue por expiración o token inválido en la sesión local, comprobar con la clave anónima pública
      try {
        const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://myyjdhijtknbxhdjhmmu.supabase.co'}/rest/v1/landing_config?select=id&limit=1`;
        const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_4NVPc5QMeeuWnZJnhikgow_72Imnjlp';
        const res = await fetch(url, {
          headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` }
        });
        if (res.ok) {
          return { exists: true };
        }
        if (res.status === 404) {
          return { exists: false, code: 'PGRST205', message: 'Tabla no encontrada en Supabase' };
        }
      } catch {}

      return { exists: false, code: error.code, message: error.message };
    }
    return { exists: true };
  } catch (err: any) {
    return { exists: false, message: err.message };
  }
}

async function fetchLandingConfig(): Promise<LandingConfig> {
  const local = getLocalConfig();
  try {
    const { data, error } = await supabase
      .from('landing_config')
      .select('config')
      .eq('id', 'main')
      .single();

    if (!error && data?.config) {
      const merged = { ...DEFAULT_LANDING_CONFIG, ...data.config };
      setLocalConfig(merged);
      return merged;
    }
  } catch {
    // Fallback silencioso si la tabla aún no existe en Supabase
  }
  return local;
}

/**
 * Hook reactivo para obtener la configuración del banner en la landing
 */
export function useLandingConfig() {
  const fallback = typeof window !== 'undefined' ? getLocalConfig() : DEFAULT_LANDING_CONFIG;

  const { data, isLoading, mutate: mutateConfig } = useSWR<LandingConfig>(
    LANDING_CONFIG_CACHE_KEY,
    fetchLandingConfig,
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

/**
 * Guarda la configuración tanto en Supabase como en localStorage y refresca la caché
 */
export async function saveLandingConfig(newConfig: LandingConfig): Promise<SaveConfigResult> {
  setLocalConfig(newConfig);
  let cloudSynced = false;
  let errorMsg: string | undefined;

  try {
    const { error } = await supabase
      .from('landing_config')
      .upsert({
        id: 'main',
        config: newConfig,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      errorMsg = error.message;
      console.warn('[LANDING_CONFIG] Error en Supabase:', error);
    } else {
      cloudSynced = true;
    }
  } catch (err: any) {
    errorMsg = err.message || 'Error de conexión';
    console.warn('[LANDING_CONFIG] Excepción al guardar:', err);
  }

  await mutate(LANDING_CONFIG_CACHE_KEY, newConfig, false);

  return {
    success: true,
    cloudSynced,
    error: errorMsg,
  };
}
