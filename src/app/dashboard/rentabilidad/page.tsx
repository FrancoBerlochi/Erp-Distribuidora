/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  TrendingUp, 
  DollarSign, 
  Package, 
  AlertTriangle, 
  CheckCircle2, 
  Download, 
  Filter, 
  Search, 
  Calendar, 
  ArrowUpRight, 
  ArrowDownRight,
  RefreshCw,
  ShoppingBag,
  Percent
} from 'lucide-react';
import { 
  getProfitabilityReport, 
  PeriodFilter, 
  ProfitabilitySummary, 
  ProductProfitItem 
} from '@/lib/profitability-service';

export default function RentabilidadPage() {
  const [period, setPeriod] = useState<PeriodFilter>('today');
  const [category, setCategory] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');
  const [sortBy, setSortBy] = useState<'profit_desc' | 'profit_asc' | 'margin_desc' | 'margin_asc' | 'units_desc'>('profit_desc');
  
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ProfitabilitySummary | null>(null);

  const loadReport = async () => {
    setLoading(true);
    try {
      const rep = await getProfitabilityReport(period, category, search);
      setData(rep);
    } catch (err) {
      console.error('Error cargando reporte de rentabilidad:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [period, category, search]);

  const formatMoney = (val: number) => `$${val.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;

  // Categorías disponibles
  const categories = Array.from(new Set((data?.items || []).map((i) => i.category))).filter(Boolean);

  // Ordenar productos
  const sortedItems = [...(data?.items || [])].sort((a, b) => {
    if (sortBy === 'profit_desc') return b.grossProfit - a.grossProfit;
    if (sortBy === 'profit_asc') return a.grossProfit - b.grossProfit;
    if (sortBy === 'margin_desc') return b.profitMargin - a.profitMargin;
    if (sortBy === 'margin_asc') return a.profitMargin - b.profitMargin;
    if (sortBy === 'units_desc') return b.unitsSold - a.unitsSold;
    return 0;
  });

  // Exportar a Excel
  const handleExportExcel = async () => {
    if (!sortedItems.length) {
      alert('No hay datos disponibles para exportar');
      return;
    }

    const XLSX = await import('xlsx');

    const rows = sortedItems.map((item) => ({
      'ARTICULO': item.name,
      'CODIGO_BARRAS': item.barcode,
      'CATEGORIA': item.category,
      'UNIDADES_VENDIDAS': item.unitsSold,
      'COSTO_UNITARIO': item.costPrice,
      'PRECIO_VENTA_PROM': item.avgSalePrice,
      'CMV_TOTAL': item.totalCost,
      'FACTURACION_TOTAL': item.totalRevenue,
      'GANANCIA_BRUTA': item.grossProfit,
      'MARGEN_%': item.profitMargin,
      'ESTADO_MARGEN': item.status === 'danger' ? 'PELIGRO (NEGATIVO/NULO)' : item.status === 'warning' ? 'AJUSTADO (<15%)' : 'OPTIMO',
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rentabilidad');

    worksheet['!cols'] = [
      { wch: 35 },
      { wch: 18 },
      { wch: 20 },
      { wch: 18 },
      { wch: 16 },
      { wch: 18 },
      { wch: 16 },
      { wch: 18 },
      { wch: 18 },
      { wch: 12 },
      { wch: 22 },
    ];

    const fileName = `Reporte_Rentabilidad_${period}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <div className="h-full flex flex-col min-h-0 overflow-y-auto pr-1 space-y-6">
      
      {/* CABECERA Y ACCIONES PRINCIPALES */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-7 h-7 text-primary" />
              Rentabilidad y Ganancia Bruta
            </h1>
            <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 font-extrabold text-xs px-2.5 py-0.5 rounded-full">
              Analítica Financiera
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            Control comercial de Costo de Mercadería Vendida (CMV), facturación neta y márgenes de ganancia por artículo.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadReport}
            className="p-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl transition-colors"
            title="Actualizar datos"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2.5 px-4 rounded-xl text-xs sm:text-sm transition-all shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Exportar Excel</span>
          </button>
        </div>
      </div>

      {/* SELECTOR DE PERÍODO */}
      <div className="flex bg-gray-100 dark:bg-gray-800/60 p-1 rounded-2xl gap-1 max-w-md">
        {[
          { id: 'today', label: 'Hoy (Turno)' },
          { id: '7days', label: 'Últimos 7 Días' },
          { id: 'month', label: 'Este Mes' },
          { id: 'all', label: 'Histórico Total' },
        ].map((btn) => (
          <button
            key={btn.id}
            onClick={() => setPeriod(btn.id as PeriodFilter)}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all ${
              period === btn.id
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-xs'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* TARJETAS DE KPIS PRINCIPALES */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        {/* Facturación Total */}
        <div className="bg-white dark:bg-gray-900 p-5 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider">Facturación Total</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
            {formatMoney(data?.totalRevenue || 0)}
          </h3>
          <p className="text-[11px] text-gray-500 flex items-center gap-1">
            <ShoppingBag className="w-3 h-3" />
            <span>{data?.totalOrders || 0} ventas ({data?.totalUnitsSold || 0} unidades)</span>
          </p>
        </div>

        {/* Costo Mercadería Vendida (CMV) */}
        <div className="bg-white dark:bg-gray-900 p-5 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider">Costo Mercadería (CMV)</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
            {formatMoney(data?.totalCost || 0)}
          </h3>
          <p className="text-[11px] text-gray-500">
            Costo de reposición estimado
          </p>
        </div>

        {/* Ganancia Bruta ($) */}
        <div className="bg-white dark:bg-gray-900 p-5 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider">Ganancia Bruta</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {formatMoney(data?.grossProfit || 0)}
          </h3>
          <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-0.5">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Dinero limpio recaudado</span>
          </p>
        </div>

        {/* Margen Promedio (%) */}
        <div className="bg-white dark:bg-gray-900 p-5 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider">Margen Promedio</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-purple-700 dark:text-purple-400">
            {data?.profitMargin || 0}%
          </h3>
          <div className="w-full bg-gray-200 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-purple-600 h-full rounded-full" 
              style={{ width: `${Math.min(100, Math.max(0, data?.profitMargin || 0))}%` }}
            />
          </div>
        </div>

      </div>

      {/* ALERTAS INTELIGENTES DE MARGEN COMERCIAL */}
      {data && (data.dangerCount > 0 || data.warningCount > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {data.dangerCount > 0 && (
            <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 p-4 rounded-2xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-black text-red-800 dark:text-red-300">
                  {data.dangerCount} producto(s) con margen nulo o negativo
                </h4>
                <p className="text-[11px] text-red-700 dark:text-red-400 mt-0.5">
                  Se están comercializando al costo o por debajo. Revisa sus precios de lista para no perder rentabilidad por inflación.
                </p>
              </div>
            </div>
          )}

          {data.warningCount > 0 && (
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 p-4 rounded-2xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-black text-amber-800 dark:text-amber-300">
                  {data.warningCount} producto(s) con margen ajustado (&lt; 15%)
                </h4>
                <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                  El porcentaje de utilidad bruta es estrecho. Considera optimizar compras o ajustar precio mayorista/minorista.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* BARRA DE FILTROS Y BÚSQUEDA */}
      <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          {/* Selector de Categoría */}
          <div className="relative min-w-[200px]">
            <Filter className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl pl-9 pr-8 py-2 text-xs font-bold text-gray-800 dark:text-gray-200 outline-none cursor-pointer"
            >
              <option value="ALL">Todas las Categorías</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Buscador de Producto */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por artículo o código..."
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl pl-9 pr-3 py-2 text-xs text-gray-800 dark:text-gray-200 outline-none"
            />
          </div>
        </div>

        {/* Ordenamiento */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-400 shrink-0">Ordenar por:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 dark:text-gray-200 outline-none cursor-pointer"
          >
            <option value="profit_desc">Mayor Ganancia ($)</option>
            <option value="profit_asc">Menor Ganancia ($)</option>
            <option value="margin_desc">Mayor Margen (%)</option>
            <option value="margin_asc">Menor Margen (%)</option>
            <option value="units_desc">Más Vendidos (u.)</option>
          </select>
        </div>
      </div>

      {/* TABLA DE RENTABILIDAD POR PRODUCTO */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-gray-400 text-xs font-bold">
            Calculando análisis de rentabilidad...
          </div>
        ) : sortedItems.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-xs font-bold">
            No se encontraron ventas para el período o filtros seleccionados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400 font-extrabold border-b border-gray-200 dark:border-gray-800">
                <tr>
                  <th className="p-3.5">Artículo</th>
                  <th className="p-3.5">Categoría</th>
                  <th className="p-3.5 text-center">U. Vendidas</th>
                  <th className="p-3.5 text-right">Costo Unit.</th>
                  <th className="p-3.5 text-right">Precio Venta Prom.</th>
                  <th className="p-3.5 text-right">CMV Total</th>
                  <th className="p-3.5 text-right">Facturación</th>
                  <th className="p-3.5 text-right">Ganancia Bruta</th>
                  <th className="p-3.5 text-center">Margen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-medium">
                {sortedItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                    <td className="p-3.5">
                      <p className="font-bold text-gray-900 dark:text-white">{item.name}</p>
                      {item.barcode && (
                        <p className="text-[10px] text-gray-400 font-mono">{item.barcode}</p>
                      )}
                    </td>
                    <td className="p-3.5 text-gray-500">{item.category}</td>
                    <td className="p-3.5 text-center font-bold">{item.unitsSold} u.</td>
                    <td className="p-3.5 text-right text-gray-600 dark:text-gray-300">{formatMoney(item.costPrice)}</td>
                    <td className="p-3.5 text-right font-bold text-gray-900 dark:text-white">{formatMoney(item.avgSalePrice)}</td>
                    <td className="p-3.5 text-right text-amber-700 dark:text-amber-400">{formatMoney(item.totalCost)}</td>
                    <td className="p-3.5 text-right font-bold text-blue-700 dark:text-blue-400">{formatMoney(item.totalRevenue)}</td>
                    <td className="p-3.5 text-right font-black text-emerald-600 dark:text-emerald-400">
                      +{formatMoney(item.grossProfit)}
                    </td>
                    <td className="p-3.5 text-center">
                      <span className={`px-2 py-0.5 rounded-full font-black text-[11px] ${
                        item.status === 'danger'
                          ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                          : item.status === 'warning'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      }`}>
                        {item.profitMargin}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
