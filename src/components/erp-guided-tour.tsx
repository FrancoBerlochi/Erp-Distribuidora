/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { 
  X, ChevronRight, ChevronLeft, ArrowRight, CheckCircle2, 
  ExternalLink, Sparkles, ScanBarcode, Banknote, Users, 
  LineChart, Truck, CalendarClock, Tag, Globe, LayoutDashboard,
  ShieldCheck, RefreshCw, MessageSquare, CreditCard, Printer,
  AlertTriangle, Send, History, Percent, TrendingUp, Filter,
  AlertCircle, BookOpen, Clock, Flame, Layers, Grid, Zap,
  ShoppingCart, Sliders, Check, Play, RotateCcw
} from 'lucide-react';
import { TOUR_STEPS, useErpTourStore, TourStep } from '@/lib/tour-store';

export default function ErpGuidedTour() {
  const router = useRouter();
  const pathname = usePathname();
  const { isOpen, currentStep, closeTour, nextStep, prevStep, setStep } = useErpTourStore();
  const [mounted, setMounted] = useState(false);

  // Estados interactivos para las mini-demos de cada paso
  const [demoOrderStatus, setDemoOrderStatus] = useState<'pending' | 'preparing' | 'delivered'>('preparing');
  const [demoPosItems, setDemoPosItems] = useState<Array<{ name: string; price: number; qty: number }>>([
    { name: 'Lavandina Ayudín 2L', price: 1850, qty: 2 },
  ]);
  const [demoScannedCount, setDemoScannedCount] = useState(1);
  const [demoCashCounted, setDemoCashCounted] = useState<number>(45000);
  const [demoWaSent, setDemoWaSent] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Manejo de atajos de teclado (←, →, Esc)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeTour();
      } else if (e.key === 'ArrowRight') {
        nextStep();
      } else if (e.key === 'ArrowLeft') {
        prevStep();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, nextStep, prevStep, closeTour]);

  if (!mounted || !isOpen) return null;

  const step: TourStep = TOUR_STEPS[currentStep] || TOUR_STEPS[0];
  const isFirst = currentStep === 0;
  const isLast = currentStep === TOUR_STEPS.length - 1;
  const progressPercent = Math.round(((currentStep + 1) / TOUR_STEPS.length) * 100);

  // Función para simular escaneo en la demo de POS
  const handleSimulateScan = () => {
    const products = [
      { name: 'Detergente Magistral 750ml', price: 2950 },
      { name: 'Jabón Líquido Ariel 3L', price: 8200 },
      { name: 'Papel Higiénico Higienol 4u', price: 3400 },
      { name: 'Galletitas Oreo 118g', price: 1350 },
    ];
    const nextProd = products[demoScannedCount % products.length];
    setDemoPosItems((prev) => [...prev, { ...nextProd, qty: 1 }]);
    setDemoScannedCount((c) => c + 1);
  };

  const getStepIcon = (iconName: string) => {
    switch (iconName) {
      case 'LayoutDashboard': return <LayoutDashboard className="w-6 h-6" />;
      case 'ScanBarcode': return <ScanBarcode className="w-6 h-6" />;
      case 'Banknote': return <Banknote className="w-6 h-6" />;
      case 'Users': return <Users className="w-6 h-6" />;
      case 'LineChart': return <LineChart className="w-6 h-6" />;
      case 'Truck': return <Truck className="w-6 h-6" />;
      case 'CalendarClock': return <CalendarClock className="w-6 h-6" />;
      case 'Tag': return <Tag className="w-6 h-6" />;
      case 'Globe': return <Globe className="w-6 h-6" />;
      default: return <Sparkles className="w-6 h-6" />;
    }
  };

  const getCategoryBadgeClass = (color: string) => {
    switch (color) {
      case 'emerald': return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 'amber': return 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'purple': return 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'indigo': return 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800';
      case 'orange': return 'bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 border-orange-200 dark:border-orange-800';
      case 'rose': return 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800';
      case 'cyan': return 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800';
      default: return 'bg-blue-50 text-primary dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800';
    }
  };

  const handleNavigateToModule = () => {
    closeTour();
    router.push(step.route);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 md:p-6 animate-in fade-in duration-200">
      {/* Backdrop con desenfoque */}
      <div 
        onClick={closeTour}
        className="fixed inset-0 bg-black/75 backdrop-blur-sm cursor-pointer"
        aria-hidden="true"
      />

      {/* Contenedor Principal del Tour */}
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col overflow-hidden z-10 animate-in zoom-in-95 duration-200">
        
        {/* Barra de Progreso Superior */}
        <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-primary via-indigo-500 to-emerald-500 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Header del Tour */}
        <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3 bg-gray-50/70 dark:bg-gray-900/70">
          <div className="flex items-center gap-3">
            <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${getCategoryBadgeClass(step.categoryColor)}`}>
              {step.category}
            </span>
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
              Paso <strong className="text-gray-900 dark:text-white">{currentStep + 1}</strong> de {TOUR_STEPS.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Selector rápido de módulos */}
            <select
              value={currentStep}
              onChange={(e) => setStep(Number(e.target.value))}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none cursor-pointer hidden sm:block"
            >
              {TOUR_STEPS.map((s, idx) => (
                <option key={s.id} value={idx}>
                  {idx + 1}. {s.title}
                </option>
              ))}
            </select>

            {/* Botón Cerrar */}
            <button
              onClick={closeTour}
              className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              aria-label="Cerrar tour"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Cuerpo del Tour con Contenido Desplazable */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 md:p-8 space-y-6">
          
          {/* Título y Resumen del Módulo */}
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm border ${getCategoryBadgeClass(step.categoryColor)}`}>
              {getStepIcon(step.iconName)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight leading-tight">
                  {step.title}
                </h2>
                {step.badge && (
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                    {step.badge}
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm font-semibold text-primary dark:text-blue-400 mt-0.5">
                {step.subtitle}
              </p>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed mt-2">
                {step.description}
              </p>
            </div>
          </div>

          {/* Grid de 2 Columnas: Puntos Clave vs Simulación Interactiva */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            
            {/* Columna Izquierda: 3 Puntos Clave */}
            <div className="lg:col-span-5 space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Lo que podés hacer acá
              </h3>
              <div className="space-y-2.5">
                {step.highlights.map((h, i) => (
                  <div 
                    key={i}
                    className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 flex items-start gap-3 transition-all hover:border-gray-200 dark:hover:border-gray-700"
                  >
                    <div className="w-7 h-7 rounded-lg bg-white dark:bg-gray-800 shadow-2xs border border-gray-200/60 dark:border-gray-700 flex items-center justify-center text-primary flex-shrink-0 mt-0.5">
                      <Check className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold text-gray-900 dark:text-white">
                        {h.title}
                      </h4>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
                        {h.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Columna Derecha: Mockup / Simulación Interactiva en Vivo */}
            <div className="lg:col-span-7 bg-gray-900 text-white rounded-2xl p-4 sm:p-5 border border-gray-800 shadow-lg relative overflow-hidden flex flex-col justify-between min-h-[260px]">
              <div className="flex items-center justify-between pb-3 border-b border-gray-800 mb-3 text-xs text-gray-400">
                <span className="flex items-center gap-1.5 font-bold text-gray-300">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                  Simulación Interactiva en Vivo
                </span>
                <span className="text-[10px] bg-gray-800 px-2 py-0.5 rounded-md font-mono">
                  {step.route}
                </span>
              </div>

              {/* DEMO 1: PEDIDOS REALTIME */}
              {step.id === 'orders' && (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-gray-800/80 border border-gray-700 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-white">Pedido #1042</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold">
                          Tienda Web
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-0.5">Cliente: Supermercado El Trébol (3 ítems)</p>
                      <p className="text-xs font-extrabold text-emerald-400 mt-1">$48.200 · Efectivo contra entrega</p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex text-[10px] font-black uppercase px-2 py-1 rounded-md ${
                        demoOrderStatus === 'pending' ? 'bg-amber-500/20 text-amber-300' :
                        demoOrderStatus === 'preparing' ? 'bg-blue-500/20 text-blue-300' :
                        'bg-emerald-500/20 text-emerald-300'
                      }`}>
                        {demoOrderStatus === 'pending' ? '⏳ Pendiente' :
                         demoOrderStatus === 'preparing' ? '📦 En Preparación' :
                         '🚚 Despachado'}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-gray-950/70 border border-gray-800 text-xs space-y-2">
                    <p className="text-[11px] font-bold text-gray-400">Probá cambiar el estado del pedido:</p>
                    <div className="flex gap-1.5 flex-wrap">
                      <button
                        onClick={() => setDemoOrderStatus('pending')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                          demoOrderStatus === 'pending' ? 'bg-amber-500 text-black' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                        }`}
                      >
                        Pendiente
                      </button>
                      <button
                        onClick={() => setDemoOrderStatus('preparing')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                          demoOrderStatus === 'preparing' ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                        }`}
                      >
                        En Preparación
                      </button>
                      <button
                        onClick={() => setDemoOrderStatus('delivered')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                          demoOrderStatus === 'delivered' ? 'bg-emerald-500 text-black' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                        }`}
                      >
                        Despachado
                      </button>
                    </div>
                    <div className="pt-1 flex items-center justify-between text-[11px] text-gray-400">
                      <span>Mensaje WhatsApp:</span>
                      <span className="text-emerald-400 font-bold">"¡Hola! Tu pedido #1042 está {demoOrderStatus === 'delivered' ? 'en camino' : demoOrderStatus}."</span>
                    </div>
                  </div>
                </div>
              )}

              {/* DEMO 2: POS */}
              {step.id === 'pos' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-300">Ticket de Venta #5031</span>
                    <button
                      onClick={handleSimulateScan}
                      className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 transition-all"
                    >
                      <ScanBarcode className="w-3.5 h-3.5" />
                      <span>Simular Escáner (Beep)</span>
                    </button>
                  </div>

                  <div className="max-h-28 overflow-y-auto space-y-1.5 pr-1 font-mono text-xs">
                    {demoPosItems.map((it, idx) => (
                      <div key={idx} className="flex justify-between items-center py-1 border-b border-gray-800">
                        <span className="truncate max-w-[180px]">{it.qty}x {it.name}</span>
                        <span className="text-emerald-400 font-bold">${(it.price * it.qty).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-gray-800 flex justify-between items-center">
                    <div>
                      <p className="text-[10px] text-gray-400 font-sans">Artículos: {demoPosItems.length}</p>
                      <p className="text-xs text-gray-300">Medio: <strong className="text-white">Efectivo / QR</strong></p>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-black text-emerald-400">
                        ${demoPosItems.reduce((acc, cur) => acc + cur.price * cur.qty, 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* DEMO 3: CAJA */}
              {step.id === 'caja' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-gray-800/80 border border-gray-700">
                      <p className="text-[10px] text-gray-400 font-medium">Fondo Inicial</p>
                      <p className="text-sm font-black text-white">$15.000</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-gray-800/80 border border-gray-700">
                      <p className="text-[10px] text-gray-400 font-medium">Ventas en Efectivo</p>
                      <p className="text-sm font-black text-emerald-400">+$30.000</p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-gray-950/70 border border-gray-800 text-xs space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Efectivo Esperado en Caja:</span>
                      <span className="font-extrabold text-white">$45.000</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Monto Contado por Cajero:</span>
                      <div className="flex items-center gap-1.5">
                        <input 
                          type="number"
                          value={demoCashCounted}
                          onChange={(e) => setDemoCashCounted(Number(e.target.value))}
                          className="w-24 px-2 py-0.5 rounded bg-gray-800 border border-gray-700 text-right font-mono text-emerald-400 text-xs font-bold"
                        />
                      </div>
                    </div>
                    <div className="pt-1 border-t border-gray-800 flex justify-between text-xs">
                      <span>Diferencia de Arqueo:</span>
                      <span className={`font-black ${demoCashCounted - 45000 === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {demoCashCounted - 45000 === 0 ? '✓ Exacto ($0)' : `$${(demoCashCounted - 45000).toLocaleString()}`}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* DEMO 4: CLIENTES Y FIADO */}
              {step.id === 'clientes' && (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-gray-800/80 border border-gray-700">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-extrabold text-white text-xs">Almacén "Don Carlos"</h4>
                        <p className="text-[11px] text-gray-400">CUIT: 20-34589211-4 · Carlos Gómez</p>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold">
                        Deuda Activa
                      </span>
                    </div>

                    <div className="mt-2.5 space-y-1.5">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-gray-400">Saldo adeudado:</span>
                        <span className="text-rose-400 font-extrabold">$42.500</span>
                      </div>
                      <div className="w-full bg-gray-700 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-rose-500 h-full w-[70%]" />
                      </div>
                      <div className="flex justify-between text-[10px] text-gray-400">
                        <span>Límite fiado: $60.000</span>
                        <span>Disponible: $17.500</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={() => setDemoWaSent(true)}
                      className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{demoWaSent ? '✓ Aviso Enviado por WhatsApp' : 'Enviar Recordatorio de Saldo por WhatsApp'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* DEMO 5: RENTABILIDAD */}
              {step.id === 'rentabilidad' && (
                <div className="space-y-2.5">
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2 rounded-xl bg-gray-800/80 border border-gray-700">
                      <p className="text-[10px] text-gray-400">Ventas</p>
                      <p className="font-black text-white">$1.240.000</p>
                    </div>
                    <div className="p-2 rounded-xl bg-gray-800/80 border border-gray-700">
                      <p className="text-[10px] text-gray-400">CMV (Costo)</p>
                      <p className="font-black text-amber-400">$720.000</p>
                    </div>
                    <div className="p-2 rounded-xl bg-emerald-950/40 border border-emerald-800/80">
                      <p className="text-[10px] text-emerald-400 font-bold">Ganancia Neta</p>
                      <p className="font-black text-emerald-300">$520.000</p>
                    </div>
                  </div>

                  <div className="space-y-2 pt-1 font-mono text-xs">
                    <div>
                      <div className="flex justify-between text-[11px] mb-0.5">
                        <span className="font-sans text-gray-300">Jabón Líquido Ariel (Margen: 48%)</span>
                        <span className="text-emerald-400 font-bold">+$3.950 x u.</span>
                      </div>
                      <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-emerald-400 h-full w-[78%]" />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[11px] mb-0.5">
                        <span className="font-sans text-gray-300">Aceite Girasol 1.5L (Margen: 22%)</span>
                        <span className="text-amber-400 font-bold">+$480 x u.</span>
                      </div>
                      <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-amber-400 h-full w-[42%]" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* DEMO 6: PROVEEDORES */}
              {step.id === 'proveedores' && (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/70 flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-rose-400" />
                        <span className="text-xs font-black text-white">Stock Crítico Detectado</span>
                      </div>
                      <p className="text-xs font-bold text-gray-200 mt-1">Lavandina Concentrada 5L</p>
                      <p className="text-[11px] text-rose-300">Quedan solo 3 unidades (Mínimo requerido: 20)</p>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 font-bold">
                      Reponer Urgente
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-gray-950/70 border border-gray-800 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-gray-400">Proveedor habitual:</p>
                      <p className="text-xs font-extrabold text-white">Química del Plata S.A.</p>
                      <p className="text-[10px] text-emerald-400 font-mono">+54 9 11 5422-9011</p>
                    </div>
                    <button
                      onClick={() => alert('Simulación: Abriendo chat de WhatsApp con el pedido de reposición de 20 unidades listo.')}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center gap-1 cursor-pointer transition-all"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Pedir x WhatsApp</span>
                    </button>
                  </div>
                </div>
              )}

              {/* DEMO 7: VENCIMIENTOS */}
              {step.id === 'vencimientos' && (
                <div className="space-y-2">
                  <p className="text-[11px] text-gray-400">Semáforo de Lotes FEFO (First Expired, First Out):</p>
                  
                  <div className="space-y-1.5 text-xs font-mono">
                    <div className="p-2 rounded-xl bg-rose-950/50 border border-rose-800/70 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                        <span className="text-white font-sans font-bold">Yogur Entero 1L (Lote #082)</span>
                      </div>
                      <span className="text-rose-400 font-bold">Vence en 4 días</span>
                    </div>

                    <div className="p-2 rounded-xl bg-amber-950/40 border border-amber-800/60 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                        <span className="text-white font-sans font-bold">Galletitas Rellenas (Lote #114)</span>
                      </div>
                      <span className="text-amber-300 font-bold">Vence en 26 días</span>
                    </div>

                    <div className="p-2 rounded-xl bg-emerald-950/30 border border-emerald-800/50 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        <span className="text-white font-sans font-bold">Arroz Largo Fino (Lote #401)</span>
                      </div>
                      <span className="text-emerald-400 font-bold">Vence en 180 días</span>
                    </div>
                  </div>
                </div>
              )}

              {/* DEMO 8: ETIQUETAS */}
              {step.id === 'etiquetas' && (
                <div className="space-y-3">
                  <div className="max-w-xs mx-auto p-3.5 bg-white text-black rounded-xl shadow-lg border-2 border-dashed border-gray-400 text-center font-sans">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Distribuidora Express</p>
                    <h5 className="font-black text-sm text-gray-900 mt-0.5">DETERGENTE MAGISTRAL 750ML</h5>
                    <div className="my-1.5 flex flex-col items-center">
                      {/* Código de barra simulado */}
                      <div className="h-9 w-44 bg-gradient-to-r from-black via-gray-700 to-black flex items-center justify-center text-[9px] text-white tracking-widest font-mono">
                        ||||| | |||| || |||||
                      </div>
                      <span className="text-[9px] font-mono tracking-widest text-gray-700">7791234567890</span>
                    </div>
                    <div className="flex items-baseline justify-center gap-1.5">
                      <span className="text-2xl font-black text-black">$2.950</span>
                      <span className="text-[10px] text-gray-500">x unidad</span>
                    </div>
                  </div>
                </div>
              )}

              {/* DEMO 9: ECOMMERCE */}
              {step.id === 'ecommerce' && (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-gray-800/80 border border-gray-700 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-gray-700 flex items-center justify-center text-xl">
                      🧴
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-white truncate">Jabón Líquido Ariel Concentrado</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs font-black text-emerald-400">$8.200</span>
                        <span className="text-[10px] text-amber-300 bg-amber-400/10 px-1.5 rounded">
                          Llevando 6+ a $7.100 (Mayorista)
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-blue-950/40 border border-blue-800/60 flex items-center justify-between text-xs">
                    <span className="text-blue-300 font-bold">Carrito Web con Mercado Pago</span>
                    <span className="px-2.5 py-1 rounded-lg bg-blue-500 text-white font-extrabold text-[11px]">
                      Pagar Seguro
                    </span>
                  </div>
                </div>
              )}

              {/* Botón flotante para probar módulo real si está autenticado */}
              <div className="pt-2 flex items-center justify-between text-[11px] text-gray-400">
                <span>Atajos: <kbd className="px-1.5 py-0.5 rounded bg-gray-800 border border-gray-700">←</kbd> <kbd className="px-1.5 py-0.5 rounded bg-gray-800 border border-gray-700">→</kbd> para navegar</span>
                <button
                  onClick={handleNavigateToModule}
                  className="text-primary hover:text-blue-300 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <span>Ir a este módulo en vivo</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer del Tour con Controles de Navegación */}
        <div className="px-5 py-4 sm:px-6 sm:py-5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-900/70 flex items-center justify-between gap-3">
          
          <button
            onClick={closeTour}
            className="text-xs font-bold text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors cursor-pointer"
          >
            Omitir tour
          </button>

          {/* Dots Indicadores de Pasos */}
          <div className="hidden sm:flex items-center gap-1.5">
            {TOUR_STEPS.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setStep(idx)}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  currentStep === idx 
                    ? 'w-6 bg-primary' 
                    : 'w-2 bg-gray-300 dark:bg-gray-700 hover:bg-gray-400'
                }`}
                aria-label={`Ir al paso ${idx + 1}`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {!isFirst && (
              <button
                onClick={prevStep}
                className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Anterior</span>
              </button>
            )}

            {!isLast ? (
              <button
                onClick={nextStep}
                className="px-5 py-2.5 rounded-xl bg-primary hover:bg-blue-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-primary/20 transition-all cursor-pointer"
              >
                <span>Siguiente</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={closeTour}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>¡Finalizar Tour!</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
