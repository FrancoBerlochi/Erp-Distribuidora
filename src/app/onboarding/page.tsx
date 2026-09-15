/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Building2, 
  Mail, 
  Lock, 
  Phone, 
  Check, 
  ArrowRight, 
  ArrowLeft, 
  ShieldCheck, 
  Layers, 
  DollarSign, 
  CreditCard, 
  Sparkles,
  TrendingUp,
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
  ExternalLink,
  Info
} from 'lucide-react';
import { 
  ERP_PLANS, 
  ERP_MODULES, 
  ErpPlanId, 
  ErpModuleId 
} from '@/config/modules';
import { calculateEstimatedPrice, detectMatchingPlan } from '@/lib/license-service';
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

export default function OnboardingPage() {
  const router = useRouter();

  // Paso actual (1: Datos, 2: Módulos, 3: Confirmación/Pago)
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Formulario Paso 1: Datos del Negocio
  const [businessName, setBusinessName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminPhone, setAdminPhone] = useState('');

  // Formulario Paso 2: Selección de Plan y Módulos
  const [selectedPlan, setSelectedPlan] = useState<ErpPlanId>('profesional');
  const [selectedModules, setSelectedModules] = useState<ErpModuleId[]>(
    ERP_PLANS.profesional.includedModules
  );

  // Cotización Dolar API
  const [dollarRate, setDollarRate] = useState<number>(1080);
  const [dollarDate, setDollarDate] = useState<string>('');
  const [loadingDollar, setLoadingDollar] = useState<boolean>(true);

  // Estado de procesamiento
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cargar cotización del Dólar Oficial en vivo desde nuestra API
  useEffect(() => {
    async function fetchDollar() {
      try {
        const res = await fetch('/api/dolar');
        if (res.ok) {
          const data = await res.json();
          if (data.venta) {
            setDollarRate(data.venta);
            setDollarDate(data.fechaActualizacion || '');
          }
        }
      } catch (err) {
        console.warn('Error consultando cotización de dólar:', err);
      } finally {
        setLoadingDollar(false);
      }
    }
    fetchDollar();
  }, []);

  const handleSelectPlan = (planId: ErpPlanId) => {
    setSelectedPlan(planId);
    if (planId !== 'custom') {
      setSelectedModules(ERP_PLANS[planId].includedModules);
    }
  };

  const handleToggleModule = (modId: ErpModuleId) => {
    let updated: ErpModuleId[];
    if (selectedModules.includes(modId)) {
      updated = selectedModules.filter((m) => m !== modId);
    } else {
      updated = [...selectedModules, modId];
    }
    setSelectedModules(updated);
    setSelectedPlan(detectMatchingPlan(updated));
  };

  const amountUSD = calculateEstimatedPrice(selectedPlan, selectedModules);
  const amountARS = Math.round(amountUSD * dollarRate);

  // Validación para avanzar de paso
  const handleNextFromStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim()) {
      toast.error('Ingrese el nombre de su empresa o negocio.');
      return;
    }
    if (!adminEmail.trim() || !adminEmail.includes('@')) {
      toast.error('Ingrese un email de administrador válido.');
      return;
    }
    if (adminPassword.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    setStep(2);
  };

  // Enviar a Mercado Pago
  const handleSubscribe = async () => {
    setIsSubmitting(true);
    try {
      const payload = {
        organizationName: businessName.trim(),
        adminEmail: adminEmail.trim(),
        adminPassword: adminPassword,
        adminPhone: adminPhone.trim(),
        plan: selectedPlan,
        modules: selectedModules,
      };

      const res = await fetch('/api/onboarding/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al iniciar la suscripción');
      }

      if (data.init_point) {
        // Redirigir al checkout oficial de Mercado Pago
        toast.info('Redirigiendo al portal seguro de Mercado Pago...');
        window.location.href = data.init_point;
      } else if (data.redirectUrl) {
        // Modo simulación de desarrollo
        toast.success('¡Suscripción configurada con éxito!');
        router.push(data.redirectUrl);
      }
    } catch (err: any) {
      console.error('Error en suscripción:', err);
      toast.error(err.message || 'Error al procesar la suscripción.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col justify-between">
      {/* Barra superior de navegación */}
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md sticky top-0 z-30">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-black tracking-tight text-primary flex items-center gap-1.5">
            <span className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center font-extrabold text-sm">
              E
            </span>
            <span>ERP <span className="text-[#dc2626] dark:text-red-500">Modular</span></span>
          </Link>

          <div className="flex items-center gap-4 text-xs">
            <span className="text-gray-500 hidden sm:inline">¿Ya tienes cuenta?</span>
            <Link
              href="/login"
              className="px-3.5 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 font-bold hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Iniciar Sesión
            </Link>
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 container mx-auto px-4 py-8 md:py-12 max-w-5xl">
        {/* Stepper Superior */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-3 sm:gap-6">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-colors ${
                step === 1 
                  ? 'bg-primary text-white shadow-md shadow-primary/20' 
                  : step > 1 
                  ? 'bg-emerald-500 text-white' 
                  : 'bg-gray-200 dark:bg-gray-800 text-gray-400'
              }`}>
                {step > 1 ? <Check className="w-4 h-4" /> : '1'}
              </div>
              <span className={`text-xs font-bold ${step === 1 ? 'text-primary' : 'text-gray-500'}`}>
                Datos del Negocio
              </span>
            </div>

            <div className="w-8 sm:w-12 h-0.5 bg-gray-200 dark:bg-gray-800" />

            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-colors ${
                step === 2 
                  ? 'bg-primary text-white shadow-md shadow-primary/20' 
                  : step > 2 
                  ? 'bg-emerald-500 text-white' 
                  : 'bg-gray-200 dark:bg-gray-800 text-gray-400'
              }`}>
                {step > 2 ? <Check className="w-4 h-4" /> : '2'}
              </div>
              <span className={`text-xs font-bold ${step === 2 ? 'text-primary' : 'text-gray-500'}`}>
                Módulos & Plan
              </span>
            </div>

            <div className="w-8 sm:w-12 h-0.5 bg-gray-200 dark:bg-gray-800" />

            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-colors ${
                step === 3 
                  ? 'bg-primary text-white shadow-md shadow-primary/20' 
                  : 'bg-gray-200 dark:bg-gray-800 text-gray-400'
              }`}>
                3
              </div>
              <span className={`text-xs font-bold ${step === 3 ? 'text-primary' : 'text-gray-500'}`}>
                Suscripción MP
              </span>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* PASO 1: DATOS DEL NEGOCIO Y ADMINISTRADOR */}
        {/* ======================================================== */}
        {step === 1 && (
          <div className="max-w-xl mx-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm space-y-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-primary">Paso 1 de 3</span>
                <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mt-1">
                  Comencemos con tu empresa
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Configura el perfil de tu organización y las credenciales del usuario administrador.
                </p>
              </div>

              <form onSubmit={handleNextFromStep1} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                    Nombre de tu Empresa o Distribuidora *
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="Ej: Distribuidora Los Andes"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                    Correo Electrónico (Admin) *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      placeholder="admin@tuempresa.com"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">
                    Con este email iniciarás sesión y recibirás las facturas de suscripción.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                    Contraseña de Acceso *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      placeholder="Mínimo 6 caracteres"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                    Teléfono / WhatsApp de Contacto
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      placeholder="+54 9 11 1234-5678"
                      value={adminPhone}
                      onChange={(e) => setAdminPhone(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-primary text-white font-bold text-sm hover:bg-blue-700 transition-all shadow-md shadow-primary/20 cursor-pointer mt-4"
                >
                  <span>Continuar a Selección de Módulos</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* PASO 2: SELECCIÓN DE PLAN Y MÓDULOS */}
        {/* ======================================================== */}
        {step === 2 && (
          <div className="space-y-8 animate-in fade-in zoom-in-95 duration-200">
            {/* Cabecera y Cotizador en Vivo */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white dark:bg-gray-900 p-6 sm:p-8 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xs">
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-primary">Paso 2 de 3</span>
                <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">
                  Elige los módulos para <span className="text-primary">{businessName}</span>
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Selecciona un plan sugerido o personaliza exactamente las funciones que necesitas.
                </p>
              </div>

              {/* Caja de Cotización con Dolar API */}
              <div className="flex items-center gap-5 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 flex-shrink-0">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 block">
                    Total Suscripción
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                      ${amountUSD}
                    </span>
                    <span className="text-xs font-bold text-gray-500">USD / mes</span>
                  </div>
                  <div className="text-xs font-extrabold text-gray-700 dark:text-gray-300 mt-0.5">
                    ≈ ${amountARS.toLocaleString('es-AR')} ARS / mes
                  </div>
                </div>

                <div className="border-l border-gray-200 dark:border-gray-700 pl-4 text-right">
                  <span className="text-[10px] font-bold text-gray-400 block">Dólar Oficial (Dolar API)</span>
                  <span className="text-xs font-mono font-bold text-gray-800 dark:text-gray-200">
                    1 USD = ${dollarRate.toFixed(2)} ARS
                  </span>
                  <span className="text-[9px] text-emerald-600 dark:text-emerald-400 block font-semibold">
                    ● Cotización en vivo
                  </span>
                </div>
              </div>
            </div>

            {/* Selector de Planes Base */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                1. Elige un Plan Recomendado
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(['basico', 'profesional', 'enterprise'] as ErpPlanId[]).map((pKey) => {
                  const p = ERP_PLANS[pKey];
                  const isCurrent = selectedPlan === pKey;
                  const priceARS = Math.round(p.suggestedMonthlyPriceUSD * dollarRate);

                  return (
                    <div
                      key={pKey}
                      onClick={() => handleSelectPlan(pKey)}
                      className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                        isCurrent
                          ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-md shadow-primary/10 scale-[1.01]'
                          : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${p.badgeClass}`}>
                            {p.name}
                          </span>
                          <span className="text-sm font-black text-gray-900 dark:text-white">
                            ${p.suggestedMonthlyPriceUSD} USD
                          </span>
                        </div>
                        <h4 className="text-xs font-extrabold text-gray-900 dark:text-white mb-1">
                          {p.tagline}
                        </h4>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed mb-3">
                          {p.description}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-[11px]">
                        <span className="text-gray-400">≈ ${priceARS.toLocaleString('es-AR')} ARS</span>
                        <span className={`font-bold ${isCurrent ? 'text-primary' : 'text-gray-400'}`}>
                          {isCurrent ? 'Seleccionado' : 'Elegir'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Módulos Individuales Seleccionables */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  2. O Personaliza los Módulos Activos
                </h3>
                <span className="text-xs text-gray-500">
                  Base Core ($19 USD): <strong className="text-emerald-600">Siempre Incluido</strong>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {(Object.keys(ERP_MODULES) as ErpModuleId[]).map((modId) => {
                  const mod = ERP_MODULES[modId];
                  const isChecked = selectedModules.includes(modId);
                  const Icon = MODULE_ICONS[mod.iconName] || Layers;
                  const modARS = Math.round(mod.suggestedAddonPriceUSD * dollarRate);

                  return (
                    <div
                      key={modId}
                      onClick={() => handleToggleModule(modId)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                        isChecked
                          ? 'border-emerald-400 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20'
                          : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <div className={`p-2 rounded-lg flex-shrink-0 ${
                        isChecked ? 'bg-emerald-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate">
                            {mod.name}
                          </h4>
                          <span className="text-[10px] font-bold text-gray-500 flex-shrink-0">
                            +${mod.suggestedAddonPriceUSD} USD
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5">
                          {mod.shortDescription}
                        </p>
                        <div className="text-[10px] text-gray-400 mt-1">
                          ≈ +${modARS.toLocaleString('es-AR')} ARS
                        </div>
                      </div>

                      <div className={`w-5 h-5 rounded-md flex items-center justify-center border flex-shrink-0 ${
                        isChecked ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-gray-300 dark:border-gray-700'
                      }`}>
                        {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Botones de navegación */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-800">
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-2 px-5 py-3 rounded-xl border border-gray-200 dark:border-gray-700 font-bold text-xs hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Volver a Datos</span>
              </button>

              <button
                onClick={() => setStep(3)}
                className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-primary text-white font-bold text-xs hover:bg-blue-700 transition-all shadow-md shadow-primary/20 cursor-pointer"
              >
                <span>Revisar y Continuar al Pago</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* PASO 3: CONFIRMACIÓN Y PAGO CON MERCADO PAGO */}
        {/* ======================================================== */}
        {step === 3 && (
          <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm space-y-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-primary">Paso 3 de 3</span>
                <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mt-1">
                  Resumen de tu Suscripción
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Revisa los detalles antes de suscribirte con débito automático a través de Mercado Pago.
                </p>
              </div>

              {/* Ficha de la Empresa */}
              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Empresa:</span>
                  <span className="font-bold text-gray-900 dark:text-white">{businessName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Administrador:</span>
                  <span className="font-bold text-gray-900 dark:text-white">{adminEmail}</span>
                </div>
                {adminPhone && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Teléfono:</span>
                    <span className="font-bold text-gray-900 dark:text-white">{adminPhone}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Plan:</span>
                  <span className="font-bold text-primary">{ERP_PLANS[selectedPlan]?.name || 'Plan Personalizado'}</span>
                </div>
              </div>

              {/* Lista de Módulos Contratados */}
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block mb-2">
                  Módulos que estarán disponibles en tu cuenta ({selectedModules.length}):
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-800/40 text-gray-700 dark:text-gray-300">
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Catálogo e Inventario Core</span>
                  </div>
                  {selectedModules.map((mId) => (
                    <div key={mId} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-800/40 text-gray-700 dark:text-gray-300">
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{ERP_MODULES[mId]?.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cuadro de Totales */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-900 to-indigo-950 text-white space-y-3 shadow-lg">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs font-bold text-blue-200 uppercase tracking-wider">Monto Mensual (USD)</span>
                  <span className="text-2xl font-black">${amountUSD} USD / mes</span>
                </div>

                <div className="flex justify-between items-baseline pt-2 border-t border-blue-800/60">
                  <div>
                    <span className="text-xs font-bold text-blue-200 uppercase tracking-wider block">Total a Debitar en Mercado Pago</span>
                    <span className="text-[10px] text-blue-300">Cotización oficial Dolar API: ${dollarRate.toFixed(2)} ARS</span>
                  </div>
                  <span className="text-3xl font-black text-emerald-400">
                    ${amountARS.toLocaleString('es-AR')} <span className="text-xs font-normal text-white">ARS / mes</span>
                  </span>
                </div>
              </div>

              {/* Botón de Pago con Mercado Pago */}
              <div className="space-y-3 pt-2">
                <button
                  onClick={handleSubscribe}
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-2xl bg-[#009ee3] hover:bg-[#0082ba] text-white font-extrabold text-sm transition-all shadow-lg shadow-[#009ee3]/20 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <CreditCard className="w-5 h-5" />
                  <span>{isSubmitting ? 'Conectando con Mercado Pago...' : 'Suscribirme con Mercado Pago'}</span>
                </button>

                <div className="flex items-center justify-center gap-2 text-[11px] text-gray-400 text-center">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Débito automático mensual gestionado de forma segura por Mercado Pago. Puedes cancelar en cualquier momento.</span>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
                <button
                  onClick={() => setStep(2)}
                  className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Modificar Módulos o Datos</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 py-6 bg-white dark:bg-gray-900 text-center text-xs text-gray-500">
        <p>&copy; {new Date().getFullYear()} ERP Modular. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}
