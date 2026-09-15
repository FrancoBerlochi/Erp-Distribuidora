export interface DolarOficialResponse {
  moneda: string;
  casa: string;
  nombre: string;
  compra: number;
  venta: number;
  fechaActualizacion: string;
  source?: 'api' | 'fallback';
}

// Fallback preventivo si la API externa no responde
const FALLBACK_DOLAR_VENTA = 1080;
const FALLBACK_DOLAR_COMPRA = 1040;

let cachedDolar: { data: DolarOficialResponse; expiresAt: number } | null = null;
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutos de caché

/**
 * Consulta la cotización del Dólar Oficial desde Dolar API (con caché y fallback)
 */
export async function getOfficialDollarRate(): Promise<DolarOficialResponse> {
  const now = Date.now();
  if (cachedDolar && cachedDolar.expiresAt > now) {
    return cachedDolar.data;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch('https://dolarapi.com/v1/dolares/oficial', {
      signal: controller.signal,
      next: { revalidate: 900 }, // 15 minutos en Next.js fetch cache
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Dolar API devolvió status ${res.status}`);
    }

    const data = await res.json();
    if (typeof data.venta === 'number' && data.venta > 0) {
      const result: DolarOficialResponse = {
        moneda: data.moneda || 'USD',
        casa: data.casa || 'oficial',
        nombre: data.nombre || 'Oficial',
        compra: data.compra || data.venta,
        venta: data.venta,
        fechaActualizacion: data.fechaActualizacion || new Date().toISOString(),
        source: 'api',
      };

      cachedDolar = {
        data: result,
        expiresAt: now + CACHE_TTL_MS,
      };

      return result;
    }
    throw new Error('Respuesta inválida de Dolar API');
  } catch (err: any) {
    console.warn('[DOLAR_API] No se pudo obtener cotización oficial en vivo, usando fallback:', err.message);

    return {
      moneda: 'USD',
      casa: 'oficial',
      nombre: 'Oficial (Referencia)',
      compra: FALLBACK_DOLAR_COMPRA,
      venta: FALLBACK_DOLAR_VENTA,
      fechaActualizacion: new Date().toISOString(),
      source: 'fallback',
    };
  }
}

/**
 * Convierte un importe en USD a Pesos Argentinos (ARS) redondeado
 */
export function convertUsdToArs(amountUSD: number, rateVenta: number): number {
  return Math.round(amountUSD * rateVenta);
}
