/**
 * Utilidades centralizadas de formato de moneda, fecha y generadores de identificadores únicos
 */

/**
 * Formatea un monto numérico a formato monetario argentino ($ 1.250,50)
 */
export function formatCurrency(amount: number | null | undefined): string {
  const val = Number(amount) || 0;
  return `$${val.toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Formatea una fecha a formato local argentino (DD/MM/YYYY)
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Formatea una fecha y hora local (DD/MM/YYYY HH:mm)
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '-';
  return `${d.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })} ${d.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

/**
 * Genera un identificador único seguro compatible con Web Crypto API y fallback
 */
export function generateUUID(prefix?: string): string {
  const p = prefix ? `${prefix}-` : '';
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${p}${crypto.randomUUID()}`;
  }
  return `${p}${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
