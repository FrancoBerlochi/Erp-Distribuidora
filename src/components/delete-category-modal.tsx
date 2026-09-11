/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { invalidateProductsCache } from '@/lib/products-cache';
import { toast } from 'react-toastify';
import { 
  Trash2, 
  X, 
  AlertTriangle, 
  Loader2, 
  Package, 
  Layers 
} from 'lucide-react';

interface DeleteCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (deletedCategory: string) => void;
  categories: string[];
  uncategorizedCount: number;
  products: any[];
  initialCategory?: string;
}

export default function DeleteCategoryModal({
  isOpen,
  onClose,
  onSuccess,
  categories,
  uncategorizedCount,
  products,
  initialCategory,
}: DeleteCategoryModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [confirmed, setConfirmed] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Sincronizar categoría inicial cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      if (initialCategory && initialCategory !== 'ALL') {
        setSelectedCategory(initialCategory);
      } else if (categories.length > 0) {
        setSelectedCategory(categories[0]);
      } else if (uncategorizedCount > 0) {
        setSelectedCategory('UNCATEGORIZED');
      } else {
        setSelectedCategory('');
      }
      setConfirmed(false);
    }
  }, [isOpen, initialCategory, categories, uncategorizedCount]);

  // Filtrar los productos que pertenecen a la categoría elegida
  const targetProducts = useMemo(() => {
    if (!selectedCategory) return [];
    if (selectedCategory === 'UNCATEGORIZED') {
      return products.filter((p) => !p.category || p.category.trim() === '');
    }
    return products.filter(
      (p) => (p.category || '').trim().toLowerCase() === selectedCategory.trim().toLowerCase()
    );
  }, [products, selectedCategory]);

  if (!isOpen) return null;

  const displayCategoryName =
    selectedCategory === 'UNCATEGORIZED' ? 'Sin Categoría' : selectedCategory;

  const handleDelete = async () => {
    if (targetProducts.length === 0) return;
    if (!confirmed) {
      toast.warning('Por favor confirma marcando la casilla antes de eliminar.');
      return;
    }

    setIsDeleting(true);
    try {
      const idsToDelete = targetProducts.map((p) => p.id);
      const BATCH_SIZE = 100;

      // Eliminar en lotes de 100 productos para máxima seguridad y confiabilidad
      for (let i = 0; i < idsToDelete.length; i += BATCH_SIZE) {
        const batch = idsToDelete.slice(i, i + BATCH_SIZE);
        const { error } = await supabase.from('products').delete().in('id', batch);
        if (error) throw error;
      }

      // Invalidar caché global y en localStorage
      await invalidateProductsCache();

      toast.success(
        `Se eliminaron ${idsToDelete.length} producto(s) de "${displayCategoryName}" exitosamente.`
      );
      onSuccess(selectedCategory);
      onClose();
    } catch (err: any) {
      console.error('Error al eliminar productos de categoría:', err);
      toast.error(err.message || 'Ocurrió un error al eliminar los productos.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl sm:rounded-3xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/80 flex items-center justify-center text-red-600 dark:text-red-400">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white">
                Eliminar por Categoría
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Elimina todos los productos de una categoría en un solo paso.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isDeleting}
            className="w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {/* Selector de categoría */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-2">
              Seleccionar Categoría a Eliminar
            </label>
            <div className="relative">
              <Layers className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setConfirmed(false);
                }}
                disabled={isDeleting}
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl pl-9 pr-8 py-2.5 text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:outline-hidden cursor-pointer"
              >
                {categories.length === 0 && uncategorizedCount === 0 && (
                  <option value="">No hay categorías registradas</option>
                )}
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
                {uncategorizedCount > 0 && (
                  <option value="UNCATEGORIZED">
                    Sin Categoría ({uncategorizedCount} productos)
                  </option>
                )}
              </select>
            </div>
          </div>

          {/* Advertencia & Detalle de Eliminación */}
          {selectedCategory ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 flex items-start gap-3 text-red-800 dark:text-red-300">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <div className="text-xs sm:text-sm space-y-1">
                  <p className="font-bold">
                    ¡Acción irreversible y destructiva!
                  </p>
                  <p className="opacity-90">
                    Se eliminarán permanentemente de la base de datos los{' '}
                    <span className="font-extrabold underline">
                      {targetProducts.length} producto(s)
                    </span>{' '}
                    de la categoría &quot;<strong>{displayCategoryName}</strong>&quot;.
                  </p>
                </div>
              </div>

              {/* Vista previa de productos */}
              {targetProducts.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-gray-500 dark:text-gray-400">
                    <span>Vista previa de productos afectados:</span>
                    <span className="font-bold text-gray-700 dark:text-gray-300">
                      Total: {targetProducts.length}
                    </span>
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-2 border border-gray-100 dark:border-gray-800 rounded-xl p-2 bg-gray-50/50 dark:bg-gray-800/50">
                    {targetProducts.slice(0, 6).map((product) => (
                      <div
                        key={product.id}
                        className="flex items-center justify-between gap-3 p-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700/60 shadow-2xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {product.image_url_1 ? (
                            <img
                              src={product.image_url_1}
                              alt={product.name}
                              className="w-9 h-9 rounded-md object-contain bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-md bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0">
                              <Package className="w-4 h-4 text-gray-400" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                              {product.name}
                            </p>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400">
                              Stock: {product.stock} | ${product.price}
                            </p>
                          </div>
                        </div>
                        <span className="text-[11px] font-semibold text-red-600 dark:text-red-400 shrink-0">
                          Se borrará
                        </span>
                      </div>
                    ))}

                    {targetProducts.length > 6 && (
                      <p className="text-center text-xs text-gray-500 dark:text-gray-400 py-1 font-medium">
                        + {targetProducts.length - 6} producto(s) más en esta categoría.
                      </p>
                    )}
                  </div>

                  {/* Casilla de confirmación obligatoria */}
                  <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors mt-3">
                    <input
                      type="checkbox"
                      checked={confirmed}
                      onChange={(e) => setConfirmed(e.target.checked)}
                      disabled={isDeleting}
                      className="mt-0.5 w-4 h-4 rounded text-red-600 focus:ring-red-500 border-gray-300 dark:border-gray-600 cursor-pointer"
                    />
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 select-none">
                      Confirmo que deseo eliminar definitivamente todos los{' '}
                      <span className="font-bold text-red-600 dark:text-red-400">
                        {targetProducts.length} productos
                      </span>{' '}
                      de la categoría &quot;{displayCategoryName}&quot;.
                    </span>
                  </label>
                </div>
              ) : (
                <div className="text-center py-6 text-sm text-gray-500 dark:text-gray-400">
                  No hay productos registrados en esta categoría.
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-3 flex-shrink-0 bg-gray-50 dark:bg-gray-900/50">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting || targetProducts.length === 0 || !confirmed}
            className="bg-red-600 hover:bg-red-700 active:scale-98 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Eliminando...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Eliminar {targetProducts.length} producto(s)
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
