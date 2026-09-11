/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  useCategoryShowcases, 
  saveCategoryShowcases, 
  CategoryShowcase 
} from '@/lib/categories-showcase-config';
import { checkLandingTableExists } from '@/lib/landing-config';
import { useProducts, optimizeImageUrl } from '@/lib/products-cache';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-toastify';
import { 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Upload, 
  Save, 
  Eye, 
  CheckCircle2, 
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Tags, 
  FileText, 
  Percent
} from 'lucide-react';

const DEFAULT_CATEGORIES = [
  'Bebidas',
  'Snacks',
  'Alimentos',
  'Limpieza',
  'Verdulería',
  'Pescadería',
  'Carnicería',
  'Lácteos',
  'Cuidado Personal'
];

export default function CategoriasDashboardPage() {
  const { showcases, loading } = useCategoryShowcases();
  const { products: allProducts } = useProducts();
  const [formShowcases, setFormShowcases] = useState<CategoryShowcase[]>(showcases);
  const [dbCategories, setDbCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [saving, setSaving] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [tableWarning, setTableWarning] = useState(false);
  const [checkingTable, setCheckingTable] = useState(false);

  useEffect(() => {
    if (showcases) {
      setFormShowcases(showcases);
    }
  }, [showcases]);

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

  // Cargar categorías existentes en la base de datos de productos
  useEffect(() => {
    async function loadExistingCategories() {
      try {
        const { data } = await supabase.from('products').select('category');
        if (data) {
          const cats = data.map((p) => p.category).filter(Boolean);
          const merged = Array.from(new Set([...DEFAULT_CATEGORIES, ...cats]));
          setDbCategories(merged);
        }
      } catch {
        // ignore
      }
    }
    loadExistingCategories();
  }, []);

  const getProductCountForCategory = (cat: string) => {
    return allProducts.filter(
      (p) => (p.category || '').trim().toLowerCase() === cat.trim().toLowerCase()
    ).length;
  };

  const handleUploadImage = async (file: File, index: number) => {
    setUploadingIndex(index);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'unsigned_preset');
      
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      if (!cloudName) {
        throw new Error('Cloudinary no está configurado aún en las variables de entorno.');
      }

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Error al subir imagen a Cloudinary');
      const data = await res.json();

      updateShowcase(index, 'banner_image_url', data.secure_url);
      toast.success('¡Imagen subida correctamente!');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Error al subir la imagen');
    } finally {
      setUploadingIndex(null);
    }
  };

  const handleAddShowcase = () => {
    const newShowcase: CategoryShowcase = {
      id: `showcase-${Date.now()}`,
      category: dbCategories[0] || 'Bebidas',
      is_active: true,
      badge_discount: '15%',
      badge_tag: 'exclusivo online',
      title: 'en productos seleccionados',
      banner_image_url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80',
      disclaimer_text: 'HASTA EL 30/09/2026. PARA MÁS INFORMACIÓN Y CONDICIONES APLICABLES CONSULTAR LEGALES. VER LEGALES',
      discount_percentage: 15,
    };
    setFormShowcases([...formShowcases, newShowcase]);
  };

  const handleRemoveShowcase = (index: number) => {
    const updated = formShowcases.filter((_, i) => i !== index);
    setFormShowcases(updated);
    if (previewIndex >= updated.length) {
      setPreviewIndex(Math.max(0, updated.length - 1));
    }
  };

  const updateShowcase = (index: number, field: keyof CategoryShowcase, value: any) => {
    const updated = [...formShowcases];
    updated[index] = { ...updated[index], [field]: value };
    setFormShowcases(updated);
  };

  const moveShowcase = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= formShowcases.length) return;

    const updated = [...formShowcases];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setFormShowcases(updated);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await saveCategoryShowcases(formShowcases);
      if (res.cloudSynced) {
        setTableWarning(false);
        toast.success('☁️ ¡Vitrinas de categorías guardadas y sincronizadas con la nube!');
      } else {
        setTableWarning(true);
        toast.info('💾 Guardado localmente. Para sincronizar con todos los compradores, ejecutá supabase_landing_schema.sql en Supabase.');
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Error al guardar las secciones de categorías: ' + (err?.message || ''));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Cargando secciones de categorías...</div>;
  }

  const activePreview = formShowcases[previewIndex] || formShowcases[0];
  const activeMaxDiscount = activePreview ? (Number(activePreview.discount_percentage) || 0) : 0;
  const previewProducts = activePreview
    ? allProducts.filter((p) => {
        const matchesCategory = (p.category || '').trim().toLowerCase() === (activePreview.category || '').trim().toLowerCase();
        if (!matchesCategory) return false;
        const prodDiscount = Number(p.discount_percentage) || 0;
        if (prodDiscount <= 0) return false;
        if (activeMaxDiscount > 0 && prodDiscount > activeMaxDiscount) return false;
        return true;
      })
    : [];

  return (
    <div className="h-full flex flex-col min-h-0 overflow-y-auto pr-1">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 flex-shrink-0">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">Vitrinas de Categorías</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Crea y administra secciones promocionales por categoría. Cada sección mostrará automáticamente y de forma exclusiva los productos de la categoría elegida.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold px-4 py-2.5 rounded-xl shadow-xs text-xs transition-colors cursor-pointer"
            title="Abrir la portada de la tienda en una pestaña nueva"
          >
            <Eye className="w-4 h-4 text-primary" />
            <span>Ver en Tienda</span>
            <ExternalLink className="w-3 h-3 opacity-60 ml-0.5" />
          </Link>

          <button
            onClick={handleAddShowcase}
            className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950/60 text-primary dark:text-blue-400 font-bold px-4 py-2.5 rounded-xl border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition-all cursor-pointer text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Sección</span>
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-bold px-6 py-2.5 rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer text-sm"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Guardando...' : 'Guardar Cambios'}</span>
          </button>
        </div>
      </div>

      {/* Alerta de Tabla Supabase */}
      {tableWarning && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/80 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900 dark:text-amber-200 text-xs mb-6 flex-shrink-0">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-12">
        {/* Columna Izquierda / Central: Lista de Secciones */}
        <div className="lg:col-span-2 space-y-6">
          {formShowcases.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-3xl p-12 text-center">
              <Tags className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h3 className="text-base font-bold text-gray-800 dark:text-gray-200 mb-1">
                No hay vitrinas de categorías configuradas
              </h3>
              <p className="text-xs text-gray-500 mb-4 max-w-sm mx-auto">
                Crea una sección para mostrar un banner temático y los productos de una categoría específica en la Landing Page.
              </p>
              <button
                onClick={handleAddShowcase}
                className="bg-primary text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-md cursor-pointer"
              >
                Agregar Primera Sección
              </button>
            </div>
          ) : (
            formShowcases.map((showcase, idx) => {
              const productCount = getProductCountForCategory(showcase.category);

              return (
                <div
                  key={showcase.id || idx}
                  className="bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-5"
                >
                  {/* Cabecera de la Sección */}
                  <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
                    <div className="flex items-center gap-3">
                      <span className="bg-primary text-white text-xs font-black px-2.5 py-1 rounded-lg">
                        Sección #{idx + 1}
                      </span>
                      <span className="font-extrabold text-sm sm:text-base text-gray-900 dark:text-white">
                        {showcase.category || 'Sin Categoría'} — {showcase.title || 'Promoción'}
                      </span>
                    </div>

                    {/* Controles: Activo / Reordenar / Eliminar */}
                    <div className="flex items-center gap-2">
                      <label className="relative inline-flex items-center cursor-pointer mr-2" title="Activar / Desactivar">
                        <input
                          type="checkbox"
                          checked={showcase.is_active}
                          onChange={(e) => updateShowcase(idx, 'is_active', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                      </label>

                      <button
                        onClick={() => setPreviewIndex(idx)}
                        className="text-xs font-bold text-primary dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1.5 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
                        title="Ver en previsualización"
                      >
                        <Eye className="w-3.5 h-3.5 inline mr-1" />
                        Preview
                      </button>

                      <button
                        onClick={() => moveShowcase(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1.5 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-30 transition-colors cursor-pointer"
                        title="Mover arriba"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => moveShowcase(idx, 'down')}
                        disabled={idx === formShowcases.length - 1}
                        className="p-1.5 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-30 transition-colors cursor-pointer"
                        title="Mover abajo"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleRemoveShowcase(idx)}
                        className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition-colors cursor-pointer"
                        title="Eliminar sección"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Formulario de la Sección */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    {/* Categoría a Vincular */}
                    <div>
                      <label className="block text-gray-700 dark:text-gray-300 font-extrabold mb-1">
                        📂 Categoría a mostrar:
                      </label>
                      <select
                        value={showcase.category}
                        onChange={(e) => updateShowcase(idx, 'category', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-primary"
                      >
                        {dbCategories.map((cat) => {
                          const count = getProductCountForCategory(cat);
                          return (
                            <option key={cat} value={cat}>
                              {cat} ({count} {count === 1 ? 'producto' : 'productos'})
                            </option>
                          );
                        })}
                      </select>

                      {productCount > 0 ? (
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-1.5 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>{productCount} {productCount === 1 ? 'producto de esta categoría se mostrará' : 'productos de esta categoría se mostrarán'} en la tienda.</span>
                        </p>
                      ) : (
                        <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold mt-1.5 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>No hay productos con categoría &quot;{showcase.category}&quot;. Crea o edita productos en la sección Productos.</span>
                        </p>
                      )}
                    </div>

                    {/* Descuento numérico (%) */}
                    <div>
                      <label className="block text-gray-700 dark:text-gray-300 font-extrabold mb-1">
                        Descuento Máximo de la Sección (%):
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={showcase.discount_percentage === 0 ? '0' : (showcase.discount_percentage ?? '')}
                          onChange={(e) => {
                            const val = e.target.value === '' ? 0 : Number(e.target.value);
                            updateShowcase(idx, 'discount_percentage', val);
                          }}
                          placeholder="0 (sin tope)"
                          className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-primary pr-8"
                        />
                        <Percent className="w-3.5 h-3.5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
                      </div>
                      <p className="text-[10px] text-gray-500 mt-1">
                        Solo se mostrarán productos con descuento activo. Si indicas un valor (ej: 20%), fijará el <strong>descuento máximo</strong> mostrado.
                      </p>
                    </div>

                    {/* Texto de Descuento en Banner (ej: 15% o dejar vacío) */}
                    <div className="bg-red-50 dark:bg-red-950/40 p-3 rounded-2xl border border-red-200 dark:border-red-900/60">
                      <label className="block text-red-700 dark:text-red-300 font-extrabold mb-1">
                        🟥 Texto Grande de Descuento (Opcional):
                      </label>
                      <input
                        type="text"
                        value={showcase.badge_discount || ''}
                        onChange={(e) => updateShowcase(idx, 'badge_discount', e.target.value)}
                        placeholder="Ej. 15% (dejar vacío o 0 si no hay descuento)"
                        className="w-full px-3 py-2 rounded-xl border border-red-300 dark:border-red-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-black text-sm outline-none focus:ring-2 focus:ring-red-500"
                      />
                      <p className="text-[10px] text-red-600/80 dark:text-red-400 mt-1">
                        Si lo dejas vacío o en 0, no se mostrará descuento en el banner.
                      </p>
                    </div>

                    {/* Píldora de Texto (ej: exclusivo online) */}
                    <div className="bg-red-50 dark:bg-red-950/40 p-3 rounded-2xl border border-red-200 dark:border-red-900/60">
                      <label className="block text-red-700 dark:text-red-300 font-extrabold mb-1">
                        🔴 Píldora del Bloque Rojo:
                      </label>
                      <input
                        type="text"
                        value={showcase.badge_tag}
                        onChange={(e) => updateShowcase(idx, 'badge_tag', e.target.value)}
                        placeholder="Ej. exclusivo online o solo por mayor"
                        className="w-full px-3 py-2 rounded-xl border border-red-300 dark:border-red-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>

                    {/* Título Descriptivo */}
                    <div className="sm:col-span-2">
                      <label className="block text-gray-700 dark:text-gray-300 font-extrabold mb-1">
                        🏷️ Título de la Vitrina (aparece al lado de &quot;en seleccionados de&quot;):
                      </label>
                      <input
                        type="text"
                        value={showcase.title}
                        onChange={(e) => updateShowcase(idx, 'title', e.target.value)}
                        placeholder="Ej. verdulería o toda nuestra pescadería"
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    {/* Imagen de Fondo / Banner */}
                    <div className="sm:col-span-2">
                      <label className="block text-gray-700 dark:text-gray-300 font-extrabold mb-1">
                        🖼️ Imagen del Banner Promocional:
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={showcase.banner_image_url}
                          onChange={(e) => updateShowcase(idx, 'banner_image_url', e.target.value)}
                          placeholder="https://ejemplo.com/verduleria.jpg"
                          className="flex-1 px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary"
                        />
                        <label className="flex items-center gap-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-xl font-bold cursor-pointer transition-colors">
                          <Upload className="w-3.5 h-3.5" />
                          <span>{uploadingIndex === idx ? 'Subiendo...' : 'Subir'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={uploadingIndex !== null}
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                handleUploadImage(e.target.files[0], idx);
                              }
                            }}
                          />
                        </label>
                      </div>
                    </div>

                    {/* Aviso Legal Inferior */}
                    <div className="sm:col-span-2">
                      <label className="block text-gray-700 dark:text-gray-300 font-extrabold mb-1 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-secondary" />
                        Aviso Legal / Condiciones de la Sección:
                      </label>
                      <textarea
                        rows={2}
                        value={showcase.disclaimer_text}
                        onChange={(e) => updateShowcase(idx, 'disclaimer_text', e.target.value)}
                        placeholder="Ej. HASTA EL 07/09/2026. PARA MÁS INFORMACIÓN Y CONDICIONES APLICABLES BUSCAR EN LOS LEGALES... VER LEGALES"
                        className="w-full p-2.5 text-xs font-mono rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-secondary leading-snug"
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Columna Derecha: Previsualización en Vivo */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-5 sticky top-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between text-gray-900 dark:text-white font-bold text-sm border-b border-gray-100 dark:border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-primary dark:text-blue-400" />
                <span>Previsualización en Vivo</span>
              </div>
              {formShowcases.length > 0 && (
                <span className="text-xs text-gray-500 font-normal">
                  Sección {previewIndex + 1} de {formShowcases.length}
                </span>
              )}
            </div>

            {activePreview ? (
              <div className="space-y-4">
                {/* Banner de la sección en preview */}
                <div className="rounded-2xl overflow-hidden border-2 border-gray-300 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-900">
                  <div className="relative h-28 w-full bg-gray-100 dark:bg-gray-800 overflow-hidden flex items-center">
                    <img
                      src={optimizeImageUrl(activePreview.banner_image_url, 500)}
                      alt="Preview"
                      className="absolute right-0 top-0 bottom-0 w-2/5 object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-white via-white/50 to-transparent dark:from-gray-900 dark:via-gray-900/50 dark:to-transparent"></div>

                    {/* Bloque Rojo a la izquierda (solo si hay descuento o etiqueta) */}
                    {(activePreview.badge_discount || activePreview.badge_tag) && activePreview.badge_discount !== '0' && activePreview.badge_discount !== '0%' && (
                      <div className="absolute left-0 top-0 bottom-0 w-[27%] bg-[#e30613] rounded-r-xl flex flex-col items-center justify-center p-1 text-white z-10 shadow-md">
                        {activePreview.badge_discount && (
                          <>
                            <span className="text-xl font-black leading-none">
                              {activePreview.badge_discount}
                            </span>
                            <span className="text-[7px] font-bold uppercase">descuento</span>
                          </>
                        )}
                        {activePreview.badge_tag && (
                          <span className="text-[6px] font-black bg-white/20 px-1 py-0.2 rounded-full mt-0.5">
                            {activePreview.badge_tag}
                          </span>
                        )}
                      </div>
                    )}

                    <div className={`pr-2 z-10 ${
                      (activePreview.badge_discount || activePreview.badge_tag) && activePreview.badge_discount !== '0' && activePreview.badge_discount !== '0%'
                        ? 'pl-[30%]' 
                        : 'pl-4'
                    }`}>
                      <span className="text-[8px] font-bold text-gray-400 uppercase block">
                        en seleccionados de
                      </span>
                      <h4 className="text-xs font-black text-gray-900 dark:text-white capitalize leading-tight">
                        {activePreview.title || activePreview.category}
                      </h4>
                    </div>
                  </div>

                  {activePreview.disclaimer_text && (
                    <div className="bg-gray-200 dark:bg-gray-800 py-1 px-2 text-center border-t border-gray-300 dark:border-gray-700">
                      <p className="text-[7px] font-bold text-gray-700 dark:text-gray-300 uppercase line-clamp-2">
                        {activePreview.disclaimer_text}
                      </p>
                    </div>
                  )}
                </div>

                {/* Productos reales correspondientes a esta categoría en la previsualización */}
                <div>
                  <p className="text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-2">
                    Productos vinculados ({previewProducts.length}):
                  </p>

                  {previewProducts.length > 0 ? (
                    <div className="space-y-2">
                      {previewProducts.slice(0, 2).map((product) => {
                        const regular = product.price;
                        const disc = product.discount_percentage > 0 
                          ? product.discount_percentage 
                          : (Number(activePreview.discount_percentage) || 0);
                        const hasDisc = disc > 0;
                        const finalP = hasDisc ? regular - (regular * (disc / 100)) : regular;

                        return (
                          <div 
                            key={product.id}
                            className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-2.5 border border-gray-200 dark:border-gray-700 flex items-center gap-3"
                          >
                            <img 
                              src={optimizeImageUrl(product.image_url_1, 150)} 
                              alt={product.name}
                              className="w-12 h-12 rounded-lg object-contain bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800" 
                            />
                            <div className="flex-1 min-w-0">
                              <h5 className="text-xs font-bold text-gray-900 dark:text-white truncate">
                                {product.name}
                              </h5>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs font-black text-primary dark:text-blue-400">
                                  ${finalP.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                </span>
                                {hasDisc && (
                                  <span className="text-[10px] text-gray-400 line-through">
                                    ${regular.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                  </span>
                                )}
                              </div>
                            </div>
                            {hasDisc && (
                              <span className="bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 text-[10px] font-black px-1.5 py-0.5 rounded">
                                -{disc}%
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl border border-dashed border-amber-300 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 text-center">
                      <p className="text-xs font-bold text-amber-800 dark:text-amber-300">
                        Sin productos cargados
                      </p>
                      <p className="text-[10px] text-amber-700/80 dark:text-amber-400 mt-0.5">
                        Esta sección solo se mostrará en la tienda cuando asignes productos con la categoría &quot;{activePreview.category}&quot;.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-gray-400 text-xs">
                No hay ninguna sección activa.
              </div>
            )}

            <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white font-bold py-3 rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 text-sm cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Guardando...' : 'Guardar y Publicar'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
