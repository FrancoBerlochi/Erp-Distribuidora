/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  CalendarClock, Plus, Search, Filter, AlertTriangle, AlertOctagon, 
  CheckCircle2, Clock, Trash2, Tag, RefreshCw, Layers, MapPin, 
  Sparkles, DollarSign, Package, X, ArrowRight, ShieldCheck, 
  Printer, Percent, HelpCircle
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useAdminProducts } from '@/lib/products-cache';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { 
  ProductBatch, 
  BatchUrgency, 
  BATCH_URGENCY_CONFIG, 
  fetchProductBatches, 
  createProductBatch, 
  recordBatchWaste, 
  applyClearanceDiscount, 
  getDaysUntilExpiration, 
  getBatchUrgency, 
  suggestBatchCode 
} from '@/lib/batches-service';

export default function VencimientosPage() {
  const { products } = useAdminProducts();
  const [batches, setBatches] = useState<ProductBatch[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [urgencyFilter, setUrgencyFilter] = useState<'all' | BatchUrgency>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modales
  const [isNewBatchModalOpen, setIsNewBatchModalOpen] = useState(false);
  const [selectedBatchForWaste, setSelectedBatchForWaste] = useState<ProductBatch | null>(null);
  const [selectedBatchForPromo, setSelectedBatchForPromo] = useState<ProductBatch | null>(null);

  // Formulario de Nuevo Lote
  const [newBatchForm, setNewBatchForm] = useState({
    productId: '',
    batchCode: '',
    expirationDate: '',
    manufacturingDate: '',
    quantity: 10,
    costPrice: '',
    location: 'Depósito Central',
    notes: '',
    updateProductStock: true,
  });
  const [savingBatch, setSavingBatch] = useState(false);

  // Formulario de Merma
  const [wasteQuantity, setWasteQuantity] = useState(1);
  const [wasteReason, setWasteReason] = useState('Mercadería vencida');
  const [savingWaste, setSavingWaste] = useState(false);

  // Formulario de Promo
  const [promoPercentage, setPromoPercentage] = useState(30);
  const [savingPromo, setSavingPromo] = useState(false);

  useEffect(() => {
    loadBatches();
  }, []);

  async function loadBatches() {
    setLoading(true);
    const res = await fetchProductBatches();
    setBatches(res.data);
    setLoading(false);
  }

  function handleOpenNewBatchModal(preselectedProductId?: string) {
    setNewBatchForm({
      productId: preselectedProductId || (products[0]?.id || ''),
      batchCode: suggestBatchCode(),
      expirationDate: '',
      manufacturingDate: '',
      quantity: 12,
      costPrice: '',
      location: 'Depósito Central',
      notes: '',
      updateProductStock: true,
    });
    setIsNewBatchModalOpen(true);
  }

  async function handleCreateBatch(e: React.FormEvent) {
    e.preventDefault();
    if (!newBatchForm.productId) {
      toast.warn('Debes seleccionar un producto.');
      return;
    }
    if (!newBatchForm.expirationDate) {
      toast.warn('Debes especificar la fecha de vencimiento.');
      return;
    }
    if (!newBatchForm.batchCode.trim()) {
      toast.warn('El código de lote es obligatorio.');
      return;
    }

    setSavingBatch(true);
    const prod = products.find(p => p.id === newBatchForm.productId);

    const res = await createProductBatch({
      product_id: newBatchForm.productId,
      batch_code: newBatchForm.batchCode,
      expiration_date: newBatchForm.expirationDate,
      manufacturing_date: newBatchForm.manufacturingDate || undefined,
      quantity: Number(newBatchForm.quantity) || 1,
      cost_price: newBatchForm.costPrice ? Number(newBatchForm.costPrice) : undefined,
      location: newBatchForm.location,
      notes: newBatchForm.notes,
      updateProductStock: newBatchForm.updateProductStock,
      productData: prod ? {
        id: prod.id,
        name: prod.name,
        category: prod.category,
        barcode: prod.barcode,
        price: prod.price,
        cost_price: prod.cost_price,
        stock: prod.stock,
        image_url_1: prod.image_url_1,
      } : undefined,
    });

    setSavingBatch(false);

    if (res.data) {
      toast.success(`Lote #${res.data.batch_code} registrado correctamente.`);
      setIsNewBatchModalOpen(false);
      loadBatches();
    } else {
      toast.error('Error al registrar el lote: ' + (res.error?.message || 'Error'));
    }
  }

  async function handleConfirmWaste(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedBatchForWaste) return;

    setSavingWaste(true);
    const res = await recordBatchWaste(
      selectedBatchForWaste,
      Number(wasteQuantity),
      wasteReason
    );
    setSavingWaste(false);

    if (res.success) {
      toast.success(`Merma de ${wasteQuantity} un. registrada en Kardex por ${wasteReason}.`);
      setSelectedBatchForWaste(null);
      loadBatches();
    } else {
      toast.error('Error al registrar merma: ' + (res.error || 'Error'));
    }
  }

  async function handleApplyPromo(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedBatchForPromo) return;

    setSavingPromo(true);
    const res = await applyClearanceDiscount(
      selectedBatchForPromo.product_id,
      Number(promoPercentage)
    );
    setSavingPromo(false);

    if (res.success) {
      toast.success(`¡Oferta del ${promoPercentage}% de descuento aplicada para liquidar el lote!`);
      setSelectedBatchForPromo(null);
      loadBatches();
    } else {
      toast.error('Error al aplicar oferta: ' + (res.error || 'Error'));
    }
  }

  // Métricas y semáforos de lotes activos
  const activeBatches = batches.filter(b => b.status === 'active' && b.current_quantity > 0);

  const kpis = useMemo(() => {
    let expired = 0;
    let critical = 0;
    let warning = 0;
    let ok = 0;

    activeBatches.forEach(b => {
      const urgency = getBatchUrgency(b.expiration_date);
      if (urgency === 'expired') expired++;
      else if (urgency === 'critical') critical++;
      else if (urgency === 'warning') warning++;
      else ok++;
    });

    return {
      total: activeBatches.length,
      expired,
      critical,
      warning,
      ok,
    };
  }, [activeBatches]);

  // Categorías presentes en los lotes
  const categories = useMemo(() => {
    const set = new Set<string>();
    batches.forEach(b => {
      if (b.products?.category) set.add(b.products.category);
    });
    return Array.from(set).sort();
  }, [batches]);

  // Lotes filtrados
  const filteredBatches = useMemo(() => {
    return activeBatches.filter(b => {
      // Filtro de urgencia
      if (urgencyFilter !== 'all') {
        const u = getBatchUrgency(b.expiration_date);
        if (u !== urgencyFilter) return false;
      }

      // Filtro de categoría
      if (categoryFilter !== 'all') {
        if (b.products?.category !== categoryFilter) return false;
      }

      // Búsqueda
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = b.products?.name?.toLowerCase().includes(q);
        const matchCode = b.batch_code?.toLowerCase().includes(q);
        const matchBarcode = b.products?.barcode?.toLowerCase().includes(q);
        const matchLoc = b.location?.toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchBarcode && !matchLoc) return false;
      }

      return true;
    });
  }, [activeBatches, urgencyFilter, categoryFilter, searchQuery]);

  return (
    <div className="h-full flex flex-col min-h-0 space-y-4">
      {/* Cabecera Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-shrink-0">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>Lotes y Vencimientos</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> FEFO Activo
            </span>
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Monitoreo preventivo por semáforo, trazabilidad por lote y liquidación anticipada de perecederos
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadBatches}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            title="Refrescar lotes"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-primary' : ''}`} />
            <span>Refrescar</span>
          </button>

          <button
            onClick={() => handleOpenNewBatchModal()}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-primary text-white hover:bg-blue-700 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Lote</span>
          </button>
        </div>
      </div>

      {/* Tarjetas KPI de Semáforo Preventivo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 flex-shrink-0">
        {/* 1. Lotes Vencidos */}
        <div 
          onClick={() => setUrgencyFilter(urgencyFilter === 'expired' ? 'all' : 'expired')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            urgencyFilter === 'expired'
              ? 'bg-rose-500/10 border-rose-500 ring-2 ring-rose-500/30'
              : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:border-rose-300 dark:hover:border-rose-800/60'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">
              Vencidos (Retiro)
            </span>
            <div className="w-7 h-7 rounded-lg bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <AlertOctagon className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
            {kpis.expired} <span className="text-xs font-normal text-gray-500">lotes</span>
          </div>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 truncate">
            Requieren registro de merma o descarte
          </p>
        </div>

        {/* 2. Vencimiento Crítico (< 15 días) */}
        <div 
          onClick={() => setUrgencyFilter(urgencyFilter === 'critical' ? 'all' : 'critical')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            urgencyFilter === 'critical'
              ? 'bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/30'
              : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:border-amber-300 dark:hover:border-amber-800/60'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Crítico (&lt; 15 días)
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
            {kpis.critical} <span className="text-xs font-normal text-gray-500">lotes</span>
          </div>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 truncate">
            Candidatos a oferta de remate inmediata
          </p>
        </div>

        {/* 3. Alerta Preventiva (< 30 días) */}
        <div 
          onClick={() => setUrgencyFilter(urgencyFilter === 'warning' ? 'all' : 'warning')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            urgencyFilter === 'warning'
              ? 'bg-yellow-500/10 border-yellow-500 ring-2 ring-yellow-500/30'
              : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:border-yellow-300 dark:hover:border-yellow-800/60'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-yellow-600 dark:text-yellow-400">
              Alerta (16 a 30 días)
            </span>
            <div className="w-7 h-7 rounded-lg bg-yellow-100 dark:bg-yellow-950/70 text-yellow-600 dark:text-yellow-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-yellow-600 dark:text-yellow-400 mt-1">
            {kpis.warning} <span className="text-xs font-normal text-gray-500">lotes</span>
          </div>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 truncate">
            Acelerar rotación en góndola / vidriera
          </p>
        </div>

        {/* 4. Lotes Óptimos (> 30 días) */}
        <div 
          onClick={() => setUrgencyFilter(urgencyFilter === 'ok' ? 'all' : 'ok')}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
            urgencyFilter === 'ok'
              ? 'bg-emerald-500/10 border-emerald-500 ring-2 ring-emerald-500/30'
              : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:border-emerald-300 dark:hover:border-emerald-800/60'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Óptimos (&gt; 30 días)
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {kpis.ok} <span className="text-xs font-normal text-gray-500">lotes</span>
          </div>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 truncate">
            Margen de conservación seguro
          </p>
        </div>
      </div>

      {/* Contenedor Principal: Filtros y Tabla */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xs border border-gray-200 dark:border-gray-800 overflow-hidden flex-1 flex flex-col min-h-0">
        
        {/* Barra de Filtros y Búsqueda */}
        <div className="p-3.5 border-b border-gray-200 dark:border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-gray-50/60 dark:bg-gray-800/30 flex-shrink-0">
          
          {/* Pestañas de Semáforo */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setUrgencyFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                urgencyFilter === 'all'
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700'
              }`}
            >
              Todos ({kpis.total})
            </button>

            <button
              onClick={() => setUrgencyFilter('expired')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                urgencyFilter === 'expired'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-white dark:bg-gray-900 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60'
              }`}
            >
              <AlertOctagon className="w-3.5 h-3.5" />
              <span>Vencidos ({kpis.expired})</span>
            </button>

            <button
              onClick={() => setUrgencyFilter('critical')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                urgencyFilter === 'critical'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white dark:bg-gray-900 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Críticos &lt;15d ({kpis.critical})</span>
            </button>

            <button
              onClick={() => setUrgencyFilter('warning')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                urgencyFilter === 'warning'
                  ? 'bg-yellow-600 text-white shadow-xs'
                  : 'bg-white dark:bg-gray-900 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-950/40 border border-yellow-200 dark:border-yellow-800/60'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Alerta &lt;30d ({kpis.warning})</span>
            </button>

            <button
              onClick={() => setUrgencyFilter('ok')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                urgencyFilter === 'ok'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white dark:bg-gray-900 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Óptimos ({kpis.ok})</span>
            </button>
          </div>

          {/* Filtro de Categoría y Buscador */}
          <div className="flex items-center gap-2">
            {categories.length > 0 && (
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs font-semibold rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 cursor-pointer"
              >
                <option value="all">Todas las Categorías</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            )}

            <div className="relative w-full sm:w-60">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por lote, producto o rack..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
          </div>
        </div>

        {/* Tabla de Lotes */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="p-16 text-center text-gray-600 dark:text-gray-300 font-medium flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-6 h-6 animate-spin text-primary" />
              <span>Cargando lotes y fechas de vencimiento...</span>
            </div>
          ) : filteredBatches.length === 0 ? (
            <div className="p-14 text-center flex flex-col items-center justify-center gap-3">
              <CalendarClock className="w-14 h-14 text-gray-300 dark:text-gray-700" />
              <p className="text-gray-800 dark:text-gray-200 font-bold text-base">
                No hay lotes que coincidan con los filtros actuales.
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md">
                Podés registrar el primer lote de mercadería perecedera asociándolo a cualquier producto de tu catálogo.
              </p>
              <button
                onClick={() => handleOpenNewBatchModal()}
                className="mt-2 px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Registrar Nuevo Lote
              </button>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-gray-100 dark:bg-gray-800/90 backdrop-blur-xs z-10 border-b border-gray-200 dark:border-gray-700">
                <tr className="text-gray-700 dark:text-gray-200 text-xs font-bold uppercase tracking-wider">
                  <th className="py-3 px-3">Código de Lote</th>
                  <th className="py-3 px-3">Producto</th>
                  <th className="py-3 px-3">Ubicación</th>
                  <th className="py-3 px-3">Stock Lote</th>
                  <th className="py-3 px-3">Vencimiento & Días</th>
                  <th className="py-3 px-3">Semáforo</th>
                  <th className="py-3 px-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredBatches.map((batch) => {
                  const daysRemaining = getDaysUntilExpiration(batch.expiration_date);
                  const urgency = getBatchUrgency(batch.expiration_date);
                  const config = BATCH_URGENCY_CONFIG[urgency];

                  return (
                    <tr key={batch.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                      {/* Código de Lote */}
                      <td className="py-3 px-3 text-xs font-mono font-bold text-gray-900 dark:text-white whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Tag className="w-3.5 h-3.5 text-gray-400" />
                          <span>{batch.batch_code}</span>
                        </div>
                      </td>

                      {/* Producto */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          {batch.products?.image_url_1 ? (
                            <img
                              src={batch.products.image_url_1}
                              alt={batch.products?.name || 'Producto'}
                              className="w-9 h-9 object-contain rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-0.5 flex-shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-[10px] font-bold text-gray-400 flex-shrink-0">
                              IMG
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-bold text-gray-900 dark:text-white text-sm truncate max-w-[220px]" title={batch.products?.name}>
                              {batch.products?.name || 'Producto no encontrado'}
                            </p>
                            <span className="text-[11px] text-gray-500 dark:text-gray-400 block truncate">
                              {batch.products?.category || 'Sin categoría'} • Stock Total: {batch.products?.stock ?? '-'} un.
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Ubicación */}
                      <td className="py-3 px-3 whitespace-nowrap text-xs text-gray-600 dark:text-gray-300 font-medium">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-gray-400" />
                          {batch.location || 'Depósito Central'}
                        </span>
                      </td>

                      {/* Stock Lote */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="font-extrabold text-gray-900 dark:text-white text-xs">
                          {batch.current_quantity} <span className="font-normal text-gray-500">/ {batch.initial_quantity} un.</span>
                        </div>
                      </td>

                      {/* Vencimiento & Días */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="text-xs font-bold text-gray-900 dark:text-white">
                          {formatDate(batch.expiration_date)}
                        </div>
                        <span className={`text-[11px] font-semibold ${config.textColor}`}>
                          {daysRemaining < 0
                            ? `Vencido hace ${Math.abs(daysRemaining)} días`
                            : daysRemaining === 0
                            ? 'Vence HOY'
                            : `Vence en ${daysRemaining} días`}
                        </span>
                      </td>

                      {/* Semáforo Preventivo */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${config.badgeClass}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${config.bgPulse} animate-pulse`} />
                          <span>{config.shortLabel}</span>
                        </span>
                      </td>

                      {/* Acciones */}
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Botón Remate / Oferta Flash (Ideal para Críticos y Alerta) */}
                          {(urgency === 'critical' || urgency === 'warning') && (
                            <button
                              onClick={() => setSelectedBatchForPromo(batch)}
                              title="Publicar oferta de remate antes del vencimiento"
                              className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 transition-colors cursor-pointer flex items-center gap-1"
                            >
                              <Percent className="w-3.5 h-3.5" />
                              <span>Rematar</span>
                            </button>
                          )}

                          {/* Botón Registrar Merma / Baja */}
                          <button
                            onClick={() => {
                              setSelectedBatchForWaste(batch);
                              setWasteQuantity(batch.current_quantity);
                            }}
                            title="Dar de baja por vencimiento o rotura (Kardex waste)"
                            className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Merma</span>
                          </button>

                          {/* Botón Imprimir Rótulo */}
                          <Link
                            href={`/dashboard/etiquetas?product=${batch.product_id}&batch=${batch.batch_code}&vto=${batch.expiration_date}`}
                            title="Imprimir etiquetas con Lote y Vto para góndola"
                            className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 transition-colors cursor-pointer"
                          >
                            <Printer className="w-4 h-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* MODAL: NUEVO LOTE */}
      {isNewBatchModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Cabecera */}
            <div className="p-5 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50/70 dark:bg-gray-800/50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <CalendarClock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-gray-900 dark:text-white">
                    Registrar Lote de Mercadería
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Asocia fecha de vencimiento y stock para rotación FEFO
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsNewBatchModalOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleCreateBatch} className="p-6 overflow-y-auto space-y-4">
              {/* Selector de Producto */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Producto Perecedero: *
                </label>
                <select
                  value={newBatchForm.productId}
                  onChange={(e) => setNewBatchForm({ ...newBatchForm, productId: e.target.value })}
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer"
                >
                  <option value="">Selecciona un producto...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.barcode ? `(${p.barcode})` : ''} - Stock: {p.stock} un.
                    </option>
                  ))}
                </select>
              </div>

              {/* Código de Lote y Fecha de Vencimiento */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Código de Lote: *
                  </label>
                  <input
                    type="text"
                    value={newBatchForm.batchCode}
                    onChange={(e) => setNewBatchForm({ ...newBatchForm, batchCode: e.target.value })}
                    required
                    placeholder="Ej: L-2026-09"
                    className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Fecha de Vencimiento: *
                  </label>
                  <input
                    type="date"
                    value={newBatchForm.expirationDate}
                    onChange={(e) => setNewBatchForm({ ...newBatchForm, expirationDate: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer"
                  />
                </div>
              </div>

              {/* Previsualización en vivo del semáforo si hay fecha */}
              {newBatchForm.expirationDate && (
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 flex items-center justify-between text-xs">
                  <span className="font-bold text-gray-600 dark:text-gray-300">Semáforo calculado:</span>
                  {(() => {
                    const days = getDaysUntilExpiration(newBatchForm.expirationDate);
                    const urgency = getBatchUrgency(newBatchForm.expirationDate);
                    const cfg = BATCH_URGENCY_CONFIG[urgency];
                    return (
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-black border ${cfg.badgeClass}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.bgPulse}`} />
                        <span>{cfg.label} ({days} días restantes)</span>
                      </span>
                    );
                  })()}
                </div>
              )}

              {/* Cantidad y Costo Unitario */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Cantidad Recibida (unidades): *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newBatchForm.quantity}
                    onChange={(e) => setNewBatchForm({ ...newBatchForm, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                    required
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Costo Unitario ($ compra opcional):
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newBatchForm.costPrice}
                    onChange={(e) => setNewBatchForm({ ...newBatchForm, costPrice: e.target.value })}
                    placeholder="Ej: 1450.00"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>

              {/* Ubicación Física */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Ubicación Física en Depósito:
                </label>
                <input
                  type="text"
                  value={newBatchForm.location}
                  onChange={(e) => setNewBatchForm({ ...newBatchForm, location: e.target.value })}
                  placeholder="Ej: Cámara Fría 2, Rack C, Góndola 4"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              {/* Checkbox para sumar stock */}
              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={newBatchForm.updateProductStock}
                    onChange={(e) => setNewBatchForm({ ...newBatchForm, updateProductStock: e.target.checked })}
                    className="w-4 h-4 rounded text-primary focus:ring-primary/30"
                  />
                  <span>Sumar automáticamente estas {newBatchForm.quantity} unidades al inventario general del producto</span>
                </label>
              </div>

              {/* Botones de Envío */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewBatchModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingBatch}
                  className="px-5 py-2 text-xs font-black bg-primary text-white hover:bg-blue-700 rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {savingBatch ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>Guardar Lote</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REGISTRAR MERMA / DESCARTE */}
      {selectedBatchForWaste && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-5 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-rose-50/70 dark:bg-rose-950/30">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-rose-950 dark:text-rose-200">
                    Registrar Merma / Baja
                  </h3>
                  <p className="text-xs text-rose-800/80 dark:text-rose-400/80">
                    Lote #{selectedBatchForWaste.batch_code}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedBatchForWaste(null)}
                className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmWaste} className="p-6 space-y-4">
              <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl border border-gray-200 dark:border-gray-700 text-xs space-y-1">
                <p className="font-bold text-gray-900 dark:text-white">{selectedBatchForWaste.products?.name}</p>
                <p className="text-gray-500">Stock disponible en este lote: <strong>{selectedBatchForWaste.current_quantity} un.</strong></p>
                <p className="text-gray-500">Fecha de Vto: <strong>{formatDate(selectedBatchForWaste.expiration_date)}</strong></p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Cantidad a dar de baja: *
                </label>
                <input
                  type="number"
                  min="1"
                  max={selectedBatchForWaste.current_quantity}
                  value={wasteQuantity}
                  onChange={(e) => setWasteQuantity(Math.min(selectedBatchForWaste.current_quantity, Math.max(1, parseInt(e.target.value) || 1)))}
                  required
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Motivo de Descarte: *
                </label>
                <select
                  value={wasteReason}
                  onChange={(e) => setWasteReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white cursor-pointer"
                >
                  <option value="Mercadería vencida">Mercadería vencida</option>
                  <option value="Rotura / Daño de empaque">Rotura / Daño de empaque</option>
                  <option value="Pérdida de cadena de frío">Pérdida de cadena de frío</option>
                  <option value="Defecto de fábrica">Defecto de fábrica</option>
                </select>
              </div>

              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-[11px] text-rose-800 dark:text-rose-300">
                ⚠️ Esta acción descontará las unidades de este lote y del stock general del producto, y registrará un movimiento de auditoría Kardex de tipo <strong>waste</strong>.
              </div>

              <div className="pt-3 border-t border-gray-200 dark:border-gray-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedBatchForWaste(null)}
                  className="px-4 py-2 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingWaste}
                  className="px-5 py-2 text-xs font-black bg-rose-600 text-white hover:bg-rose-700 rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {savingWaste ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  <span>Confirmar Merma</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REMATAR / OFERTA FLASH */}
      {selectedBatchForPromo && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-5 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-amber-50/70 dark:bg-amber-950/30">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center">
                  <Percent className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-amber-950 dark:text-amber-200">
                    Oferta Flash por Vencimiento
                  </h3>
                  <p className="text-xs text-amber-800/80 dark:text-amber-400/80">
                    Liquidación rápida de mercadería
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedBatchForPromo(null)}
                className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleApplyPromo} className="p-6 space-y-4">
              <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl border border-gray-200 dark:border-gray-700 text-xs space-y-1">
                <p className="font-bold text-gray-900 dark:text-white">{selectedBatchForPromo.products?.name}</p>
                <p className="text-gray-500">Precio normal: <strong>{formatCurrency(Number(selectedBatchForPromo.products?.price) || 0)}</strong></p>
                <p className="text-amber-600 dark:text-amber-400 font-bold">
                  Vto: {formatDate(selectedBatchForPromo.expiration_date)} ({getDaysUntilExpiration(selectedBatchForPromo.expiration_date)} días restantes)
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
                  Porcentaje de Descuento de Remate:
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[15, 25, 35, 50].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setPromoPercentage(pct)}
                      className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        promoPercentage === pct
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      {pct}% OFF
                    </button>
                  ))}
                </div>
              </div>

              {/* Simulación de precio en tiempo real */}
              <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 rounded-xl text-xs flex justify-between items-center">
                <span className="font-bold text-gray-600 dark:text-gray-400">Nuevo precio al público:</span>
                <span className="text-base font-black text-amber-600 dark:text-amber-400">
                  {formatCurrency((Number(selectedBatchForPromo.products?.price) || 0) * (1 - promoPercentage / 100))}
                </span>
              </div>

              <div className="pt-3 border-t border-gray-200 dark:border-gray-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedBatchForPromo(null)}
                  className="px-4 py-2 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingPromo}
                  className="px-5 py-2 text-xs font-black bg-amber-600 text-white hover:bg-amber-700 rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {savingPromo ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>Aplicar Oferta</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
