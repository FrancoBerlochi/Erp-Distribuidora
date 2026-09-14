import { 
  ErpModuleId, 
  ErpPlanId, 
  ERP_MODULES, 
  ERP_PLANS, 
  ECOMMERCE_PUBLIC_ROUTES 
} from '@/config/modules';

export interface LicenseState {
  plan: ErpPlanId;
  modules: ErpModuleId[];
  isCustom: boolean;
  source: 'env' | 'storage' | 'default';
}

const STORAGE_KEY = 'erp_active_license';
const EVENT_KEY = 'erp_license_updated';

/**
 * Obtiene los módulos incluidos por defecto en las variables de entorno o fallback a 'enterprise'
 */
function getDefaultLicenseFromEnv(): { plan: ErpPlanId; modules: ErpModuleId[]; isCustom: boolean } {
  const envPlan = (process.env.NEXT_PUBLIC_ERP_PLAN || 'enterprise').toLowerCase() as ErpPlanId;
  const envModulesRaw = process.env.NEXT_PUBLIC_ERP_ACTIVE_MODULES;

  if (envModulesRaw) {
    const parsedModules = envModulesRaw
      .split(',')
      .map((m) => m.trim().toLowerCase())
      .filter((m): m is ErpModuleId => m in ERP_MODULES);

    return {
      plan: 'custom',
      modules: parsedModules,
      isCustom: true,
    };
  }

  const validPlan: ErpPlanId = envPlan in ERP_PLANS ? envPlan : 'enterprise';
  return {
    plan: validPlan,
    modules: ERP_PLANS[validPlan].includedModules,
    isCustom: validPlan === 'custom',
  };
}

/**
 * Obtiene la licencia actualmente activa (considerando simulación en localStorage en cliente)
 */
export function getActiveLicense(): LicenseState {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && Array.isArray(parsed.modules)) {
          const validModules = parsed.modules.filter((m: string): m is ErpModuleId => m in ERP_MODULES);
          const validPlan: ErpPlanId = parsed.plan in ERP_PLANS ? parsed.plan : 'custom';
          return {
            plan: validPlan,
            modules: validModules,
            isCustom: parsed.isCustom ?? (validPlan === 'custom'),
            source: 'storage',
          };
        }
      }
    } catch (err) {
      console.warn('[LICENSE] Error leyendo licencia de localStorage:', err);
    }
  }

  const def = getDefaultLicenseFromEnv();
  return {
    ...def,
    source: 'env',
  };
}

/**
 * Determina si un módulo específico está habilitado en la licencia activa
 */
export function isModuleEnabled(moduleId: ErpModuleId): boolean {
  const license = getActiveLicense();
  return license.modules.includes(moduleId);
}

/**
 * Identifica a qué módulo pertenece una ruta específica
 */
export function getModuleForRoute(pathname: string): ErpModuleId | null {
  // Rutas públicas de E-commerce
  if (ECOMMERCE_PUBLIC_ROUTES.some((route) => pathname === route || (route !== '/' && pathname.startsWith(route)))) {
    return 'ecommerce';
  }

  // Rutas de administración
  for (const [modId, meta] of Object.entries(ERP_MODULES)) {
    if (meta.routePrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
      return modId as ErpModuleId;
    }
  }

  return null;
}

/**
 * Valida si la ruta solicitada está permitida por la licencia activa
 */
export function isRouteAllowedByLicense(pathname: string): boolean {
  const moduleId = getModuleForRoute(pathname);
  if (!moduleId) {
    // Es una ruta Core (ej: /dashboard, /dashboard/products, /login)
    return true;
  }
  return isModuleEnabled(moduleId);
}

/**
 * Calcula el precio total estimado (en USD) de una selección de módulos o plan
 */
export function calculateEstimatedPrice(planId: ErpPlanId, selectedModules: ErpModuleId[]): number {
  if (planId !== 'custom' && ERP_PLANS[planId]) {
    return ERP_PLANS[planId].suggestedMonthlyPriceUSD;
  }

  // Si es custom, suma los módulos seleccionados
  const sumAddons = selectedModules.reduce((acc, modId) => {
    return acc + (ERP_MODULES[modId]?.suggestedAddonPriceUSD || 0);
  }, 0);

  // Base del ERP Core (incluido siempre)
  const coreBaseUSD = 20;
  return coreBaseUSD + sumAddons;
}

/**
 * Guarda una licencia simulada en localStorage y cookies (útil para demostraciones en vivo o testing)
 */
export function saveSimulatedLicense(planId: ErpPlanId, customModules?: ErpModuleId[]): void {
  if (typeof window === 'undefined') return;

  const modules = customModules ?? ERP_PLANS[planId]?.includedModules ?? [];
  const state = {
    plan: planId,
    modules,
    isCustom: planId === 'custom',
    updatedAt: new Date().toISOString(),
  };

  const jsonStr = JSON.stringify(state);
  localStorage.setItem(STORAGE_KEY, jsonStr);
  document.cookie = `erp_active_license=${encodeURIComponent(jsonStr)}; path=/; max-age=86400; SameSite=Lax`;
  window.dispatchEvent(new Event(EVENT_KEY));
}

/**
 * Restablece la licencia a los valores predeterminados de variables de entorno
 */
export function resetSimulatedLicense(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
  document.cookie = 'erp_active_license=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
  window.dispatchEvent(new Event(EVENT_KEY));
}

/**
 * Permite suscribirse reactivamente a cambios de licencia en el cliente
 */
export function subscribeToLicenseChanges(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handler = () => callback();
  window.addEventListener(EVENT_KEY, handler);
  window.addEventListener('storage', handler);

  return () => {
    window.removeEventListener(EVENT_KEY, handler);
    window.removeEventListener('storage', handler);
  };
}
