/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import { 
  Sliders, 
  Check, 
  Sparkles, 
  Layers, 
  RotateCcw, 
  DollarSign, 
  ShieldCheck, 
  Info, 
  ScanBarcode, 
  Banknote, 
  Users, 
  Truck, 
  CalendarClock, 
  Tag, 
  Globe, 
  LineChart, 
  BarChart3, 
  Database,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { 
  ERP_MODULES, 
  ERP_PLANS, 
  ErpModuleId, 
  ErpPlanId, 
  ErpPlanDefinition 
} from '@/config/modules';
import { 
  getActiveLicense, 
  saveSimulatedLicense, 
  resetSimulatedLicense, 
  calculateEstimatedPrice,
  LicenseState 
} from '@/lib/license-service';
import { toast } from 'react-toastify';

const MODULE_ICONS: Record<string, any> = {
  ScanBarcode,
  Banknote,
  Users,
  Truck,
  CalendarClock,
  Tag,
  Globe,
  LineChart,
  BarChart3,
  Database,
};

export default function LicenciaDashboardPage() {
  const [license, setLicense] = useState<LicenseState | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<ErpPlanId>('enterprise');
  const [selectedModules, setSelectedModules] = useState<ErpModuleId[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const active = getActiveLicense();
    setLicense(active);
    setSelectedPlan(active.plan);
    setSelectedModules(active.modules);
  }, []);

  const handleSelectPlan = (planId: ErpPlanId) => {
    setSelectedPlan(planId);
    if (planId !== 'custom') {
      setSelectedModules(ERP_PLANS[planId].includedModules);
    }
  };

  const handleToggleModule = (moduleId: ErpModuleId) => {
    let newModules: ErpModuleId[];
    if (selectedModules.includes(moduleId)) {
      newModules = selectedModules.filter((m) => m !== moduleId);
    } else {
      newModules = [...selectedModules, moduleId];
    }
    setSelectedModules(newModules);
    setSelectedPlan('custom');
  };

  const handleApplyLicense = () => {
    saveSimulatedLicense(selectedPlan, selectedModules);
    const updated = getActiveLicense();
    setLicense(updated);
    toast.success(`✨ Licencia actualizada a "${ERP_PLANS[selectedPlan]?.name || 'Plan Custom'}". El menú y rutas se han reconfigurado.`);
  };

  const handleReset = () => {
    resetSimulatedLicense();
    const updated = getActiveLicense();
    setLicense(updated);
    setSelectedPlan(updated.plan);
    setSelectedModules(updated.modules);
    toast.info('🔄 Licencia restaurada a los valores predeterminados del servidor.');
  };

  if (!mounted || !license) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-gray-500">
        Cargando configuración de módulos...
      </div>
    );
  }

  const estimatedMonthly = calculateEstimatedPrice(selectedPlan, selectedModules);
  const isModified = JSON.stringify(license.modules.sort()) !== JSON.stringify(selectedModules.sort()) || license.plan !== selectedPlan;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary mb-2">
            <Sliders className="w-3.5 h-3.5" />
            Configuración Modular y Licencias
          </div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
            Gestión de Planes y Módulos
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Adapta las funcionalidades habilitadas para cada cliente y simula precios de suscripción en vivo.
          </p>
        </div>

        {/* Estado actual y botón reset */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-xs font-bold text-gray-700 dark:text-gray-300 transition-colors cursor-pointer"
            title="Restaurar a variables de entorno del servidor"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restablecer Servidor
          </button>
          
          <button
            onClick={handleApplyLicense}
            disabled={!isModified}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer ${
              isModified
                ? 'bg-primary text-white hover:bg-blue-700 shadow-primary/20 scale-[1.02]'
                : 'bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
            }`}
          >
            <Check className="w-4 h-4" />
            Aplicar Configuración
          </button>
        </div>
      </div>

      {/* Tarjeta de Resumen y Cotizador Activo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Plan Seleccionado</span>
              <span className={`text-xs font-black px-3 py-1 rounded-full uppercase ${ERP_PLANS[selectedPlan]?.badgeClass || 'bg-gray-100 text-gray-700'}`}>
                {ERP_PLANS[selectedPlan]?.name || 'Plan Custom'}
              </span>
            </div>

            <div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white">
                {ERP_PLANS[selectedPlan]?.name || 'Configuración A Medida'}
              </h2>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                {ERP_PLANS[selectedPlan]?.description || 'Combinación personalizada de módulos seleccionados manualmente para este cliente.'}
              </p>
            </div>

            {/* Módulos activos en chips */}
            <div className="pt-2">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
                Módulos Activos ({selectedModules.length} de {Object.keys(ERP_MODULES).length}):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {selectedModules.map((modId) => (
                  <span
                    key={modId}
                    className="inline-flex items-center gap-1.5 text-xs font-bold bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 px-3 py-1 rounded-lg border border-gray-200 dark:border-gray-700"
                  >
                    <Check className="w-3 h-3 text-emerald-500" />
                    {ERP_MODULES[modId]?.name}
                  </span>
                ))}
                {selectedModules.length === 0 && (
                  <span className="text-xs text-amber-600 font-medium italic">
                    Solo Core base (Productos y Dashboard)
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs text-gray-500">
            <span>Core Base (Productos, Inventario y Auth): <strong className="text-emerald-600">Base $19 USD/mes incluida</strong></span>
            {license.source === 'storage' && (
              <span className="text-blue-600 font-semibold flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Modo Simulación Local Activo
              </span>
            )}
          </div>
        </div>

        {/* Tarjeta de Cotización Estimada */}
        <div className="p-6 rounded-3xl bg-gradient-to-br from-gray-900 to-gray-950 text-white shadow-xl flex flex-col justify-between border border-gray-800">
          <div>
            <div className="flex items-center justify-between text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">
              <span>Cotizador de Venta</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex items-baseline gap-1 my-3">
              <span className="text-4xl font-black text-emerald-400">
                ${estimatedMonthly}
              </span>
              <span className="text-xs font-bold text-gray-400 uppercase">
                USD / mes
              </span>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed">
              Precio de suscripción mensual sugerido para este cliente según los módulos contratados.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-800/80 space-y-2 text-xs">
            <div className="flex justify-between text-gray-400">
              <span>Costo Base Core:</span>
              <span className="font-bold text-white">$19 USD/mes</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Módulos adicionales:</span>
              <span className="font-bold text-white">{selectedModules.length}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>E-commerce público:</span>
              <span className={selectedModules.includes('ecommerce') ? 'text-emerald-400 font-bold' : 'text-gray-500'}>
                {selectedModules.includes('ecommerce') ? 'Habilitado' : 'Deshabilitado'}
              </span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Trazabilidad FEFO & Lotes:</span>
              <span className={selectedModules.includes('vencimientos') ? 'text-emerald-400 font-bold' : 'text-gray-500'}>
                {selectedModules.includes('vencimientos') ? 'Habilitado' : 'No incluido'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Selector de Planes Base */}
      <div className="space-y-4">
        <h2 className="text-xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
          <Layers className="w-5 h-5 text-primary" />
          Planes Estándar Disponibles
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {(['basico', 'profesional', 'enterprise'] as ErpPlanId[]).map((planKey) => {
            const plan = ERP_PLANS[planKey];
            const isCurrent = selectedPlan === planKey;
            return (
              <div
                key={planKey}
                onClick={() => handleSelectPlan(planKey)}
                className={`p-6 rounded-3xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  isCurrent
                    ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-lg shadow-primary/10'
                    : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${plan.badgeClass}`}>
                      {plan.name}
                    </span>
                    <div className="text-lg font-black text-gray-900 dark:text-white">
                      ${plan.suggestedMonthlyPriceUSD}<span className="text-xs text-gray-400 font-normal">/mes</span>
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">
                    {plan.tagline}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-4">
                    {plan.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-gray-100 dark:border-gray-800 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                    Incluye:
                  </span>
                  {plan.includedModules.map((modId) => (
                    <div key={modId} className="flex items-center gap-2 text-xs font-medium text-gray-700 dark:text-gray-300">
                      <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                      <span>{ERP_MODULES[modId]?.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Módulos Individuales (Add-ons y Personalización) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              Módulos Individuales a la Carta
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Activa o desactiva módulos puntuales para armar un plan a medida para el cliente.
            </p>
          </div>
          <span className="text-xs text-gray-400 italic">
            Al activar o desactivar un módulo, el plan pasa automáticamente a "Personalizado".
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(Object.keys(ERP_MODULES) as ErpModuleId[]).map((modId) => {
            const mod = ERP_MODULES[modId];
            const isEnabled = selectedModules.includes(modId);
            const IconComponent = MODULE_ICONS[mod.iconName] || Layers;

            return (
              <div
                key={modId}
                onClick={() => handleToggleModule(modId)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer flex items-start gap-4 ${
                  isEnabled
                    ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-xs'
                    : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 opacity-70 hover:opacity-100 hover:border-gray-300'
                }`}
              >
                <div className={`p-2.5 rounded-xl flex-shrink-0 ${
                  isEnabled 
                    ? 'bg-emerald-600 text-white shadow-sm' 
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                }`}>
                  <IconComponent className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-extrabold text-gray-900 dark:text-white truncate">
                      {mod.name}
                    </h3>
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400 flex-shrink-0">
                      +${mod.suggestedAddonPriceUSD}/mes
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                    {mod.description}
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                      isEnabled
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300'
                        : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                    }`}>
                      {isEnabled ? 'Habilitado' : 'Desactivado'}
                    </span>
                    {mod.adminOnly && (
                      <span className="text-[10px] font-semibold text-gray-400">
                        Solo Admin
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex-shrink-0 mt-1">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all ${
                    isEnabled 
                      ? 'bg-emerald-600 border-emerald-600 text-white' 
                      : 'border-gray-300 dark:border-gray-700 bg-transparent'
                  }`}>
                    {isEnabled && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Guía de Despliegue para Producción */}
      <div className="p-6 rounded-3xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              ¿Cómo configurar la licencia al vender este software a un cliente? (Opción 1 - Instancia Dedicada)
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
              Al desplegar una instancia en Vercel o servidor propio para un cliente, define en sus variables de entorno:
            </p>
            <div className="bg-gray-900 text-gray-100 p-3 rounded-xl font-mono text-xs space-y-1 overflow-x-auto">
              <div># Ejemplo 1: Cliente con Plan Básico (Solo POS y Caja)</div>
              <div className="text-emerald-400">NEXT_PUBLIC_ERP_PLAN=basico</div>
              <div className="mt-2"># Ejemplo 2: Cliente con Plan Profesional + Add-on de E-commerce</div>
              <div className="text-emerald-400">NEXT_PUBLIC_ERP_ACTIVE_MODULES=pos,caja,clientes,proveedores,vencimientos,etiquetas,ecommerce</div>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              * El sistema automáticamente ocultará del menú todos los módulos no contratados y redirigirá la tienda pública al login si e-commerce no está activo.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
