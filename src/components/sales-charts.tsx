/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useMemo } from 'react';
import { 
  PaymentMethodStat, 
  SalesTimeSeriesPoint, 
  HourlySalesStat, 
  TopProductStat 
} from '@/lib/reports-service';
import { 
  Clock
} from 'lucide-react';

/* ==========================================================================
   1. SALES AREA CHART (Facturación a lo largo del tiempo)
   ========================================================================== */
interface SalesAreaChartProps {
  data: SalesTimeSeriesPoint[];
  period: string;
}

export function SalesAreaChart({ data, period }: SalesAreaChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const { points, pathD, areaD, yTicks } = useMemo(() => {
    if (!data || data.length === 0) {
      return { points: [], minVal: 0, maxVal: 1, pathD: '', areaD: '', yTicks: [] };
    }

    const revenues = data.map((d) => d.revenue);
    const min = 0;
    const maxRaw = Math.max(...revenues);
    const max = maxRaw === 0 ? 1000 : Math.ceil(maxRaw * 1.15); // +15% head room

    const width = 800;
    const height = 260;
    const padLeft = 60;
    const padRight = 20;
    const padTop = 25;
    const padBottom = 35;
    const chartWidth = width - padLeft - padRight;
    const chartHeight = height - padTop - padBottom;

    const coords = data.map((d, i) => {
      const x = padLeft + (data.length > 1 ? (i / (data.length - 1)) * chartWidth : chartWidth / 2);
      const ratio = (d.revenue - min) / (max - min);
      const y = padTop + chartHeight - ratio * chartHeight;
      return { x, y, data: d };
    });

    // Create smooth bezier path or straight lines
    let path = '';
    if (coords.length === 1) {
      path = `M ${padLeft} ${coords[0].y} L ${padLeft + chartWidth} ${coords[0].y}`;
    } else if (coords.length > 1) {
      path = `M ${coords[0].x} ${coords[0].y}`;
      for (let i = 0; i < coords.length - 1; i++) {
        const p0 = coords[i];
        const p1 = coords[i + 1];
        const cx1 = p0.x + (p1.x - p0.x) / 2;
        const cy1 = p0.y;
        const cx2 = p0.x + (p1.x - p0.x) / 2;
        const cy2 = p1.y;
        path += ` C ${cx1} ${cy1}, ${cx2} ${cy2}, ${p1.x} ${p1.y}`;
      }
    }

    // Area closed path
    const baselineY = padTop + chartHeight;
    const area = coords.length > 0 
      ? `${path} L ${coords[coords.length - 1].x} ${baselineY} L ${coords[0].x} ${baselineY} Z`
      : '';

    // Y ticks (4 levels)
    const ticks = [
      { val: max, y: padTop },
      { val: max * 0.66, y: padTop + chartHeight * 0.34 },
      { val: max * 0.33, y: padTop + chartHeight * 0.67 },
      { val: 0, y: baselineY },
    ];

    return {
      points: coords,
      minVal: min,
      maxVal: max,
      pathD: path,
      areaD: area,
      yTicks: ticks,
    };
  }, [data]);

  const activePoint = hoveredIndex !== null && points[hoveredIndex] ? points[hoveredIndex] : null;

  const formatShortCurrency = (val: number) => {
    if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
    if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}k`;
    return `$${Math.round(val)}`;
  };

  return (
    <div className="relative w-full overflow-hidden select-none">
      {/* SVG Container */}
      <div className="w-full relative aspect-[16/7] min-h-[260px]">
        <svg
          viewBox="0 0 800 260"
          className="w-full h-full overflow-visible"
          preserveAspectRatio="none"
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <defs>
            <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.38" />
              <stop offset="90%" stopColor="#3b82f6" stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id="salesStroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
            <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.25" />
            </filter>
          </defs>

          {/* Horizontal Grid lines & Y Ticks */}
          {yTicks.map((t, idx) => (
            <g key={idx}>
              <line
                x1={60}
                y1={t.y}
                x2={780}
                y2={t.y}
                stroke="currentColor"
                className="text-gray-200 dark:text-gray-800"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
              <text
                x={52}
                y={t.y + 4}
                textAnchor="end"
                className="text-[11px] fill-gray-400 dark:fill-gray-500 font-mono font-medium"
              >
                {formatShortCurrency(t.val)}
              </text>
            </g>
          ))}

          {/* Area Fill */}
          {areaD && (
            <path
              d={areaD}
              fill="url(#salesGradient)"
              className="transition-all duration-300"
            />
          )}

          {/* Curve Stroke */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke="url(#salesStroke)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* X Axis Labels */}
          {points.map((pt, i) => {
            const step = points.length > 20 ? 4 : points.length > 10 ? 2 : 1;
            const isVisible = i % step === 0 || i === points.length - 1;
            if (!isVisible) return null;

            return (
              <text
                key={i}
                x={pt.x}
                y={252}
                textAnchor="middle"
                className="text-[11px] fill-gray-400 dark:fill-gray-500 font-medium"
              >
                {pt.data.label}
              </text>
            );
          })}

          {/* Interactive Crosshair & Points */}
          {activePoint && (
            <g>
              <line
                x1={activePoint.x}
                y1={25}
                x2={activePoint.x}
                y2={225}
                stroke="#3b82f6"
                strokeWidth="1.5"
                strokeDasharray="3 3"
                className="opacity-80"
              />
              <circle
                cx={activePoint.x}
                cy={activePoint.y}
                r="6"
                fill="#3b82f6"
                stroke="#ffffff"
                strokeWidth="2.5"
                className="filter drop-shadow-md animate-pulse"
              />
            </g>
          )}

          {/* Invisible hover trigger columns */}
          {points.map((pt, i) => {
            const colWidth = 800 / points.length;
            return (
              <rect
                key={i}
                x={pt.x - colWidth / 2}
                y={20}
                width={colWidth}
                height={215}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIndex(i)}
              />
            );
          })}
        </svg>

        {/* Floating Tooltip Card */}
        {activePoint && (
          <div
            className="pointer-events-none absolute z-20 transform -translate-x-1/2 -translate-y-full mb-3 transition-all duration-100 ease-out"
            style={{
              left: `${(activePoint.x / 800) * 100}%`,
              top: `${(activePoint.y / 260) * 100}%`,
            }}
          >
            <div className="bg-gray-900/95 dark:bg-gray-800/95 text-white backdrop-blur-md px-3.5 py-2.5 rounded-xl shadow-xl border border-gray-700/60 text-xs whitespace-nowrap min-w-[140px]">
              <div className="text-gray-400 font-medium border-b border-gray-700/80 pb-1 mb-1.5 flex items-center justify-between">
                <span>{activePoint.data.label}</span>
                <span className="text-[10px] uppercase tracking-wider font-semibold text-blue-400">
                  {period === 'today' || period === 'yesterday' ? 'Tramo horario' : 'Día'}
                </span>
              </div>
              <div className="text-base font-bold text-emerald-400 flex items-center gap-1">
                <span>${activePoint.data.revenue.toLocaleString('es-AR')}</span>
              </div>
              <div className="flex items-center justify-between gap-4 mt-1 text-[11px] text-gray-300">
                <span>{activePoint.data.ordersCount} {activePoint.data.ordersCount === 1 ? 'venta' : 'ventas'}</span>
                <span className="text-gray-400 font-mono">{activePoint.data.units} u. vendidas</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ==========================================================================
   2. PAYMENT METHODS DONUT CHART (Desglose de Formas de Cobro)
   ========================================================================== */
interface PaymentMethodsDonutProps {
  data: PaymentMethodStat[];
}

export function PaymentMethodsDonut({ data }: PaymentMethodsDonutProps) {
  const [hoveredMethod, setHoveredMethod] = useState<string | null>(null);

  const totalAmount = useMemo(() => {
    return data.reduce((acc, curr) => acc + curr.amount, 0);
  }, [data]);

  const size = 180;
  const radius = 66;
  const strokeWidth = 22;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedOffset = 0;
  const slices = data.map((item) => {
    const slicePercentage = item.percentage || (totalAmount > 0 ? (item.amount / totalAmount) * 100 : 0);
    const strokeDash = (slicePercentage / 100) * circumference;
    const strokeDashoffset = -accumulatedOffset;
    accumulatedOffset += strokeDash;

    return {
      ...item,
      strokeDash,
      strokeDashoffset,
      isHovered: hoveredMethod === item.method,
    };
  });

  const activeSlice = slices.find((s) => s.method === hoveredMethod);

  return (
    <div className="flex flex-col xl:flex-row items-center justify-between gap-5 w-full min-w-0">
      {/* SVG Donut */}
      <div className="relative flex-shrink-0 flex items-center justify-center my-2">
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-gray-100 dark:text-gray-800"
          />

          {slices.map((slice) => (
            <circle
              key={slice.method}
              cx={center}
              cy={center}
              r={radius}
              fill="transparent"
              stroke={slice.color}
              strokeWidth={slice.isHovered ? strokeWidth + 5 : strokeWidth}
              strokeDasharray={`${slice.strokeDash} ${circumference - slice.strokeDash}`}
              strokeDashoffset={slice.strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-200 cursor-pointer"
              onMouseEnter={() => setHoveredMethod(slice.method)}
              onMouseLeave={() => setHoveredMethod(null)}
            />
          ))}
        </svg>

        {/* Center Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-2">
          {activeSlice ? (
            <>
              <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 truncate max-w-[110px]">
                {activeSlice.label}
              </span>
              <span className="text-base font-bold text-gray-900 dark:text-white">
                ${activeSlice.amount.toLocaleString('es-AR')}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 mt-0.5 rounded-full text-white" style={{ backgroundColor: activeSlice.color }}>
                {activeSlice.percentage}%
              </span>
            </>
          ) : (
            <>
              <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                Recaudado
              </span>
              <span className="text-base font-black text-gray-900 dark:text-white">
                ${totalAmount.toLocaleString('es-AR')}
              </span>
              <span className="text-[11px] text-gray-400 dark:text-gray-500">
                {data.reduce((sum, d) => sum + d.count, 0)} cobros
              </span>
            </>
          )}
        </div>
      </div>

      {/* Legend & Breakdown List */}
      <div className="w-full flex-1 space-y-2 min-w-0">
        {data.map((item) => {
          const isHovered = hoveredMethod === item.method;
          return (
            <div
              key={item.method}
              className={`flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer border ${
                isHovered
                  ? 'bg-blue-50/70 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 shadow-sm'
                  : 'bg-gray-50/60 dark:bg-gray-800/40 border-transparent hover:border-gray-200 dark:hover:border-gray-700'
              }`}
              onMouseEnter={() => setHoveredMethod(item.method)}
              onMouseLeave={() => setHoveredMethod(null)}
            >
              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm"
                  style={{ backgroundColor: item.color }}
                />
                <div className="min-w-0 truncate">
                  <div className="text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
                    {item.label}
                  </div>
                  <div className="text-[11px] text-gray-400 dark:text-gray-500">
                    {item.count} {item.count === 1 ? 'operación' : 'operaciones'}
                  </div>
                </div>
              </div>

              <div className="text-right flex-shrink-0">
                <div className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white font-mono">
                  ${item.amount.toLocaleString('es-AR')}
                </div>
                <div className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                  {item.percentage}%
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ==========================================================================
   3. PEAK HOURS BAR CHART (Distribución Horaria y Horas Pico)
   ========================================================================== */
interface PeakHoursBarChartProps {
  data: HourlySalesStat[];
}

export function PeakHoursBarChart({ data }: PeakHoursBarChartProps) {
  const [hoveredHour, setHoveredHour] = useState<number | null>(null);

  const relevantHours = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data.filter((h) => h.hour >= 8 && h.hour <= 22);
  }, [data]);

  const maxAmount = useMemo(() => {
    return Math.max(...relevantHours.map((h) => h.amount), 100);
  }, [relevantHours]);

  const peakHour = useMemo(() => {
    if (relevantHours.length === 0) return null;
    return [...relevantHours].sort((a, b) => b.amount - a.amount)[0];
  }, [relevantHours]);

  return (
    <div className="space-y-4">
      {/* Banner de Hora Pico */}
      {peakHour && peakHour.amount > 0 && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 border border-amber-200/80 dark:border-amber-800/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold shadow-sm">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                Pico de Afluencia Comercial: <span className="underline font-bold">{peakHour.hourLabel}hs</span>
              </div>
              <div className="text-[11px] text-amber-700 dark:text-amber-400">
                Mayor facturación con ${peakHour.amount.toLocaleString('es-AR')} en {peakHour.ordersCount} ventas.
              </div>
            </div>
          </div>
          <span className="hidden sm:inline-block px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300">
            Horario Clave
          </span>
        </div>
      )}

      {/* Grid de Barras Horarias */}
      <div className="relative pt-6">
        <div className="h-44 flex items-end justify-between gap-1.5 sm:gap-2 px-1 border-b border-gray-200 dark:border-gray-800 pb-1">
          {relevantHours.map((h) => {
            const heightPercent = maxAmount > 0 ? Math.round((h.amount / maxAmount) * 100) : 0;
            const isPeak = peakHour && peakHour.hour === h.hour && h.amount > 0;
            const isHovered = hoveredHour === h.hour;

            return (
              <div
                key={h.hour}
                className="flex-1 flex flex-col items-center group relative h-full justify-end"
                onMouseEnter={() => setHoveredHour(h.hour)}
                onMouseLeave={() => setHoveredHour(null)}
              >
                {/* Tooltip flotante al hover */}
                {isHovered && (
                  <div className="absolute -top-14 z-20 pointer-events-none whitespace-nowrap bg-gray-900 dark:bg-gray-800 text-white text-xs px-2.5 py-1.5 rounded-lg shadow-xl border border-gray-700">
                    <div className="font-bold text-amber-400">{h.hourLabel} hs</div>
                    <div className="text-[11px]">${h.amount.toLocaleString('es-AR')} • {h.ordersCount} vtas.</div>
                  </div>
                )}

                {/* Barra */}
                <div
                  className={`w-full rounded-t-md transition-all duration-300 cursor-pointer ${
                    isPeak
                      ? 'bg-gradient-to-t from-amber-500 to-orange-400 shadow-md shadow-amber-500/20'
                      : isHovered
                      ? 'bg-blue-500 dark:bg-blue-400'
                      : 'bg-blue-400/70 dark:bg-blue-600/60 hover:bg-blue-500 dark:hover:bg-blue-500'
                  }`}
                  style={{
                    height: `${Math.max(heightPercent, 4)}%`,
                  }}
                />

                {/* Etiqueta de Hora */}
                <span
                  className={`text-[10px] mt-2 font-mono ${
                    isPeak
                      ? 'font-bold text-amber-600 dark:text-amber-400'
                      : 'text-gray-400 dark:text-gray-500'
                  }`}
                >
                  {h.hour}h
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================
   4. TOP PRODUCTS RANKING (Ranking de Productos Estrella y Rentabilidad)
   ========================================================================== */
interface TopProductsRankingProps {
  products: TopProductStat[];
  activeType: 'revenue' | 'units';
  onToggleType: (type: 'revenue' | 'units') => void;
}

export function TopProductsRanking({
  products,
  activeType,
  onToggleType,
}: TopProductsRankingProps) {
  const maxMetric = useMemo(() => {
    if (products.length === 0) return 1;
    return activeType === 'revenue'
      ? Math.max(...products.map((p) => p.totalRevenue), 1)
      : Math.max(...products.map((p) => p.unitsSold), 1);
  }, [products, activeType]);

  return (
    <div className="space-y-4">
      {/* Switch Facturación vs Unidades */}
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Top 10 Productos Más Vendidos
        </span>
        <div className="inline-flex p-0.5 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs">
          <button
            onClick={() => onToggleType('revenue')}
            className={`px-3 py-1 rounded-lg font-medium transition-all ${
              activeType === 'revenue'
                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-300 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Por Facturación ($)
          </button>
          <button
            onClick={() => onToggleType('units')}
            className={`px-3 py-1 rounded-lg font-medium transition-all ${
              activeType === 'units'
                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-300 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Por Cantidad (U.)
          </button>
        </div>
      </div>

      {/* Lista de Ranking */}
      <div className="space-y-3">
        {products.map((p, idx) => {
          const currentVal = activeType === 'revenue' ? p.totalRevenue : p.unitsSold;
          const barWidthPercent = Math.max(Math.round((currentVal / maxMetric) * 100), 4);

          // Medallas para el podio
          const badgeColor =
            idx === 0
              ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700'
              : idx === 1
              ? 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
              : idx === 2
              ? 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-700'
              : 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700';

          return (
            <div
              key={p.productId}
              className="p-3 rounded-xl bg-gray-50/70 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 hover:border-blue-200 dark:hover:border-blue-800 transition-all"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`w-6 h-6 rounded-lg text-xs font-bold border flex items-center justify-center flex-shrink-0 ${badgeColor}`}
                  >
                    {idx + 1}
                  </span>
                  <div className="truncate">
                    <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {p.name}
                    </div>
                    <div className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-2">
                      <span>{p.category}</span>
                      <span>•</span>
                      <span className="font-mono text-gray-600 dark:text-gray-400">{p.unitsSold} u. vendidas</span>
                    </div>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-bold text-gray-900 dark:text-white font-mono">
                    ${p.totalRevenue.toLocaleString('es-AR')}
                  </div>
                  <div className="text-xs flex items-center justify-end gap-1.5">
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold font-mono">
                      +${p.grossProfit.toLocaleString('es-AR')}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                      {p.profitMargin}% mg.
                    </span>
                  </div>
                </div>
              </div>

              {/* Barra de progreso */}
              <div className="mt-2.5 w-full bg-gray-200 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    idx === 0
                      ? 'bg-gradient-to-r from-amber-400 to-amber-500'
                      : 'bg-gradient-to-r from-blue-500 to-indigo-500'
                  }`}
                  style={{ width: `${barWidthPercent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
