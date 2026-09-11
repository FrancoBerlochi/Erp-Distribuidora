/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { 
  Printer, 
  Tag, 
  Search, 
  CheckSquare, 
  Square, 
  Sparkles, 
  Layers, 
  Settings2, 
  Package, 
  AlertTriangle, 
  Plus, 
  Minus, 
  RefreshCw,
  Eye,
  SlidersHorizontal,
  ChevronRight,
  ArrowLeft,
  Store
} from 'lucide-react';
import { useAdminProducts } from '@/lib/products-cache';
import { getPromoBadgeInfo } from '@/lib/promotions-engine';
import BarcodeSvg from '@/components/barcode-generator';

// Definición de Plantillas de Papel y Etiquetas
export interface LabelTemplate {
  id: 'a4_24' | 'a4_30' | 'a4_12' | 'thermal_50x30';
  name: string;
  description: string;
  cols: number;
  rows: number;
  labelsPerPage: number;
  paperType: 'A4' | 'Rollo Térmico';
  widthMm: number;
  heightMm: number;
  gridClass: string;
}

export const LABEL_TEMPLATES: Record<string, LabelTemplate> = {
  a4_24: {
    id: 'a4_24',
    name: 'Góndola Estándar (A4 - 24 etiquetas)',
    description: '3 columnas × 8 filas (~70×37 mm). Formato clásico para estantes de supermercados.',
    cols: 3,
    rows: 8,
    labelsPerPage: 24,
    paperType: 'A4',
    widthMm: 70,
    heightMm: 37,
    gridClass: 'grid-cols-3',
  },
  a4_30: {
    id: 'a4_30',
    name: 'Góndola Compacta (A4 - 30 etiquetas)',
    description: '3 columnas × 10 filas (~70×29.7 mm). Ideal para estanterías con alta densidad de artículos.',
    cols: 3,
    rows: 10,
    labelsPerPage: 30,
    paperType: 'A4',
    widthMm: 70,
    heightMm: 29.7,
    gridClass: 'grid-cols-3',
  },
  a4_12: {
    id: 'a4_12',
    name: 'Oferta / Mayorista Grande (A4 - 12 etiquetas)',
    description: '2 columnas × 6 filas (~105×49.5 mm). Ideal para punteras de góndola, canastos y pallets.',
    cols: 2,
    rows: 6,
    labelsPerPage: 12,
    paperType: 'A4',
    widthMm: 105,
    heightMm: 49.5,
    gridClass: 'grid-cols-2',
  },
  thermal_50x30: {
    id: 'thermal_50x30',
    name: 'Rollo Térmico Continuo (50×30 mm)',
    description: 'Para impresoras térmicas de etiquetas (Zebra, Xprinter, Honeywell). 1 etiqueta por página.',
    cols: 1,
    rows: 1,
    labelsPerPage: 1,
    paperType: 'Rollo Térmico',
    widthMm: 50,
    heightMm: 30,
    gridClass: 'grid-cols-1',
  },
};

