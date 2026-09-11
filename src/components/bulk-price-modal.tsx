/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { invalidateProductsCache } from '@/lib/products-cache';
import { toast } from 'react-toastify';
import { 
  Percent, 
  TrendingUp, 
  TrendingDown, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw,
  Sparkles,
  Layers
} from 'lucide-react';

interface BulkPriceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  products: any[];
  categories: string[];
}

export default function BulkPriceModal({
  isOpen,
  onClose,
  onSuccess,
  products,
  categories,
}: BulkPriceModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [percentage, setPercentage] = useState<number | ''>(10);
  const [adjustmentType, setAdjustmentType] = useState<'increase' | 'decrease'>('increase');
  const [roundTo, setRoundTo] = useState<'none' | '10' | '50' | '100'>('10');
  const [isUpdating, setIsUpdating] = useState(false);

  // Filtrar productos afectados según la categoría seleccionada
  const targetProducts = useMemo(() => {
    if (selectedCategory === 'ALL') return products;
    if (selectedCategory === 'UNCATEGORIZED') {
      return products.filter((p) => !p.category || p.category.trim() === '');
    }
    return products.filter(
      (p) => (p.category || '').trim().toLowerCase() === selectedCategory.trim().toLowerCase()
    );
  }, [products, selectedCategory]);

  // Función de cálculo de nuevo precio con redondeo
  const calculateNewPrice = (currentPrice: number): number => {
    const numPercent = typeof percentage === 'number' ? percentage : 0;
    const factor = adjustmentType === 'increase' ? 1 + numPercent / 100 : 1 - numPercent / 100;
    let newPrice = currentPrice * factor;

    if (roundTo === '10') {
      newPrice = Math.round(newPrice / 10) * 10;
    } else if (roundTo === '50') {
      newPrice = Math.round(newPrice / 50) * 50;
    } else if (roundTo === '100') {
      newPrice = Math.round(newPrice / 100) * 100;
    } else {
      newPrice = Math.round(newPrice * 100) / 100;
    }

    return Math.max(0, newPrice);
  };

  // Muestra de previsualización (primeros 4 productos)
  const previewProducts = targetProducts.slice(0, 4);

  const handleApplyAdjustment = async () => {
    if (typeof percentage !== 'number' || percentage <= 0) {
      toast.warn('Por favor ingresá un porcentaje válido mayor a 0.');
      return;
    }

    if (targetProducts.length === 0) {
      toast.warn('No hay productos que coincidan con la categoría seleccionada.');
      return;
    }

    const confirmMessage = `¿Confirmás aplicar un ${
      adjustmentType === 'increase' ? 'aumento' : 'descuento'
    } del ${percentage}% a ${targetProducts.length} productos?`;

    if (!window.confirm(confirmMessage)) return;

    setIsUpdating(true);
    try {
      let updatedCount = 0;
      const batchSize = 25;

      for (let i = 0; i < targetProducts.length; i += batchSize) {
        const batch = targetProducts.slice(i, i + batchSize);
        
        await Promise.all(
          batch.map(async (prod) => {
            const newPrice = calculateNewPrice(Number(prod.price) || 0);
            const { error } = await supabase
              .from('products')
              .update({ price: newPrice })
              .eq('id', prod.id);

            if (error) throw error;
            updatedCount++;
          })
        );
      }

      toast.success(`¡Se actualizaron con éxito los precios de ${updatedCount} productos!`);
      await invalidateProductsCache();
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error aplicando aumento masivo:', err);
      toast.error('Error al actualizar precios: ' + (err.message || 'Error de conexión'));
    } finally {
      setIsUpdating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Cabecera */}
        <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-gray-900 dark:text-white">Aumento Masivo de Precios</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Actualiza listas de precios por porcentaje en lote</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isUpdating}
            className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Selector de Categoría Afectada */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
              Categoría a Modificar
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              disabled={isUpdating}
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">Todo el Catálogo ({products.length} productos)</option>
              {categories.map((cat) => {
                const count = products.filter(
                  (p) => (p.category || '').trim().toLowerCase() === cat.toLowerCase()
                ).length;
                return (
                  <option key={cat} value={cat}>
                    {cat} ({count} productos)
                  </option>
                );
              })}
              <option value="UNCATEGORIZED">Sin Categoría</option>
            </select>
          </div>

          {/* Tipo de Ajuste y Porcentaje */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                Tipo de Ajuste
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustmentType('increase')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    adjustmentType === 'increase'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" /> + Aumento
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustmentType('decrease')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    adjustmentType === 'decrease'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                  }`}
                >
                  <TrendingDown className="w-3.5 h-3.5" /> - Rebaja
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                Porcentaje (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0.1"
                  step="0.5"
                  value={percentage}
                  onChange={(e) => setPercentage(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  disabled={isUpdating}
                  placeholder="Ej: 15"
                  className="w-full pl-3.5 pr-8 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white font-bold text-sm focus:ring-2 focus:ring-primary focus:outline-hidden"
                />
                <Percent className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Redondeo Comercial */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
              Redondeo de Precios
            </label>
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setRoundTo('none')}
                className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  roundTo === 'none'
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                }`}
              >
                Exacto
              </button>
              <button
                type="button"
                onClick={() => setRoundTo('10')}
                className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  roundTo === '10'
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                }`}
              >
                A $10
              </button>
              <button
                type="button"
                onClick={() => setRoundTo('50')}
                className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  roundTo === '50'
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                }`}
              >
                A $50
              </button>
              <button
                type="button"
                onClick={() => setRoundTo('100')}
                className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  roundTo === '100'
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                }`}
              >
                A $100
              </button>
            </div>
            <p className="text-[11px] text-gray-400">
              {roundTo === 'none' && 'Mantiene decimales o centavos.'}
              {roundTo === '10' && 'Ejemplo: $1.243 -> $1.240'}
              {roundTo === '50' && 'Ejemplo: $1.234 -> $1.250'}
              {roundTo === '100' && 'Ejemplo: $1.240 -> $1.200 o $1.260 -> $1.300'}
            </p>
          </div>

          {/* Previsualización en Vivo */}
          <div className="bg-gray-50 dark:bg-gray-800/60 p-4 rounded-2xl border border-gray-100 dark:border-gray-700/60 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-gray-700 dark:text-gray-300">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Previsualización de Impacto ({targetProducts.length} productos)
              </span>
              <span className="text-[11px] text-primary">
                {adjustmentType === 'increase' ? `+${percentage || 0}%` : `-${percentage || 0}%`}
              </span>
            </div>

            {previewProducts.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-2">No hay productos seleccionados.</p>
            ) : (
              <div className="space-y-1.5 divide-y divide-gray-200 dark:divide-gray-700/50">
                {previewProducts.map((p) => {
                  const currentP = Number(p.price) || 0;
                  const newP = calculateNewPrice(currentP);
                  return (
                    <div key={p.id} className="flex justify-between items-center text-xs pt-1.5 first:pt-0">
                      <span className="truncate max-w-[240px] text-gray-800 dark:text-gray-200 font-medium">
                        {p.name}
                      </span>
                      <div className="flex items-center gap-2 flex-shrink-0 font-mono">
                        <span className="text-gray-400 line-through">${currentP.toFixed(2)}</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">${newP.toFixed(2)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer y Botones de Acción */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isUpdating}
            className="px-4 py-2 text-xs font-bold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleApplyAdjustment}
            disabled={isUpdating || targetProducts.length === 0}
            className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-sm transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
          >
            {isUpdating ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Aplicando a {targetProducts.length} productos...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Aplicar a {targetProducts.length} productos</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
