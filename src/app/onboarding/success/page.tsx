/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, ArrowRight, ShieldCheck, Sparkles, Building2, Package, Layers } from 'lucide-react';
import { ERP_PLANS, ERP_MODULES, ErpModuleId, ErpPlanId } from '@/config/modules';
import { saveSimulatedLicense } from '@/lib/license-service';

function SuccessContent() {
  const searchParams = useSearchParams();
  const orgName = searchParams.get('org') || 'Tu Empresa';
  const planParam = (searchParams.get('plan') || 'profesional') as ErpPlanId;
  const rawModules = searchParams.get('modules') || '';
  const refCode = searchParams.get('ref') || `SUB-${Date.now().toString().slice(-6)}`;
  const isDemo = searchParams.get('demo') === 'true';

  const [modulesList, setModulesList] = useState<ErpModuleId[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    let parsed: ErpModuleId[] = [];
    if (rawModules) {
      parsed = rawModules
        .split(',')
        .map((m) => m.trim().toLowerCase())
        .filter((m): m is ErpModuleId => m in ERP_MODULES);
    } else if (planParam in ERP_PLANS) {
      parsed = ERP_PLANS[planParam].includedModules;
    }

    setModulesList(parsed);

    // Inicializar la licencia en el cliente para que al entrar al dashboard tenga sus módulos activos
    saveSimulatedLicense(planParam, parsed);
  }, [rawModules, planParam]);

  const planDefinition = ERP_PLANS[planParam] || ERP_PLANS.profesional;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="max-w-xl w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 sm:p-10 shadow-xl space-y-6 text-center animate-in fade-in zoom-in-95 duration-300">
        {/* Icono de Éxito */}
        <div className="relative mx-auto w-20 h-20">
          <div className="w-20 h-20 rounded-3xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/10">
            <CheckCircle2 className="w-12 h-12" />
          </div>
          <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-black shadow-sm">
            ✓
          </div>
        </div>

        {/* Título y Felicitación */}
        <div className="space-y-2">
          <span className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
            Suscripción Confirmada
          </span>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
            ¡Bienvenido a tu nuevo ERP!
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            Hemos procesado tu alta exitosamente. El entorno para <strong className="text-gray-900 dark:text-white">{orgName}</strong> ya está configurado y listo para operar.
          </p>
        </div>

        {/* Resumen de la Cuenta */}
        <div className="p-5 rounded-2xl bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 text-left space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-gray-500 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-primary" /> Organización:
            </span>
            <span className="font-bold text-gray-900 dark:text-white">{orgName}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-gray-500 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-primary" /> Plan Activo:
            </span>
            <span className="font-bold text-primary">{planDefinition.name}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-gray-500 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" /> Referencia:
            </span>
            <span className="font-mono text-gray-600 dark:text-gray-300 font-semibold">{refCode}</span>
          </div>

          {/* Módulos Habilitados */}
          <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
              Módulos activos en tu cuenta ({modulesList.length}):
            </span>
            <div className="flex flex-wrap gap-1.5">
              {modulesList.map((mId) => (
                <span
                  key={mId}
                  className="inline-flex items-center gap-1 text-[11px] font-bold bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 px-2.5 py-1 rounded-md border border-gray-200 dark:border-gray-700"
                >
                  ✓ {ERP_MODULES[mId]?.name}
                </span>
              ))}
            </div>
          </div>
        </div>

        {isDemo && (
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 text-xs text-left flex items-start gap-2">
            <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              <strong>Modo Demostración Activo:</strong> Se ha inicializado la sesión con los módulos seleccionados sin realizar cargos reales.
            </span>
          </div>
        )}

        {/* Botón de Acción Principal */}
        <div className="space-y-3 pt-2">
          <Link
            href="/dashboard"
            className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl bg-primary text-white font-extrabold text-sm hover:bg-blue-700 transition-all shadow-md shadow-primary/20 cursor-pointer"
          >
            <span>Ir a Mi Panel de Control</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            href="/login"
            className="text-xs font-bold text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 block"
          >
            Ir a Pantalla de Inicio de Sesión
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function OnboardingSuccessPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Cargando confirmación...</div>}>
      <SuccessContent />
    </Suspense>
  );
}
