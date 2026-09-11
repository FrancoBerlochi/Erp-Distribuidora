/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { useAdminProducts, invalidateProductsCache, forceDirectProductsFetch } from '@/lib/products-cache';
import { Plus, Edit, Trash2, FileSpreadsheet, Filter, Search, X, RefreshCw, AlertTriangle, Terminal, Download, TrendingUp, Camera, Sparkles, Truck, Tag, ChevronLeft, ChevronRight } from 'lucide-react';
import { getPromoBadgeInfo } from '@/lib/promotions-engine';

const ExcelImportModal = dynamic(() => import('@/components/excel-import-modal'), { ssr: false });
const BulkPriceModal = dynamic(() => import('@/components/bulk-price-modal'), { ssr: false });
const DeleteCategoryModal = dynamic(() => import('@/components/delete-category-modal'), { ssr: false });
const POSCameraScanner = dynamic(() => import('@/components/pos-camera-scanner'), { ssr: false });

export default function ProductsPage() {
  const { products, loading, error, mutate } = useAdminProducts();
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isDeleteCategoryModalOpen, setIsDeleteCategoryModalOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);
  const [isForcingDirect, setIsForcingDirect] = useState(false);
  const [directFetchError, setDirectFetchError] = useState<string | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 50;

  // Al montar el componente, si no hay productos cargados en memoria, ejecutar carga directa inmediata
  useEffect(() => {
    console.log('[DASHBOARD_PRODUCTS] 🚀 Componente montado. Productos cargados:', products.length, 'Loading:', loading);
    if (products.length === 0) {
      console.log('[DASHBOARD_PRODUCTS] ⚡ Iniciando carga directa inmediata en montaje...');
      forceDirectProductsFetch('admin').catch((err) => {
        console.error('[DASHBOARD_PRODUCTS] Error en carga directa al montar:', err);
      });
    }
  }, []);

  useEffect(() => {
    console.log('[DASHBOARD_PRODUCTS] 🔄 Cambio de estado:', {
      totalProductos: products.length,
      loading,
      tieneError: Boolean(error),
      categoria: selectedCategory,
    });
  }, [products.length, loading, error, selectedCategory]);

  // Resetear página al filtrar
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, searchTerm]);

  const deleteProduct = async (id: string) => {
    if (!window.confirm('¿Estás seguro de eliminar este producto?')) return;
    
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      await invalidateProductsCache();
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Error al eliminar producto');
    }
  };

  // Extraer categorías únicas disponibles
  const categories = Array.from(
    new Set(
      products
        .map((p) => p.category?.trim())
        .filter((c): c is string => Boolean(c && c.length > 0))
    )
  ).sort((a, b) => a.localeCompare(b));

  const uncategorizedCount = products.filter(
    (p) => !p.category || p.category.trim() === ''
  ).length;

  // Filtrado de productos por categoría y búsqueda
  const filteredProducts = products.filter((p) => {
    const matchesCategory =
      selectedCategory === 'ALL'
        ? true
        : selectedCategory === 'UNCATEGORIZED'
          ? !p.category || p.category.trim() === ''
          : (p.category || '').trim().toLowerCase() === selectedCategory.trim().toLowerCase();

    const matchesSearch =
      !searchTerm.trim() ||
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.barcode && p.barcode.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesCategory && matchesSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleExportExcel = async () => {
    const listToExport = filteredProducts.length > 0 ? filteredProducts : products;
    if (listToExport.length === 0) {
      alert('No hay productos para exportar.');
      return;
    }

    const XLSX = await import('xlsx');
    const exportRows = listToExport.map((p) => ({
      'CODIGO_EAN': p.barcode || '',
      'ARTICULO': p.name || '',
      'CATEGORIA': p.category || 'Almacén',
      'PRECIO_COSTO': Number(p.cost_price) || 0,
      'PRECIO_VENTA': Number(p.price) || 0,
      'PRECIO_MAYORISTA': p.wholesale_price != null ? Number(p.wholesale_price) : '',
      'MINIMO_MAYORISTA': p.wholesale_min_qty || 6,
      'STOCK': Number(p.stock) || 0,
      'DESCUENTO_%': Number(p.discount_percentage) || 0,
      'DESCRIPCION': p.description || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, worksheet, 'Catalogo');

    worksheet['!cols'] = [
      { wch: 18 },
      { wch: 35 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 10 },
      { wch: 14 },
      { wch: 35 },
    ];

    const todayStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `catalogo_distribuidora_${todayStr}.xlsx`);
  };

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 flex-shrink-0">
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">Productos</h1>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            onClick={handleExportExcel}
            className="bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 px-3.5 py-2 rounded-lg font-bold flex items-center gap-2 shadow-2xs transition-colors cursor-pointer text-sm"
            title="Exportar catálogo actual a archivo Excel .xlsx"
          >
            <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Exportar Excel
          </button>
          <button
            onClick={() => setIsBulkModalOpen(true)}
            className="bg-amber-500 hover:bg-amber-600 text-white px-3.5 py-2 rounded-lg font-bold flex items-center gap-2 shadow-sm transition-colors cursor-pointer text-sm"
            title="Ajustar precios por porcentaje en lote"
          >
            <TrendingUp className="w-4 h-4" />
            Aumento Masivo (%)
          </button>
          <button
            onClick={() => {
              setCategoryToDelete(selectedCategory !== 'ALL' ? selectedCategory : (categories[0] || ''));
              setIsDeleteCategoryModalOpen(true);
            }}
            className="bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-900/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/50 px-3.5 py-2 rounded-lg font-bold flex items-center gap-2 shadow-2xs transition-colors cursor-pointer text-sm"
            title="Eliminar todos los productos de una categoría"
          >
            <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
            Eliminar por Categoría
          </button>
          <Link
            href="/dashboard/proveedores"
            className="bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/30 dark:hover:bg-amber-900/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50 px-3.5 py-2 rounded-lg font-bold flex items-center gap-2 shadow-2xs transition-colors cursor-pointer text-sm"
            title="Ir al Centro de Reposición y Proveedores"
          >
            <Truck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            Reposición de Stock
          </Link>
          <Link
            href="/dashboard/etiquetas"
            className="bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/30 dark:hover:bg-purple-900/40 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-900/50 px-3.5 py-2 rounded-lg font-bold flex items-center gap-2 shadow-2xs transition-colors cursor-pointer text-sm"
            title="Generar e imprimir etiquetas de góndola con código de barras"
          >
            <Tag className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            Imprimir Etiquetas
          </Link>
          <button
            onClick={() => setIsExcelModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-sm transition-colors cursor-pointer text-sm"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Importar Excel
          </button>
          <Link 
            href="/dashboard/products/new" 
            className="bg-primary text-white px-4 py-2 rounded-lg font-bold hover:bg-primary/90 flex items-center gap-2 shadow-sm text-sm"
          >
            <Plus className="w-4 h-4" />
            Nuevo Producto
          </Link>
        </div>
      </div>

      {/* Barra de Filtro por Categoría y Búsqueda */}
      <div className="bg-white dark:bg-gray-900 p-3 sm:p-4 rounded-xl shadow-xs border border-gray-200 dark:border-gray-800 mb-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 flex-shrink-0">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 flex-wrap">
          {/* Selector de Categoría */}
          <div className="relative min-w-[220px]">
            <Filter className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg pl-9 pr-8 py-2 text-sm font-semibold text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-primary focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">Todas las categorías ({products.length})</option>
              {categories.map((cat) => {
                const count = products.filter(
                  (p) => (p.category || '').trim().toLowerCase() === cat.toLowerCase()
                ).length;
                return (
                  <option key={cat} value={cat}>
                    {cat} ({count})
                  </option>
                );
              })}
              {uncategorizedCount > 0 && (
                <option value="UNCATEGORIZED">Sin Categoría ({uncategorizedCount})</option>
              )}
            </select>
          </div>

          {/* Buscador de Producto + Botón Escanear */}
          <div className="flex items-center gap-2 flex-1 max-w-lg">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nombre, código o EAN..."
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg pl-9 pr-8 py-2 text-sm text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-primary focus:outline-hidden"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsCameraScannerOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer shadow-2xs hover:border-primary"
              title="Escanear código de barras con la cámara"
            >
              <Camera className="w-4 h-4 text-primary" />
              <span>Escanear</span>
            </button>
          </div>

          {/* Acciones contextuales cuando hay filtro activo */}
          <div className="flex items-center gap-2 flex-wrap self-start sm:self-center">
            {selectedCategory !== 'ALL' && (
              <button
                type="button"
                onClick={() => {
                  setCategoryToDelete(selectedCategory);
                  setIsDeleteCategoryModalOpen(true);
                }}
                className="flex items-center gap-1.5 text-xs font-bold text-red-600 hover:text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 px-2.5 py-1.5 rounded-lg border border-red-200 dark:border-red-900/60 transition-colors cursor-pointer"
                title={`Eliminar todos los productos de "${selectedCategory === 'UNCATEGORIZED' ? 'Sin Categoría' : selectedCategory}"`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Eliminar de esta categoría
              </button>
            )}

            {(selectedCategory !== 'ALL' || searchTerm) && (
              <button
                onClick={() => {
                  setSelectedCategory('ALL');
                  setSearchTerm('');
                }}
                className="text-xs font-semibold text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 underline cursor-pointer"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        </div>

        {/* Contador de resultados */}
        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1.5 self-end md:self-center flex-shrink-0">
          <span>Mostrando</span>
          <span className="font-bold text-gray-900 dark:text-white">{filteredProducts.length}</span>
          <span>de</span>
          <span className="font-bold text-gray-900 dark:text-white">{products.length}</span>
          <span>productos</span>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 flex-1 overflow-auto relative">
        {loading && products.length === 0 ? (
          <div className="p-8 text-center space-y-4 max-w-md mx-auto my-auto py-16">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/40 text-primary">
              <RefreshCw className="w-6 h-6 animate-spin text-primary" />
            </div>
            <div>
              <p className="text-gray-900 dark:text-gray-100 font-bold text-base">Cargando productos...</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Conectando con base de datos y sincronizando catálogo...
              </p>
            </div>

            <div className="pt-2 flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  try {
                    setIsForcingDirect(true);
                    setDirectFetchError(null);
                    await forceDirectProductsFetch('admin');
                  } catch (e: any) {
                    setDirectFetchError(e.message || 'Error al conectar');
                  } finally {
                    setIsForcingDirect(false);
                  }
                }}
                disabled={isForcingDirect}
                className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isForcingDirect ? 'animate-spin' : ''}`} />
                {isForcingDirect ? 'Cargando directo...' : '⚡ Forzar Carga Directa (REST)'}
              </button>
              {directFetchError && (
                <p className="text-xs text-red-600 dark:text-red-400">{directFetchError}</p>
              )}
              <button
                type="button"
                onClick={() => setShowDiagnostics((prev) => !prev)}
                className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 underline cursor-pointer flex items-center gap-1"
              >
                <Terminal className="w-3 h-3" />
                {showDiagnostics ? 'Ocultar diagnóstico' : 'Ver diagnóstico técnico'}
              </button>
              {showDiagnostics && (
                <div className="text-left bg-gray-950 text-emerald-400 p-3 rounded-lg text-[11px] font-mono w-full overflow-x-auto mt-2 border border-gray-800">
                  <p className="text-gray-400"># Diagnóstico del Sistema</p>
                  <p>Caché local: {typeof window !== 'undefined' ? (localStorage.getItem('cache_products_admin') ? 'Presente' : 'Vacía') : 'N/A'}</p>
                  <p>SWR isLoading: {String(loading)}</p>
                  <p>Error previo: {error?.message || 'Ninguno'}</p>
                  <p className="text-yellow-400 mt-1">Tip: Abre la consola (F12) para ver los registros [DISTRIBUIDORA].</p>
                </div>
              )}
            </div>
          </div>
        ) : error && products.length === 0 ? (
          <div className="p-8 text-center space-y-3 max-w-md mx-auto my-auto py-12">
            <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
            <p className="text-red-600 dark:text-red-400 font-bold">Hubo una demora al conectar con la base de datos.</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {error?.message || 'Error de conexión remota.'}
            </p>
            <div className="flex justify-center gap-2 pt-2">
              <button 
                onClick={() => mutate()} 
                className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors cursor-pointer"
              >
                Reintentar SWR
              </button>
              <button 
                onClick={async () => {
                  try {
                    await forceDirectProductsFetch('admin');
                  } catch (e: any) {
                    alert('Error: ' + e.message);
                  }
                }}
                className="text-xs bg-primary text-white font-bold px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors cursor-pointer"
              >
                ⚡ Carga Directa (REST)
              </button>
            </div>
          </div>
        ) : products.length === 0 ? (
          <div className="p-8 text-center text-gray-700 dark:text-gray-300 font-medium">No hay productos. Agrega uno nuevo.</div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-8 text-center space-y-3">
            <p className="text-gray-700 dark:text-gray-300 font-medium">
              No se encontraron productos con los filtros seleccionados.
            </p>
            <button
              onClick={() => {
                setSelectedCategory('ALL');
                setSearchTerm('');
              }}
              className="text-sm font-bold text-primary hover:underline"
            >
              Restablecer filtros
            </button>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-gray-100 dark:bg-gray-800 z-10 border-b border-gray-200 dark:border-gray-700">
              <tr className="text-gray-900 dark:text-gray-100 text-sm font-bold">
                <th className="p-4 font-bold w-16">Imagen</th>
                <th className="p-4 font-bold">Nombre</th>
                <th className="p-4 font-bold">Categoría</th>
                <th className="p-4 font-bold">Precio</th>
                <th className="p-4 font-bold">Stock</th>
                <th className="p-4 font-bold">Descuento</th>
                <th className="p-4 font-bold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginatedProducts.map((product) => (
                <tr key={product.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="p-4">
                    {(product.image_url_1 || product.image_url_2) ? (
                      <img src={product.image_url_1 || product.image_url_2} alt={product.name} className="w-12 h-12 rounded object-contain bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700" />
                    ) : (
                      <div className="w-12 h-12 bg-gray-200 dark:bg-gray-800 rounded flex items-center justify-center text-xs text-gray-500 dark:text-gray-400">Sin img</div>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="font-bold text-gray-900 dark:text-white">{product.name}</div>
                    {product.barcode && (
                      <div className="text-[10px] text-gray-400 font-mono tracking-wider">EAN: {product.barcode}</div>
                    )}
                    {product.supplier_name && (
                      <div className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">Prov: {product.supplier_name}</div>
                    )}
                  </td>
                  <td className="p-4 text-sm text-gray-600 dark:text-gray-400">{product.category}</td>
                  <td className="p-4 text-sm font-bold text-gray-900 dark:text-white">
                    ${product.price.toFixed(2)}
                    {product.wholesale_price && Number(product.wholesale_price) > 0 ? (
                      <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                        May: ${Number(product.wholesale_price).toFixed(2)} (x{product.wholesale_min_qty || 6}+)
                      </div>
                    ) : null}
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col items-start gap-1">
                      {product.stock < 0 ? (
                        <span className="px-2.5 py-1 text-xs font-black rounded-full bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300 animate-pulse">
                          {product.stock} u. (Quiebre)
                        </span>
                      ) : product.stock === 0 ? (
                        <span className="px-2.5 py-1 text-xs font-black rounded-full bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300 animate-pulse">
                          0 u. (Agotado)
                        </span>
                      ) : product.stock <= (product.min_stock ?? 5) ? (
                        <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                          {product.stock} u. (Crítico)
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 text-xs font-black rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                          {product.stock} u.
                        </span>
                      )}
                      {product.min_stock !== undefined && product.min_stock !== null ? (
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">Mín: {product.min_stock}</span>
                      ) : null}
                    </div>
                  </td>
                  <td className="p-4 text-sm font-bold text-gray-800 dark:text-gray-200">
                    <div className="flex flex-col gap-1 items-start">
                      {product.discount_percentage > 0 ? (
                        <span className="text-secondary font-black">-{product.discount_percentage}%</span>
                      ) : null}
                      {(() => {
                        const promo = getPromoBadgeInfo(product);
                        if (!promo) return null;
                        return (
                          <span 
                            className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-black rounded-md border ${promo.bgClass} ${promo.textClass} ${promo.borderClass}`}
                            title={promo.description}
                          >
                            <Sparkles className="w-2.5 h-2.5 shrink-0" />
                            <span>{promo.shortText}</span>
                          </span>
                        );
                      })()}
                      {!product.discount_percentage && !getPromoBadgeInfo(product) && (
                        <span className="text-gray-400 font-normal">-</span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Link href={`/dashboard/products/${product.id}/edit`} className="p-2 text-primary hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded transition-colors">
                        <Edit className="w-4 h-4" />
                      </Link>
                      <button onClick={() => deleteProduct(product.id)} className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Barra de Paginación */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs bg-white dark:bg-gray-900 flex-shrink-0">
            <span className="text-gray-500 dark:text-gray-400 font-medium">
              Mostrando {((currentPage - 1) * pageSize) + 1} a {Math.min(currentPage * pageSize, filteredProducts.length)} de {filteredProducts.length} productos
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 disabled:opacity-40 font-bold hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Anterior
              </button>
              <span className="px-3 py-1.5 font-bold text-gray-700 dark:text-gray-300">
                Página {currentPage} de {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 disabled:opacity-40 font-bold hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer flex items-center gap-1"
              >
                Siguiente
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      <ExcelImportModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        onSuccess={() => mutate()}
      />

      <BulkPriceModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onSuccess={() => mutate()}
        products={products}
        categories={categories}
      />

      <DeleteCategoryModal
        isOpen={isDeleteCategoryModalOpen}
        onClose={() => setIsDeleteCategoryModalOpen(false)}
        onSuccess={(deletedCat) => {
          if (selectedCategory === deletedCat) {
            setSelectedCategory('ALL');
          }
          mutate();
        }}
        categories={categories}
        uncategorizedCount={uncategorizedCount}
        products={products}
        initialCategory={categoryToDelete}
      />

      <POSCameraScanner
        isOpen={isCameraScannerOpen}
        onClose={() => setIsCameraScannerOpen(false)}
        onScan={(code) => {
          setSearchTerm(code);
        }}
      />
    </div>
  );
}
