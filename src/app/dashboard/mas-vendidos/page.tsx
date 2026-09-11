/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  useBestSellersConfig, 
  saveBestSellersConfig, 
  BestSellersConfig, 
  DEFAULT_BEST_SELLERS_CONFIG 
} from '@/lib/best-sellers-config';
import { checkLandingTableExists } from '@/lib/landing-config';
import { useAdminProducts, optimizeImageUrl } from '@/lib/products-cache';
import { toast } from 'react-toastify';
import { 
  TrendingUp, 
  Save, 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Search, 
  Filter, 
  CheckCircle2, 
  Layers, 
  Flame, 
  Eye, 
  Sliders, 
  X, 
  Package, 
  Sparkles,
  Info,
  AlertTriangle,
  RefreshCw,
  ExternalLink
} from 'lucide-react';

export default function MasVendidosPage() {
  const { config, loading } = useBestSellersConfig();
  const { products: allProducts, loading: loadingProducts } = useAdminProducts();

  const [formConfig, setFormConfig] = useState<BestSellersConfig>(config);
  const [saving, setSaving] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [onlyInStock, setOnlyInStock] = useState(true);
  const [tableWarning, setTableWarning] = useState(false);
  const [checkingTable, setCheckingTable] = useState(false);

  useEffect(() => {
    if (config) {
      setFormConfig(config);
    }
  }, [config]);

  useEffect(() => {
    verifyTable();
  }, []);

  async function verifyTable(showToast = false) {
    setCheckingTable(true);
    try {
      const res = await checkLandingTableExists();
      setTableWarning(!res.exists);
      if (showToast) {
        if (res.exists) {
          toast.success('¡Tabla landing_config detectada y operativa en Supabase!');
        } else {
          toast.warn('Aún no se detecta la tabla landing_config en Supabase');
        }
      }
    } finally {
      setCheckingTable(false);
    }
  }

  // Lista de categorías únicas para el filtro
  const categories = useMemo(() => {
    return Array.from(
      new Set(
        allProducts
          .map((p) => p.category?.trim())
          .filter((c): c is string => Boolean(c && c.length > 0))
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [allProducts]);

  // Productos actualmente seleccionados y ordenados según formConfig.product_ids
  const selectedProducts = useMemo(() => {
    const productMap = new Map(allProducts.map((p) => [p.id, p]));
    return (formConfig.product_ids || [])
      .map((id) => productMap.get(id))
      .filter(Boolean) as any[];
  }, [allProducts, formConfig.product_ids]);

  // Set de IDs seleccionados para búsqueda rápida
  const selectedIdsSet = useMemo(() => {
    return new Set(formConfig.product_ids || []);
  }, [formConfig.product_ids]);

  // Productos disponibles en el catálogo para seleccionar
  const availableCatalogProducts = useMemo(() => {
    return allProducts.filter((p) => {
      const matchesCategory =
        selectedCategory === 'ALL'
          ? true
          : selectedCategory === 'UNCATEGORIZED'
          ? !p.category || p.category.trim() === ''
          : (p.category || '').trim().toLowerCase() === selectedCategory.trim().toLowerCase();

      const matchesSearch =
        !catalogSearch.trim() ||
        p.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(catalogSearch.toLowerCase()));

      const matchesStock = onlyInStock ? p.stock > 0 : true;

      return matchesCategory && matchesSearch && matchesStock;
    });
  }, [allProducts, selectedCategory, catalogSearch, onlyInStock]);

  // Métodos de manipulación
  const handleAddProduct = (productId: string) => {
    if (selectedIdsSet.has(productId)) return;
    setFormConfig((prev) => ({
      ...prev,
      product_ids: [...prev.product_ids, productId],
    }));
  };

  const handleRemoveProduct = (productId: string) => {
    setFormConfig((prev) => ({
      ...prev,
      product_ids: prev.product_ids.filter((id) => id !== productId),
    }));
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    setFormConfig((prev) => {
      const nextIds = [...prev.product_ids];
      const temp = nextIds[index - 1];
      nextIds[index - 1] = nextIds[index];
      nextIds[index] = temp;
      return { ...prev, product_ids: nextIds };
    });
  };

  const handleMoveDown = (index: number) => {
    if (index >= formConfig.product_ids.length - 1) return;
    setFormConfig((prev) => {
      const nextIds = [...prev.product_ids];
      const temp = nextIds[index + 1];
      nextIds[index + 1] = nextIds[index];
      nextIds[index] = temp;
      return { ...prev, product_ids: nextIds };
    });
  };

  const handleClearAll = () => {
    if (!window.confirm('¿Deseas quitar todos los productos de la lista de Más Vendidos?')) return;
    setFormConfig((prev) => ({ ...prev, product_ids: [] }));
  };

  const handleSelectTopStock = () => {
    const topStock = [...allProducts]
      .filter((p) => p.stock > 0)
      .sort((a, b) => b.stock - a.stock)
      .slice(0, 8)
      .map((p) => p.id);

    setFormConfig((prev) => ({
      ...prev,
      product_ids: Array.from(new Set([...prev.product_ids, ...topStock])),
    }));
    toast.info('Se agregaron los productos con mayor disponibilidad de stock.');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await saveBestSellersConfig(formConfig);
      if (res.cloudSynced) {
        setTableWarning(false);
        toast.success('☁️ ¡Configuración de Más Vendidos guardada y sincronizada con la nube!');
      } else {
        setTableWarning(true);
        toast.info('💾 Guardado localmente. Para sincronizar con todos los compradores, ejecutá supabase_landing_schema.sql en Supabase.');
      }
    } catch (err: any) {
      console.error('Error al guardar más vendidos:', err);
      toast.error('Error al guardar la configuración: ' + (err.message || ''));
    } finally {
      setSaving(false);
    }
  };

  if (loading || loadingProducts) {
    return (
      <div className="p-8 text-center text-gray-500 dark:text-gray-400">
        Cargando sección de Más Vendidos...
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col min-h-0 overflow-y-auto pr-1 space-y-6">
      {/* Header Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                Productos Más Vendidos
                <span className="text-xs bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                  {formConfig.product_ids.length} seleccionados
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                Selecciona, ordena y destaca los productos favoritos en la página principal de tu tienda.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold px-4 py-2 rounded-xl shadow-xs text-xs transition-colors cursor-pointer"
            title="Abrir la portada de la tienda en una pestaña nueva"
          >
            <Eye className="w-4 h-4 text-primary" />
            <span>Ver en Tienda</span>
            <ExternalLink className="w-3 h-3 opacity-60 ml-0.5" />
          </Link>

          {/* Switch de activación */}
          <label className="flex items-center gap-2 cursor-pointer bg-white dark:bg-gray-800 px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 shadow-2xs">
            <input
              type="checkbox"
              checked={formConfig.is_active}
              onChange={(e) => setFormConfig({ ...formConfig, is_active: e.target.checked })}
              className="w-4 h-4 rounded text-primary focus:ring-primary border-gray-300 dark:border-gray-600 cursor-pointer"
            />
            <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
              {formConfig.is_active ? 'Visible en tienda' : 'Oculto'}
            </span>
          </label>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-bold px-5 py-2.5 rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer text-sm"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Guardando...' : 'Guardar Cambios'}</span>
          </button>
        </div>
      </div>

      {/* Alerta de Tabla Supabase */}
      {tableWarning && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/80 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900 dark:text-amber-200 text-xs flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <div>
              <p className="font-bold">Tabla de configuración no detectada en Supabase (Error PGRST205)</p>
              <p className="text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                Tus cambios se guardan localmente en tu navegador. Para sincronizarlos con la tienda pública y todos los clientes en tiempo real, ejecutá el script <code className="bg-amber-200/60 dark:bg-amber-900/60 px-1 py-0.5 rounded font-mono font-bold">supabase_landing_schema.sql</code> en el SQL Editor de tu panel de Supabase.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => verifyTable(true)}
            disabled={checkingTable}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 self-end sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checkingTable ? 'animate-spin' : ''}`} />
            <span>Reintentar Verificación</span>
          </button>
        </div>
      )}

      {/* Grid Principal: Configuración + Previsualización */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna Izquierda: Configuración de Textos */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tarjeta: Textos y Personalización */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
              <h2 className="text-sm font-black uppercase tracking-wider text-gray-800 dark:text-gray-200 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-primary" />
                Textos y Encabezado de la Sección
              </h2>
              <span className="text-xs text-gray-400">Personaliza cómo se presenta a tus clientes</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  Título de la Sección
                </label>
                <input
                  type="text"
                  value={formConfig.title}
                  onChange={(e) => setFormConfig({ ...formConfig, title: e.target.value })}
                  placeholder="Ej: Los Más Vendidos"
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2 text-sm font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  Texto del Badge / Distintivo
                </label>
                <input
                  type="text"
                  value={formConfig.badge_text}
                  onChange={(e) => setFormConfig({ ...formConfig, badge_text: e.target.value })}
                  placeholder="Ej: TOP VENTAS, MÁS ELEGIDOS"
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2 text-sm font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:outline-hidden"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  Subtítulo o Descripción Breve
                </label>
                <input
                  type="text"
                  value={formConfig.subtitle}
                  onChange={(e) => setFormConfig({ ...formConfig, subtitle: e.target.value })}
                  placeholder="Ej: Descubre los artículos preferidos por nuestros clientes con la mejor calidad y precio"
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Tarjeta: Lista de Productos Seleccionados y Ordenados */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-800 pb-3">
              <div>
                <h2 className="text-sm font-black uppercase tracking-wider text-gray-800 dark:text-gray-200 flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-500" />
                  Productos en &quot;Más Vendidos&quot; ({selectedProducts.length})
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  El orden de esta lista define la posición de los productos en la vitrina de la tienda.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {selectedProducts.length === 0 && (
                  <button
                    type="button"
                    onClick={handleSelectTopStock}
                    className="flex items-center gap-1.5 text-xs font-bold text-primary dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Sugerir primeros 8 con stock
                  </button>
                )}
                {selectedProducts.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="text-xs font-bold text-red-600 hover:text-red-700 dark:text-red-400 hover:underline cursor-pointer"
                  >
                    Limpiar selección
                  </button>
                )}
              </div>
            </div>

            {selectedProducts.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl space-y-2">
                <Package className="w-10 h-10 text-gray-400 mx-auto" />
                <p className="text-sm font-bold text-gray-700 dark:text-gray-300">
                  No hay productos seleccionados aún
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                  Utiliza el explorador de productos a continuación para agregar los que deseas destacar.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
                {selectedProducts.map((product, idx) => {
                  const isFirst = idx === 0;
                  const isLast = idx === selectedProducts.length - 1;

                  return (
                    <div
                      key={product.id}
                      className="flex items-center justify-between gap-3 p-3 bg-gray-50 dark:bg-gray-800/70 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 transition-colors"
                    >
                      {/* Posición e Imagen */}
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs shrink-0 shadow-2xs ${
                          idx === 0 
                            ? 'bg-amber-400 text-gray-950 font-black' 
                            : idx === 1 
                            ? 'bg-gray-300 text-gray-900 font-black' 
                            : idx === 2 
                            ? 'bg-amber-700 text-amber-100 font-black' 
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}>
                          #{idx + 1}
                        </span>

                        {product.image_url_1 ? (
                          <img
                            src={optimizeImageUrl(product.image_url_1, 150)}
                            alt={product.name}
                            className="w-11 h-11 rounded-lg object-contain bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shrink-0 p-0.5"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-lg bg-gray-200 dark:bg-gray-800 flex items-center justify-center shrink-0">
                            <Package className="w-5 h-5 text-gray-400" />
                          </div>
                        )}

                        <div className="min-w-0">
                          <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
                            {product.name}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                            <span className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300 px-1.5 py-0.5 rounded text-[10px] font-bold">
                              {product.category || 'Sin Categoría'}
                            </span>
                            <span className="font-bold text-gray-900 dark:text-gray-200">${product.price}</span>
                            <span>•</span>
                            <span className={product.stock > 10 ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-red-500 dark:text-red-400 font-semibold'}>
                              Stock: {product.stock}
                            </span>
                            {product.discount_percentage > 0 && (
                              <span className="text-secondary font-black">
                                -{product.discount_percentage}%
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Controles: Mover Arriba, Mover Abajo, Quitar */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleMoveUp(idx)}
                          disabled={isFirst}
                          title="Subir posición"
                          className="w-7 h-7 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleMoveDown(idx)}
                          disabled={isLast}
                          title="Bajar posición"
                          className="w-7 h-7 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRemoveProduct(product.id)}
                          title="Quitar de Más Vendidos"
                          className="w-7 h-7 rounded-lg bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/60 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 flex items-center justify-center cursor-pointer transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Columna Derecha: Vista Previa en Vivo (Live Preview) */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-xs sticky top-2 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-primary" />
                Vista Previa de la Tienda
              </h3>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                formConfig.is_active 
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
              }`}>
                {formConfig.is_active ? 'Activa' : 'Oculta'}
              </span>
            </div>

            {/* Simulación del Bloque en la Tienda */}
            <div className="bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl p-3.5 space-y-3">
              <div>
                <div className="inline-flex items-center gap-1 text-[10px] font-extrabold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800 mb-1">
                  <Flame className="w-3 h-3 fill-amber-500 text-amber-500" />
                  <span>{formConfig.badge_text || 'TOP VENTAS'}</span>
                </div>
                <h4 className="text-base font-extrabold text-gray-900 dark:text-white leading-tight">
                  {formConfig.title || 'Los Más Vendidos'}
                </h4>
                {formConfig.subtitle && (
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5">
                    {formConfig.subtitle}
                  </p>
                )}
              </div>

              {/* Muestra de tarjetas miniatura */}
              {selectedProducts.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-400">
                  Agrega productos para previsualizarlos aquí.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {selectedProducts.slice(0, 4).map((prod, idx) => (
                    <div
                      key={prod.id}
                      className="bg-white dark:bg-gray-900 p-2 rounded-lg border border-gray-200 dark:border-gray-800 text-center space-y-1 shadow-2xs relative"
                    >
                      <span className="absolute top-1 left-1 bg-amber-400 text-gray-950 text-[9px] font-black px-1 rounded">
                        #{idx + 1}
                      </span>
                      {prod.image_url_1 ? (
                        <img
                          src={optimizeImageUrl(prod.image_url_1, 120)}
                          alt={prod.name}
                          className="w-12 h-12 mx-auto object-contain"
                        />
                      ) : (
                        <div className="w-12 h-12 mx-auto bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-center">
                          <Package className="w-4 h-4 text-gray-400" />
                        </div>
                      )}
                      <p className="text-[11px] font-bold text-gray-900 dark:text-white truncate">
                        {prod.name}
                      </p>
                      <p className="text-[11px] font-extrabold text-primary dark:text-blue-400">
                        ${prod.price}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {selectedProducts.length > 4 && (
                <p className="text-center text-[10px] text-gray-400">
                  + {selectedProducts.length - 4} producto(s) más en el carrusel
                </p>
              )}
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-900/60 flex items-start gap-2.5 text-xs text-blue-800 dark:text-blue-300">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <p>
                Los cambios se aplican de inmediato en la tienda tras presionar <strong>Guardar Cambios</strong>.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tarjeta Inferior: Explorador y Selector del Catálogo */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-800 pb-4">
          <div>
            <h2 className="text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              Explorador de Productos
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Haz clic en &quot;Agregar&quot; para sumar cualquier producto a la vitrina de Más Vendidos.
            </p>
          </div>

          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">
            Mostrando {availableCatalogProducts.length} de {allProducts.length} productos
          </div>
        </div>

        {/* Filtros del Explorador */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
            {/* Buscador */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                placeholder="Buscar por nombre o descripción..."
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl pl-9 pr-8 py-2 text-xs sm:text-sm text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-primary focus:outline-hidden"
              />
              {catalogSearch && (
                <button
                  onClick={() => setCatalogSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Selector de Categoría */}
            <div className="relative min-w-[200px]">
              <Filter className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl pl-9 pr-8 py-2 text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-primary focus:outline-hidden cursor-pointer"
              >
                <option value="ALL">Todas las categorías</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
                <option value="UNCATEGORIZED">Sin Categoría</option>
              </select>
            </div>

            {/* Checkbox solo con stock */}
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700 dark:text-gray-300 select-none">
              <input
                type="checkbox"
                checked={onlyInStock}
                onChange={(e) => setOnlyInStock(e.target.checked)}
                className="w-4 h-4 rounded text-primary focus:ring-primary border-gray-300 dark:border-gray-600 cursor-pointer"
              />
              Solo con stock
            </label>
          </div>

          {(catalogSearch || selectedCategory !== 'ALL') && (
            <button
              onClick={() => {
                setCatalogSearch('');
                setSelectedCategory('ALL');
              }}
              className="text-xs font-bold text-red-600 hover:text-red-700 dark:text-red-400 underline cursor-pointer self-start md:self-center"
            >
              Limpiar filtros
            </button>
          )}
        </div>

        {/* Grilla de Productos del Catálogo */}
        {availableCatalogProducts.length === 0 ? (
          <div className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm">
            No se encontraron productos con los filtros aplicados.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3.5">
            {availableCatalogProducts.map((product) => {
              const isSelected = selectedIdsSet.has(product.id);
              const position = formConfig.product_ids.indexOf(product.id);

              return (
                <div
                  key={product.id}
                  className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-300 dark:border-amber-600/70 shadow-xs ring-1 ring-amber-400/40 dark:ring-amber-500/30'
                      : 'bg-white dark:bg-gray-800/80 border-gray-200 dark:border-gray-700/80 hover:border-gray-300 dark:hover:border-gray-600 hover:dark:bg-gray-800 shadow-2xs'
                  }`}
                >
                  <div className="flex items-start gap-3 mb-3">
                    {product.image_url_1 ? (
                      <img
                        src={optimizeImageUrl(product.image_url_1, 150)}
                        alt={product.name}
                        className="w-14 h-14 rounded-xl object-contain bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shrink-0 p-1"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 flex items-center justify-center shrink-0">
                        <Package className="w-6 h-6 text-gray-400" />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-gray-900 dark:text-gray-100 line-clamp-2 leading-tight">
                        {product.name}
                      </p>
                      <span className="inline-block text-[10px] font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700/60 px-1.5 py-0.5 rounded mt-1 truncate">
                        {product.category || 'Sin Categoría'}
                      </span>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs font-black text-primary dark:text-blue-400">
                          ${product.price}
                        </span>
                        <span className={`text-[10px] font-bold ${
                          product.stock > 10 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'
                        }`}>
                          Stock: {product.stock}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    {isSelected ? (
                      <button
                        type="button"
                        onClick={() => handleRemoveProduct(product.id)}
                        className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700/80 hover:bg-red-50 hover:text-red-700 hover:border-red-300 dark:hover:bg-red-950/70 dark:hover:text-red-300 dark:hover:border-red-800 transition-colors cursor-pointer group"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 group-hover:hidden" />
                        <Trash2 className="w-3.5 h-3.5 text-red-600 dark:text-red-400 hidden group-hover:block" />
                        <span className="group-hover:hidden">Seleccionado (#{position + 1})</span>
                        <span className="hidden group-hover:inline">Quitar de lista</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleAddProduct(product.id)}
                        className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold bg-gray-900 hover:bg-primary dark:bg-primary/20 dark:hover:bg-primary text-white dark:text-blue-200 dark:hover:text-white dark:border dark:border-primary/40 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Agregar a Más Vendidos</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