export default function EtiquetasPage() {
  const { products, loading } = useAdminProducts();

  // Estados de Configuración y Plantilla
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<'a4_24' | 'a4_30' | 'a4_12' | 'thermal_50x30'>('a4_24');
  const [startingOffset, setStartingOffset] = useState<number>(0);
  const [storeName, setStoreName] = useState<string>('Distribuidora Express');
  
  // Opciones de Visualización en Etiqueta
  const [showBarcode, setShowBarcode] = useState<boolean>(true);
  const [showWholesale, setShowWholesale] = useState<boolean>(true);
  const [showPromos, setShowPromos] = useState<boolean>(true);
  const [showDate, setShowDate] = useState<boolean>(true);
  const [showStoreName, setShowStoreName] = useState<boolean>(true);
  const [showSupplier, setShowSupplier] = useState<boolean>(false);
  const [showBatchExpiration, setShowBatchExpiration] = useState<boolean>(true);
  const [batchInfo, setBatchInfo] = useState<{ batchCode: string; expirationDate: string } | null>(null);

  // Leer parámetros URL (para redirección directa desde /dashboard/vencimientos)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const prodId = params.get('product');
      const batchCode = params.get('batch');
      const vtoDate = params.get('vto');

      if (prodId) {
        setSelectedQuantities((prev) => ({ ...prev, [prodId]: Math.max(1, prev[prodId] || 1) }));
      }
      if (batchCode || vtoDate) {
        setBatchInfo({
          batchCode: batchCode || 'S/L',
          expirationDate: vtoDate || '',
        });
        setShowBatchExpiration(true);
      }
    }
  }, [products]);

  // Filtros de Artículos
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState<'all' | 'promos' | 'wholesale' | 'critical' | 'selected'>('all');

  // Cantidad seleccionada por producto: { [productId]: quantity }
  const [selectedQuantities, setSelectedQuantities] = useState<Record<string, number>>({});

  // Modo de vista: 'editor' (dividido) o 'preview_sheet' (hoja A4 completa)
  const [viewMode, setViewMode] = useState<'editor' | 'preview_sheet'>('editor');

  const currentTemplate = LABEL_TEMPLATES[selectedTemplateKey];

  // Lista de categorías únicas
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => {
      if (p.category && p.category.trim() !== '') {
        set.add(p.category.trim());
      }
    });
    return Array.from(set).sort();
  }, [products]);

  // Productos filtrados según búsqueda y filtros rápidos
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      // Búsqueda de texto
      const q = searchQuery.toLowerCase().trim();
      const matchQuery = !q || 
        p.name.toLowerCase().includes(q) || 
        (p.barcode && p.barcode.includes(q)) || 
        (p.category && p.category.toLowerCase().includes(q));

      if (!matchQuery) return false;

      // Filtro por categoría
      if (categoryFilter !== 'ALL' && p.category !== categoryFilter) return false;

      // Filtro por tipo
      if (typeFilter === 'promos') {
        return Boolean(p.discount_percentage || (p.promo_type && p.promo_type !== 'none'));
      }
      if (typeFilter === 'wholesale') {
        return Boolean(p.wholesale_price && Number(p.wholesale_price) > 0);
      }
      if (typeFilter === 'critical') {
        const minStock = p.min_stock ?? 5;
        return Number(p.stock || 0) <= minStock;
      }
      if (typeFilter === 'selected') {
        return (selectedQuantities[p.id] || 0) > 0;
      }

      return true;
    });
  }, [products, searchQuery, categoryFilter, typeFilter, selectedQuantities]);

  // Modificar cantidad de etiquetas para un producto
  const setProductQty = (productId: string, qty: number) => {
    setSelectedQuantities(prev => {
      const next = { ...prev };
      if (qty <= 0) {
        delete next[productId];
      } else {
        next[productId] = qty;
      }
      return next;
    });
  };

  const incrementQty = (productId: string) => {
    setProductQty(productId, (selectedQuantities[productId] || 0) + 1);
  };

  const decrementQty = (productId: string) => {
    setProductQty(productId, Math.max(0, (selectedQuantities[productId] || 0) - 1));
  };

  // Seleccionar / Deseleccionar todos los visibles
  const selectAllVisible = () => {
    const allSelected = filteredProducts.every(p => (selectedQuantities[p.id] || 0) > 0);
    setSelectedQuantities(prev => {
      const next = { ...prev };
      if (allSelected) {
        filteredProducts.forEach(p => { delete next[p.id]; });
      } else {
        filteredProducts.forEach(p => {
          if (!next[p.id]) next[p.id] = 1;
        });
      }
      return next;
    });
  };

  // Seleccionar según Stock Actual (1 etiqueta por cada unidad en stock, o mínimo 1)
  const selectByStock = () => {
    setSelectedQuantities(prev => {
      const next = { ...prev };
      filteredProducts.forEach(p => {
        const stockUnits = Math.max(1, Math.min(20, Number(p.stock || 1)));
        next[p.id] = stockUnits;
      });
      return next;
    });
  };

  // Limpiar toda la selección
  const clearSelection = () => {
    setSelectedQuantities({});
  };

  // Lista expandida de etiquetas a imprimir: cada producto repetido según su cantidad
  const labelsToPrint = useMemo(() => {
    const list: any[] = [];
    products.forEach(p => {
      const qty = selectedQuantities[p.id] || 0;
      for (let i = 0; i < qty; i++) {
        list.push(p);
      }
    });
    return list;
  }, [products, selectedQuantities]);

  // Cuadrícula con offsets (huecos vacíos al inicio para reutilizar hojas A4 usadas)
  const gridItemsWithOffset = useMemo(() => {
    const items: (any | null)[] = [];
    // Agregar huecos vacíos según startingOffset (solo para hojas A4)
    if (currentTemplate.paperType === 'A4') {
      for (let i = 0; i < startingOffset; i++) {
        items.push(null);
      }
    }
    // Agregar las etiquetas reales
    items.push(...labelsToPrint);
    return items;
  }, [labelsToPrint, startingOffset, currentTemplate]);

  // Agrupar en páginas A4
  const paginatedSheets = useMemo(() => {
    if (currentTemplate.paperType === 'Rollo Térmico') {
      return [gridItemsWithOffset];
    }
    const sheets: (any | null)[][] = [];
    const perPage = currentTemplate.labelsPerPage;
    for (let i = 0; i < gridItemsWithOffset.length; i += perPage) {
      sheets.push(gridItemsWithOffset.slice(i, i + perPage));
    }
    return sheets.length > 0 ? sheets : [[]];
  }, [gridItemsWithOffset, currentTemplate]);

  const totalLabelsCount = labelsToPrint.length;
  const totalSheetsCount = paginatedSheets.length;

  // Disparar Impresión Nativa
  const handlePrint = () => {
    if (totalLabelsCount === 0) {
      alert('Selecciona al menos un producto para imprimir etiquetas.');
      return;
    }
    window.print();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* CSS GLOBAL ESPECÍFICO PARA IMPRESIÓN (@media print) */}
      <style jsx global>{`
        @media print {
          /* Ocultar todo lo que no sea el contenedor de impresión */
          body * {
            visibility: hidden;
          }
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 0;
            background: #ffffff !important;
            color: #000000 !important;
          }
          .no-print {
            display: none !important;
          }
          .print-page {
            page-break-after: always;
            break-after: page;
            margin: 0 !important;
            padding: 4mm !important;
            box-shadow: none !important;
            border: none !important;
            background: #ffffff !important;
            width: 100% !important;
            height: auto !important;
          }
          .print-page:last-child {
            page-break-after: auto;
            break-after: auto;
          }
          /* Bordes de corte suaves para la hoja autoadhesiva */
          .label-box {
            border: 1px dashed #d1d5db !important;
            page-break-inside: avoid;
            break-inside: avoid;
            background: #ffffff !important;
            color: #000000 !important;
          }
        }
      `}</style>

      {/* CABECERA PRINCIPAL (NO-PRINT) */}
      <div className="no-print flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Tag className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                Impresor de Etiquetas de Góndola
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Genera etiquetas de precios, promociones y códigos de barra para estantes, góndolas y canastos.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/dashboard/products"
            className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a Productos
          </Link>

          <button
            onClick={handlePrint}
            disabled={totalLabelsCount === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-xl shadow-sm transition-all disabled:opacity-50 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Imprimir {totalLabelsCount > 0 ? `(${totalLabelsCount})` : ''}
          </button>
        </div>
      </div>

      {/* METRICAS Y RESUMEN RÁPIDO (NO-PRINT) */}
      <div className="no-print grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Etiquetas a Imprimir
            </p>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">
              {totalLabelsCount} u.
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              De {Object.keys(selectedQuantities).length} artículo(s) seleccionados
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Tag className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Hojas Requeridas
            </p>
            <h3 className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-0.5">
              {totalLabelsCount > 0 ? totalSheetsCount : 0} {currentTemplate.paperType === 'A4' ? 'hoja(s) A4' : 'etiqueta(s)'}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Plantilla: {currentTemplate.labelsPerPage} por hoja
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Plantilla Seleccionada
            </p>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mt-1 line-clamp-1">
              {currentTemplate.name}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Tamaño: ~{currentTemplate.widthMm}×{currentTemplate.heightMm} mm
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Settings2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Offset Inicial (Descarte)
            </p>
            <h3 className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-0.5">
              Etiqueta #{startingOffset + 1}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {startingOffset > 0 ? `Saltea las primeras ${startingOffset} posiciones` : 'Comienza desde el inicio'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <SlidersHorizontal className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* PANEL DE CONTROL DE PLANTILLAS Y OPCIONES DE DISEÑO (NO-PRINT) */}
      <div className="no-print bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-4">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-amber-500" />
              Configuración de la Etiqueta y Papel
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Personaliza el formato de la hoja y los datos visibles en cada etiqueta de góndola.
            </p>
          </div>

          {/* Selector de Plantilla */}
          <div className="flex items-center gap-2 w-full lg:w-auto">
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">
              Formato de Papel:
            </span>
            <select
              value={selectedTemplateKey}
              onChange={(e) => {
                setSelectedTemplateKey(e.target.value as any);
                setStartingOffset(0); // Resetear offset al cambiar plantilla
              }}
              className="px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500"
            >
              {Object.values(LABEL_TEMPLATES).map(tmpl => (
                <option key={tmpl.id} value={tmpl.id}>
                  {tmpl.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Switches de Contenido Visible y Offset */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-1 text-xs">
          <label className="flex items-center gap-2 text-gray-700 dark:text-gray-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showBarcode}
              onChange={e => setShowBarcode(e.target.checked)}
              className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400"
            />
            <span>Código de Barras</span>
          </label>

          <label className="flex items-center gap-2 text-gray-700 dark:text-gray-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showWholesale}
              onChange={e => setShowWholesale(e.target.checked)}
              className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400"
            />
            <span>Precio Mayorista</span>
          </label>

          <label className="flex items-center gap-2 text-gray-700 dark:text-gray-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showPromos}
              onChange={e => setShowPromos(e.target.checked)}
              className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400"
            />
            <span>Promociones (2x1)</span>
          </label>

          <label className="flex items-center gap-2 text-gray-700 dark:text-gray-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showDate}
              onChange={e => setShowDate(e.target.checked)}
              className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400"
            />
            <span>Fecha / Control</span>
          </label>

          <label className="flex items-center gap-2 text-gray-700 dark:text-gray-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showStoreName}
              onChange={e => setShowStoreName(e.target.checked)}
              className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400"
            />
            <span>Nombre Comercio</span>
          </label>

          <label className="flex items-center gap-2 text-gray-700 dark:text-gray-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showSupplier}
              onChange={e => setShowSupplier(e.target.checked)}
              className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400"
            />
            <span>Proveedor</span>
          </label>

          <label className="flex items-center gap-2 text-gray-700 dark:text-gray-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showBatchExpiration}
              onChange={e => setShowBatchExpiration(e.target.checked)}
              className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400"
            />
            <span>Lote / Vencimiento</span>
          </label>
        </div>

        {/* Offset para reutilizar hojas A4 empezadas */}
        {currentTemplate.paperType === 'A4' && (
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-600 dark:text-gray-400">
            <span className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-1">
              ♻️ Reutilizar hoja empezada:
            </span>
            <span>Comenzar en la etiqueta:</span>
            <div className="inline-flex items-center gap-1">
              <select
                value={startingOffset}
                onChange={e => setStartingOffset(Number(e.target.value))}
                className="px-2.5 py-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg font-bold text-gray-900 dark:text-white"
              >
                {Array.from({ length: currentTemplate.labelsPerPage }).map((_, idx) => (
                  <option key={idx} value={idx}>
                    #{idx + 1} {idx === 0 ? '(Inicio de hoja)' : `(Saltear ${idx})`}
                  </option>
                ))}
              </select>
            </div>
            <span className="text-[11px] text-gray-400 italic">
              (Deja en blanco las etiquetas ya utilizadas de tu hoja autoadhesiva)
            </span>
          </div>
        )}
      </div>

      {/* CUERPO PRINCIPAL: SELECTOR DE PRODUCTOS + VISTA PREVIA (NO-PRINT) */}
      <div className="no-print grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* COLUMNA IZQUIERDA: LISTA Y SELECTOR DE PRODUCTOS (5 COLS) */}
        <div className="lg:col-span-5 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-4 space-y-4 flex flex-col h-[750px]">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800">
            <div>
              <h4 className="font-bold text-gray-900 dark:text-white text-sm">
                Artículos del Catálogo
              </h4>
              <p className="text-xs text-gray-500">
                Selecciona la cantidad de etiquetas a generar por cada artículo
              </p>
            </div>
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-lg">
              {filteredProducts.length} prod.
            </span>
          </div>

          {/* Buscador y Filtros */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar por nombre, código o EAN..."
                className="w-full pl-8 pr-3 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="w-1/2 px-2 py-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-800 dark:text-gray-200"
              >
                <option value="ALL">Todas las Categorías</option>
                {categories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value as any)}
                className="w-1/2 px-2 py-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-800 dark:text-gray-200"
              >
                <option value="all">Todos los Tipos</option>
                <option value="promos">Solo Promos (2x1...)</option>
                <option value="wholesale">Con Precio Mayorista</option>
                <option value="critical">Stock Crítico</option>
                <option value="selected">Solo Seleccionados ({Object.keys(selectedQuantities).length})</option>
              </select>
            </div>

            {/* Acciones Rápidas de Selección */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={selectAllVisible}
                  className="px-2.5 py-1 text-[11px] font-semibold bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                >
                  {filteredProducts.every(p => (selectedQuantities[p.id] || 0) > 0)
                    ? 'Deseleccionar Visibles'
                    : 'Marcar Visibles (1 c/u)'}
                </button>
                <button
                  type="button"
                  onClick={selectByStock}
                  className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-400 rounded-lg transition-colors"
                  title="Asigna tantas etiquetas como unidades haya en stock (máx 20)"
                >
                  Según Stock
                </button>
              </div>

              {Object.keys(selectedQuantities).length > 0 && (
                <button
                  type="button"
                  onClick={clearSelection}
                  className="text-[11px] text-red-600 dark:text-red-400 hover:underline"
                >
                  Limpiar ({totalLabelsCount})
                </button>
              )}
            </div>
          </div>

          {/* Tabla Desplazable de Artículos */}
          <div className="flex-1 overflow-y-auto border border-gray-100 dark:border-gray-800 rounded-xl divide-y divide-gray-100 dark:divide-gray-800">
            {loading ? (
              <div className="p-8 text-center text-gray-400 text-xs">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-500" />
                Cargando catálogo...
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-xs">
                No se encontraron artículos con este filtro.
              </div>
            ) : (
              filteredProducts.map(p => {
                const qty = selectedQuantities[p.id] || 0;
                const isSelected = qty > 0;
                const promo = getPromoBadgeInfo(p);

                return (
                  <div
                    key={p.id}
                    className={`p-3 flex items-center justify-between gap-3 transition-colors ${
                      isSelected 
                        ? 'bg-amber-50/50 dark:bg-amber-950/20' 
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800/40'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h5 className="text-xs font-bold text-gray-900 dark:text-white truncate">
                          {p.name}
                        </h5>
                        {promo && (
                          <span className={`px-1.5 py-0.2 text-[9px] font-black rounded border shrink-0 ${promo.bgClass} ${promo.textClass} ${promo.borderClass}`}>
                            {promo.shortText}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
                        <strong className="text-gray-900 dark:text-white">
                          ${Number(p.price || 0).toLocaleString('es-AR')}
                        </strong>
                        {p.wholesale_price && Number(p.wholesale_price) > 0 && (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                            May: ${Number(p.wholesale_price).toLocaleString('es-AR')}
                          </span>
                        )}
                        {p.barcode && (
                          <span className="font-mono text-[10px] text-gray-400">
                            EAN: {p.barcode}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Selector de Cantidad */}
                    <div className="flex items-center gap-1 shrink-0">
                      {isSelected ? (
                        <div className="inline-flex items-center border border-amber-300 dark:border-amber-700 bg-white dark:bg-gray-900 rounded-lg overflow-hidden">
                          <button
                            type="button"
                            onClick={() => decrementQty(p.id)}
                            className="px-2 py-1 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 text-gray-700 dark:text-gray-300 font-bold text-xs"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="0"
                            max="99"
                            value={qty}
                            onChange={e => setProductQty(p.id, parseInt(e.target.value) || 0)}
                            className="w-10 text-center font-bold text-xs text-amber-600 dark:text-amber-400 bg-transparent focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => incrementQty(p.id)}
                            className="px-2 py-1 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 text-gray-700 dark:text-gray-300 font-bold text-xs"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setProductQty(p.id, 1)}
                          className="px-3 py-1 bg-gray-100 dark:bg-gray-800 hover:bg-amber-500 hover:text-white text-gray-700 dark:text-gray-300 text-xs font-semibold rounded-lg transition-colors"
                        >
                          + 1 etiqueta
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* COLUMNA DERECHA: VISTA PREVIA INTERACTIVA (7 COLS) */}
        <div className="lg:col-span-7 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-4 space-y-4 flex flex-col h-[750px]">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800">
            <div>
              <h4 className="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-2">
                <Eye className="w-4 h-4 text-amber-500" />
                Vista Previa de Impresión
              </h4>
              <p className="text-xs text-gray-500">
                Visualización fidedigna de cómo se estamparán las etiquetas en el papel
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                disabled={totalLabelsCount === 0}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-sm transition-all disabled:opacity-50 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                Imprimir Todo
              </button>
            </div>
          </div>

          {/* Contenedor de Hoja con Scroll */}
          <div className="flex-1 overflow-y-auto bg-gray-100 dark:bg-gray-950 p-4 rounded-xl border border-gray-200 dark:border-gray-800 flex justify-center">
            {totalLabelsCount === 0 ? (
              <div className="m-auto text-center text-gray-400 p-8">
                <Tag className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-700" />
                <h5 className="font-bold text-gray-600 dark:text-gray-300 text-sm">
                  No hay etiquetas seleccionadas
                </h5>
                <p className="text-xs mt-1 max-w-sm">
                  Utiliza el panel de la izquierda para seleccionar qué artículos y cuántas etiquetas deseas imprimir.
                </p>
              </div>
            ) : (
              <div className="space-y-6 w-full max-w-2xl">
                {paginatedSheets.map((sheetItems, sheetIdx) => (
                  <div
                    key={sheetIdx}
                    className="bg-white text-gray-900 p-4 rounded-xl shadow-md border border-gray-300 space-y-2"
                  >
                    <div className="flex items-center justify-between text-[11px] font-semibold text-gray-400 border-b border-gray-200 pb-1.5 mb-2">
                      <span>PÁGINA {sheetIdx + 1} DE {totalSheetsCount}</span>
                      <span>{currentTemplate.name}</span>
                    </div>

                    {/* Grilla según la plantilla */}
                    <div className={`grid ${currentTemplate.gridClass} gap-2`}>
                      {sheetItems.map((prod, itemIdx) => {
                        if (!prod) {
                          // Posición vacía por offset
                          return (
                            <div
                              key={`offset-${itemIdx}`}
                              className="border border-dashed border-gray-200 rounded-lg p-3 text-center flex items-center justify-center min-h-[100px] text-[10px] text-gray-300 italic"
                            >
                              [Posición vacía #{itemIdx + 1}]
                            </div>
                          );
                        }

                        const promo = getPromoBadgeInfo(prod);

                        return (
                          <div
                            key={`label-${sheetIdx}-${itemIdx}`}
                            className="label-box border border-gray-300 rounded-lg p-2.5 flex flex-col justify-between bg-white text-gray-900 relative min-h-[110px]"
                          >
                            {/* Encabezado: Marca / Proveedor y Fecha */}
                            <div className="flex items-center justify-between text-[9px] text-gray-500 font-medium border-b border-gray-100 pb-1 mb-1">
                              {showStoreName && (
                                <span className="font-bold uppercase tracking-wider text-gray-700 truncate max-w-[120px]">
                                  {storeName}
                                </span>
                              )}
                              {showSupplier && prod.supplier_name && (
                                <span className="truncate max-w-[80px]">
                                  {prod.supplier_name}
                                </span>
                              )}
                              {showDate && (
                                <span className="font-mono text-gray-400 ml-auto">
                                  {new Date().toLocaleDateString('es-AR', { month: '2-digit', year: '2-digit' })}
                                </span>
                              )}
                            </div>

                            {/* Nombre del Producto */}
                            <div className="my-0.5">
                              <h5 className="font-black text-xs leading-tight text-gray-900 line-clamp-2">
                                {prod.name}
                              </h5>
                              {prod.category && (
                                <span className="text-[9px] text-gray-500 uppercase tracking-wider block">
                                  {prod.category}
                                </span>
                              )}
                            </div>

                            {/* Precios y Promociones */}
                            <div className="my-1 flex items-baseline justify-between gap-1">
                              <div>
                                <span className="text-[10px] font-bold text-gray-400 mr-0.5">$</span>
                                <span className="text-xl font-black text-gray-950 tracking-tight">
                                  {Number(prod.price || 0).toLocaleString('es-AR', { minimumFractionDigits: 0 })}
                                </span>
                              </div>

                              {showWholesale && prod.wholesale_price && Number(prod.wholesale_price) > 0 && (
                                <div className="text-right">
                                  <span className="text-[8px] uppercase font-bold text-emerald-700 block">
                                    Mayorista x{prod.wholesale_min_qty || 6}+
                                  </span>
                                  <span className="text-xs font-black text-emerald-800">
                                    ${Number(prod.wholesale_price).toLocaleString('es-AR')}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Badge de Promoción si aplica */}
                            {showPromos && promo && (
                              <div className="my-0.5 bg-black text-white text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded text-center">
                                ★ {promo.shortText} ★
                              </div>
                            )}

                            {/* Lote y Vencimiento para perecederos */}
                            {showBatchExpiration && batchInfo && (
                              <div className="my-0.5 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 text-[8px] font-mono font-bold px-1 py-0.5 rounded text-center">
                                LOTE: {batchInfo.batchCode} • VTO: {batchInfo.expirationDate}
                              </div>
                            )}

                            {/* Código de Barras */}
                            {showBarcode && (
                              <div className="mt-1 pt-1 border-t border-gray-100 flex justify-center">
                                <BarcodeSvg
                                  value={prod.barcode || prod.id}
                                  height={22}
                                  width={1.2}
                                  fontSize={8}
                                  displayValue={Boolean(prod.barcode)}
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ÁREA DE IMPRESIÓN PURA (SOLO VISIBLE EN @MEDIA PRINT)                     */}
      {/* ========================================================================= */}
      <div id="print-area">
        {paginatedSheets.map((sheetItems, sheetIdx) => (
          <div
            key={`print-sheet-${sheetIdx}`}
            className="print-page bg-white text-black"
          >
            <div className={`grid ${currentTemplate.gridClass} gap-1.5`}>
              {sheetItems.map((prod, itemIdx) => {
                if (!prod) {
                  return (
                    <div
                      key={`print-blank-${itemIdx}`}
                      className="border border-dashed border-gray-200 min-h-[95px]"
                    />
                  );
                }

                const promo = getPromoBadgeInfo(prod);

                return (
                  <div
                    key={`print-lbl-${sheetIdx}-${itemIdx}`}
                    className="label-box p-2 border border-gray-400 flex flex-col justify-between bg-white text-black min-h-[105px]"
                  >
                    {/* Header: Comercio y Fecha */}
                    <div className="flex items-center justify-between text-[8px] font-bold border-b border-gray-200 pb-0.5 mb-1 text-gray-700">
                      {showStoreName && <span>{storeName.toUpperCase()}</span>}
                      {showDate && (
                        <span className="font-mono">
                          {new Date().toLocaleDateString('es-AR', { month: '2-digit', year: '2-digit' })}
                        </span>
                      )}
                    </div>

                    {/* Nombre */}
                    <h5 className="font-black text-[11px] leading-tight text-black line-clamp-2">
                      {prod.name}
                    </h5>

                    {/* Precios */}
                    <div className="my-1 flex items-baseline justify-between">
                      <div>
                        <span className="text-[9px] font-bold mr-0.5">$</span>
                        <span className="text-lg font-black text-black">
                          {Number(prod.price || 0).toLocaleString('es-AR', { minimumFractionDigits: 0 })}
                        </span>
                      </div>

                      {showWholesale && prod.wholesale_price && Number(prod.wholesale_price) > 0 && (
                        <div className="text-right">
                          <span className="text-[8px] font-bold block">
                            MAY. x{prod.wholesale_min_qty || 6}+
                          </span>
                          <span className="text-xs font-black">
                            ${Number(prod.wholesale_price).toLocaleString('es-AR')}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Promo */}
                    {showPromos && promo && (
                      <div className="bg-black text-white text-[8px] font-black uppercase text-center py-0.5 my-0.5">
                        {promo.shortText}
                      </div>
                    )}

                    {/* Lote y Vencimiento para perecederos en impresión */}
                    {showBatchExpiration && batchInfo && (
                      <div className="border border-black text-black text-[8px] font-mono font-bold text-center py-0.5 my-0.5">
                        LOTE: {batchInfo.batchCode} • VTO: {batchInfo.expirationDate}
                      </div>
                    )}

                    {/* Código de barras */}
                    {showBarcode && (
                      <div className="mt-0.5 pt-0.5 border-t border-gray-200 flex justify-center">
                        <BarcodeSvg
                          value={prod.barcode || prod.id}
                          height={20}
                          width={1.1}
                          fontSize={8}
                          displayValue={Boolean(prod.barcode)}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
