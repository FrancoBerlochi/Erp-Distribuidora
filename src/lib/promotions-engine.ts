/* eslint-disable @typescript-eslint/no-explicit-any */

export type PromoType = 'none' | '2x1' | '3x2' | '4x3' | 'second_unit_discount' | 'volume_discount';

export interface PromotionConfig {
  promo_type?: PromoType | null;
  promo_second_unit_discount?: number | null; // Ej: 50, 70, 80 (% de descuento en la 2da unidad)
  promo_min_qty?: number | null;              // Ej: a partir de 3 unidades
  promo_discount_percentage?: number | null;  // Ej: 15 (% de descuento llevando min_qty)
}

export interface PromoBadgeInfo {
  text: string;
  shortText: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  description: string;
}

export interface PromoCalculation {
  regularUnitPrice: number;
  baseUnitPrice: number;
  quantity: number;
  subtotalGross: number;
  totalToPay: number;
  discountAmount: number;
  effectiveUnitPrice: number;
  isPromoActive: boolean;
  freeUnits: number;
  appliedDescription: string | null;
  promoBadge: PromoBadgeInfo | null;
  costWarning?: string | null;
}

/**
 * Devuelve la etiqueta visual e información amigable de la promoción configurada
 */
export function getPromoBadgeInfo(config: PromotionConfig): PromoBadgeInfo | null {
  const type = config.promo_type || 'none';

  if (type === 'none') return null;

  if (type === '2x1') {
    return {
      text: 'Promo 2x1 (Llevá 2, Pagá 1)',
      shortText: '2x1',
      bgClass: 'bg-amber-100 dark:bg-amber-950/80',
      textClass: 'text-amber-800 dark:text-amber-300',
      borderClass: 'border-amber-300 dark:border-amber-700',
      description: 'Llevando 2 unidades, la 2da es 100% gratis.',
    };
  }

  if (type === '3x2') {
    return {
      text: 'Promo 3x2 (Llevá 3, Pagá 2)',
      shortText: '3x2',
      bgClass: 'bg-emerald-100 dark:bg-emerald-950/80',
      textClass: 'text-emerald-800 dark:text-emerald-300',
      borderClass: 'border-emerald-300 dark:border-emerald-700',
      description: 'Llevando 3 unidades, la 3ra es 100% gratis.',
    };
  }

  if (type === '4x3') {
    return {
      text: 'Promo 4x3 (Llevá 4, Pagá 3)',
      shortText: '4x3',
      bgClass: 'bg-teal-100 dark:bg-teal-950/80',
      textClass: 'text-teal-800 dark:text-teal-300',
      borderClass: 'border-teal-300 dark:border-teal-700',
      description: 'Llevando 4 unidades, la 4ta es 100% gratis.',
    };
  }

  if (type === 'second_unit_discount') {
    const pct = config.promo_second_unit_discount || 70;
    return {
      text: `${pct}% OFF en 2da Unidad`,
      shortText: `2da al ${pct}%`,
      bgClass: 'bg-blue-100 dark:bg-blue-950/80',
      textClass: 'text-blue-800 dark:text-blue-300',
      borderClass: 'border-blue-300 dark:border-blue-700',
      description: `Llevando de a pares, la segunda unidad tiene ${pct}% de descuento.`,
    };
  }

  if (type === 'volume_discount') {
    const minQty = config.promo_min_qty || 3;
    const pct = config.promo_discount_percentage || 15;
    return {
      text: `${pct}% OFF llevando +${minQty} u.`,
      shortText: `+${minQty}u ${pct}% OFF`,
      bgClass: 'bg-purple-100 dark:bg-purple-950/80',
      textClass: 'text-purple-800 dark:text-purple-300',
      borderClass: 'border-purple-300 dark:border-purple-700',
      description: `A partir de ${minQty} unidades se aplica un ${pct}% de descuento en total.`,
    };
  }

  return null;
}

/**
 * Realiza el cálculo matemático estricto de la promoción según la cantidad de unidades
 */
