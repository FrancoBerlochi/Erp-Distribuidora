/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  ShoppingBag, 
  Package, 
  Percent, 
  Download, 
  Printer, 
  RefreshCw, 
  Calendar, 
  ArrowUpRight, 
  Sparkles,
  CreditCard,
  Clock,
  Award,
  Layers
} from 'lucide-react';
import { 
  getSalesReport, 
  exportSalesReportToExcel, 
  ReportPeriod, 
  SalesReportData 
} from '@/lib/reports-service';
import { 
  SalesAreaChart, 
  PaymentMethodsDonut, 
  PeakHoursBarChart, 
  TopProductsRanking 
} from '@/components/sales-charts';

export default function ReportesPage() {
  const [period, setPeriod] = useState<ReportPeriod>('7days');
  const [useDemo, setUseDemo] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [report, setReport] = useState<SalesReportData | null>(null);
  const [topType, setTopType] = useState<'revenue' | 'units'>('revenue');

  const loadData = async (forceDemoState?: boolean) => {
    setLoading(true);
    try {
      const demoFlag = forceDemoState !== undefined ? forceDemoState : useDemo;
      const data = await getSalesReport(period, demoFlag);
      setReport(data);
      // Si no hay ventas reales y devolvió demo automáticamente, actualizar el switch
      if (data.isDemoData && !useDemo && forceDemoState === undefined) {
        setUseDemo(true);
      }
    } catch (err) {
      console.error('Error cargando estadísticas de venta:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [period, useDemo]);

  const handleToggleDemo = () => {
    const nextState = !useDemo;
    setUseDemo(nextState);
    loadData(nextState);
  };

  const handleExportExcel = async () => {
    if (!report) return;
    await exportSalesReportToExcel(report);
  };

  const handlePrint = () => {
    window.print();
  };

  const periodLabels: Record<ReportPeriod, string> = {
    today: 'Hoy',
    yesterday: 'Ayer',
    '7days': 'Últimos 7 Días',
    '30days': 'Últimos 30 Días',
    this_month: 'Este Mes',
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6 print:p-0 print:space-y-4">
      {/* Header Principal */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-5 print:hidden">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                Reportes y Estadísticas de Venta
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Facturación, rentabilidad, medios de cobro y patrones de afluencia comercial
              </p>
            </div>
          </div>
        </div>

        {/* Acciones del Header */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Selector de Período */}
          <div className="inline-flex p-1 rounded-xl bg-gray-100 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-xs font-medium">
            {(Object.keys(periodLabels) as ReportPeriod[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  period === p
                    ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-300 font-bold shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {periodLabels[p]}
              </button>
            ))}
          </div>

          {/* Switch Modo Demo */}
          <button
            onClick={handleToggleDemo}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
              useDemo
                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300'
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
            title="Activa o desactiva datos de demostración si tu tienda no tiene ventas en este rango"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{useDemo ? 'Simulación Activa' : 'Datos Reales'}</span>
          </button>

          {/* Botón Excel */}
          <button
            onClick={handleExportExcel}
            disabled={loading || !report}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Excel</span>
          </button>

          {/* Botón Imprimir / PDF */}
          <button
            onClick={handlePrint}
            disabled={loading || !report}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-semibold transition-all"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir</span>
          </button>

          {/* Botón Refrescar */}
          <button
            onClick={() => loadData()}
            disabled={loading}
            className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-all disabled:opacity-50"
            title="Actualizar datos"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Encabezado visible sólo al imprimir */}
      <div className="hidden print:block mb-4 border-b border-gray-400 pb-3">
        <h1 className="text-xl font-bold text-black">Reporte Consolidado de Ventas - Distribuidora Express</h1>
        <p className="text-xs text-gray-600">
          Período: {periodLabels[period]} | Generado el {new Date().toLocaleDateString('es-AR')} a las {new Date().toLocaleTimeString('es-AR')}
        </p>
      </div>

      {/* Alerta de Modo Demostración */}
      {report?.isDemoData && (
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300 print:hidden">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              <strong>Modo Simulación:</strong> Visualizando datos proyectados de ejemplo para el período seleccionado. Si tienes ventas reales registradas en tu POS, desactiva la simulación para ver tus números reales.
            </span>
          </div>
          <button
            onClick={handleToggleDemo}
            className="underline font-bold text-amber-900 dark:text-amber-200 flex-shrink-0 ml-3 hover:text-amber-700"
          >
            Ver Reales
          </button>
        </div>
      )}

      {/* Tarjetas de KPIs Principales (6 Métricas) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* KPI 1: Facturación Total */}
        <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Facturación
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            {loading ? (
              <div className="h-7 bg-gray-200 dark:bg-gray-700 animate-pulse rounded w-3/4" />
            ) : (
              <div className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white font-mono tracking-tight">
                ${report?.kpis.totalRevenue.toLocaleString('es-AR')}
              </div>
            )}
            <div className="flex items-center gap-1 mt-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              <ArrowUpRight className="w-3 h-3" />
              <span>+{report?.kpis.revenueComparisonPercent || 12}% vs período ant.</span>
            </div>
          </div>
        </div>

        {/* KPI 2: Ventas / Tickets */}
        <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Tickets Emitidos
            </span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            {loading ? (
              <div className="h-7 bg-gray-200 dark:bg-gray-700 animate-pulse rounded w-1/2" />
            ) : (
              <div className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white font-mono tracking-tight">
                {report?.kpis.totalOrders}
              </div>
            )}
            <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
              operaciones cobradas
            </div>
          </div>
        </div>

        {/* KPI 3: Ticket Promedio */}
        <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Ticket Promedio
            </span>
            <div className="w-7 h-7 rounded-lg bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            {loading ? (
              <div className="h-7 bg-gray-200 dark:bg-gray-700 animate-pulse rounded w-2/3" />
            ) : (
              <div className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white font-mono tracking-tight">
                ${Math.round(report?.kpis.averageTicket || 0).toLocaleString('es-AR')}
              </div>
            )}
            <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
              por comprobante
            </div>
          </div>
        </div>

        {/* KPI 4: Unidades Vendidas */}
        <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Unidades Salientes
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            {loading ? (
              <div className="h-7 bg-gray-200 dark:bg-gray-700 animate-pulse rounded w-1/2" />
            ) : (
              <div className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white font-mono tracking-tight">
                {report?.kpis.totalUnitsSold.toLocaleString('es-AR')}
              </div>
            )}
            <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
              artículos despachados
            </div>
          </div>
        </div>

        {/* KPI 5: CMV (Costo de Mercadería) */}
        <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              CMV Estimado
            </span>
            <div className="w-7 h-7 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            {loading ? (
              <div className="h-7 bg-gray-200 dark:bg-gray-700 animate-pulse rounded w-2/3" />
            ) : (
              <div className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white font-mono tracking-tight">
                ${report?.kpis.estimatedCostCMV.toLocaleString('es-AR')}
              </div>
            )}
            <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
              costo de reposición
            </div>
          </div>
        </div>

        {/* KPI 6: Margen Bruto % */}
        <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Margen Bruto
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            {loading ? (
              <div className="h-7 bg-gray-200 dark:bg-gray-700 animate-pulse rounded w-1/2" />
            ) : (
              <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">
                {report?.kpis.profitMarginPercent}%
              </div>
            )}
            <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium mt-1 font-mono">
              +${report?.kpis.grossProfit.toLocaleString('es-AR')} utilidad
            </div>
          </div>
        </div>
      </div>

      {/* Gráfico Principal de Evolución de Facturación */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-800/80 pb-4">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span>Curva de Facturación ({periodLabels[period]})</span>
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Desglose temporal de ingresos por caja y tienda online
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span>Facturación Neta ($)</span>
          </div>
        </div>

        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2 text-gray-400">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
              <span className="text-xs">Cargando serie temporal...</span>
            </div>
          </div>
        ) : report && report.timeSeries.length > 0 ? (
          <SalesAreaChart data={report.timeSeries} period={period} />
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-400 text-xs">
            No se registraron transacciones en este período
          </div>
        )}
      </div>

      {/* Grid de 2 Columnas: Medios de Pago y Horas Pico */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Columna Izquierda: Medios de Pago */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800 shadow-sm space-y-4 overflow-hidden">
          <div className="border-b border-gray-100 dark:border-gray-800/80 pb-3">
            <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-indigo-600" />
              <span>Mix de Medios de Pago</span>
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Participación porcentual y volumen cobrado por cada canal
            </p>
          </div>

          {loading ? (
            <div className="h-60 flex items-center justify-center">
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
            </div>
          ) : report && report.paymentMethods.length > 0 ? (
            <PaymentMethodsDonut data={report.paymentMethods} />
          ) : (
            <div className="h-60 flex items-center justify-center text-gray-400 text-xs">
              Sin cobros registrados
            </div>
          )}
        </div>

        {/* Columna Derecha: Afluencia Comercial y Horarios Pico */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800 shadow-sm space-y-4 overflow-hidden">
          <div className="border-b border-gray-100 dark:border-gray-800/80 pb-3">
            <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <span>Afluencia Comercial y Horas Pico</span>
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Concentración de transacciones entre las 08:00 y las 22:00 hs
            </p>
          </div>

          {loading ? (
            <div className="h-60 flex items-center justify-center">
              <RefreshCw className="w-6 h-6 animate-spin text-amber-500" />
            </div>
          ) : report && report.hourlyStats.length > 0 ? (
            <PeakHoursBarChart data={report.hourlyStats} />
          ) : (
            <div className="h-60 flex items-center justify-center text-gray-400 text-xs">
              Sin datos de horarios disponibles
            </div>
          )}
        </div>
      </div>

      {/* Top 10 Productos Más Vendidos */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
        <div className="border-b border-gray-100 dark:border-gray-800/80 pb-3">
          <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-500" />
            <span>Rendimiento por Producto y Margen Comercial</span>
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Artículos con mayor impacto en la facturación y margen neto de ganancia
          </p>
        </div>

        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
          </div>
        ) : report ? (
          <TopProductsRanking
            products={topType === 'revenue' ? report.topProductsByRevenue : report.topProductsByUnits}
            activeType={topType}
            onToggleType={(type) => setTopType(type)}
          />
        ) : null}
      </div>
    </div>
  );
}