export function calculatePromoPricing(
  unitPrice: number,
  quantity: number,
  config: PromotionConfig,
  costPrice?: number
): PromoCalculation {
  const cleanPrice = Math.max(0, Number(unitPrice) || 0);
  const qty = Math.max(0, Number(quantity) || 0);
  const subtotalGross = qty * cleanPrice;

  const type = config.promo_type || 'none';
  const badge = getPromoBadgeInfo(config);

  let discountAmount = 0;
  let freeUnits = 0;
  let appliedDescription: string | null = null;
  let isPromoActive = false;

  if (qty > 0) {
    if (type === '2x1') {
      freeUnits = Math.floor(qty / 2);
      if (freeUnits > 0) {
        discountAmount = freeUnits * cleanPrice;
        isPromoActive = true;
        appliedDescription = `Promo 2x1: ${freeUnits} ${freeUnits === 1 ? 'unidad bonificada' : 'unidades bonificadas'}`;
      }
    } else if (type === '3x2') {
      freeUnits = Math.floor(qty / 3);
      if (freeUnits > 0) {
        discountAmount = freeUnits * cleanPrice;
        isPromoActive = true;
        appliedDescription = `Promo 3x2: ${freeUnits} ${freeUnits === 1 ? 'unidad bonificada' : 'unidades bonificadas'}`;
      }
    } else if (type === '4x3') {
      freeUnits = Math.floor(qty / 4);
      if (freeUnits > 0) {
        discountAmount = freeUnits * cleanPrice;
        isPromoActive = true;
        appliedDescription = `Promo 4x3: ${freeUnits} ${freeUnits === 1 ? 'unidad bonificada' : 'unidades bonificadas'}`;
      }
    } else if (type === 'second_unit_discount') {
      const pct = config.promo_second_unit_discount || 70;
      const pairs = Math.floor(qty / 2);
      if (pairs > 0) {
        discountAmount = pairs * (cleanPrice * (pct / 100));
        isPromoActive = true;
        appliedDescription = `Descuento en 2da unidad (${pct}% OFF en ${pairs} ${pairs === 1 ? 'unidad' : 'unidades'})`;
      }
    } else if (type === 'volume_discount') {
      const minQty = config.promo_min_qty || 3;
      const pct = config.promo_discount_percentage || 15;
      if (qty >= minQty) {
        discountAmount = subtotalGross * (pct / 100);
        isPromoActive = true;
        appliedDescription = `Descuento por cantidad (${pct}% OFF por llevar ${qty} u.)`;
      }
    }
  }

  const totalToPay = Math.max(0, subtotalGross - discountAmount);
  const effectiveUnitPrice = qty > 0 ? totalToPay / qty : cleanPrice;

  // Alerta preventiva de margen
  let costWarning: string | null = null;
  if (costPrice && costPrice > 0 && isPromoActive && effectiveUnitPrice < costPrice) {
    const diff = costPrice - effectiveUnitPrice;
    costWarning = `Alerta: El precio efectivo con promo ($${effectiveUnitPrice.toFixed(2)}) queda por debajo del costo ($${costPrice.toFixed(2)}) en $${diff.toFixed(2)} por unidad.`;
  }

  return {
    regularUnitPrice: cleanPrice,
    baseUnitPrice: cleanPrice,
    quantity: qty,
    subtotalGross,
    totalToPay,
    discountAmount,
    effectiveUnitPrice,
    isPromoActive,
    freeUnits,
    appliedDescription,
    promoBadge: badge,
    costWarning,
  };
}

/**
 * Simulador preventivo para formularios de producto (alta y edición)
 * Genera ejemplos numéricos concretos para que el comerciante valide antes de guardar.
 */
export function simulatePromoImpact(
  unitPrice: number,
  costPrice: number,
  config: PromotionConfig
) {
  const type = config.promo_type || 'none';
  if (type === 'none') return null;

  const testQuantities: number[] = [];
  if (type === '2x1') testQuantities.push(1, 2, 3, 4);
  else if (type === '3x2') testQuantities.push(1, 2, 3, 6);
  else if (type === '4x3') testQuantities.push(1, 3, 4, 8);
  else if (type === 'second_unit_discount') testQuantities.push(1, 2, 3, 4);
  else if (type === 'volume_discount') {
    const min = config.promo_min_qty || 3;
    testQuantities.push(1, Math.max(1, min - 1), min, min + 2);
  }

  const uniqueQtys = Array.from(new Set(testQuantities)).sort((a, b) => a - b);

  const simulationRows = uniqueQtys.map((qty) => {
    const calc = calculatePromoPricing(unitPrice, qty, config, costPrice);
    const regularTotal = qty * unitPrice;
    const savingsPercent = regularTotal > 0 ? Math.round((calc.discountAmount / regularTotal) * 100) : 0;
    const unitMargin = calc.effectiveUnitPrice > 0 && costPrice > 0
      ? Math.round(((calc.effectiveUnitPrice - costPrice) / calc.effectiveUnitPrice) * 100)
      : null;

    return {
      quantity: qty,
      regularTotal,
      totalToPay: calc.totalToPay,
      discountAmount: calc.discountAmount,
      effectiveUnitPrice: calc.effectiveUnitPrice,
      savingsPercent,
      isPromoActive: calc.isPromoActive,
      unitMargin,
      isBelowCost: costPrice > 0 && calc.effectiveUnitPrice < costPrice,
    };
  });

  const hasLossRisk = simulationRows.some((r) => r.isBelowCost);

  return {
    rows: simulationRows,
    hasLossRisk,
  };
}
