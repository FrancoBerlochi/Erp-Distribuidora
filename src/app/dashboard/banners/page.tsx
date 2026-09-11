/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  useLandingConfig, 
  saveLandingConfig, 
  checkLandingTableExists,
  LandingConfig, 
  BannerSlide 
} from '@/lib/landing-config';
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
  ImageIcon, 
  FileText, 
  Sliders,
  AlertTriangle,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { optimizeImageUrl } from '@/lib/products-cache';

export default function BannersPage() {
  const { config, loading } = useLandingConfig();
  const [formConfig, setFormConfig] = useState<LandingConfig>(config);
  const [saving, setSaving] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [previewIndex, setPreviewIndex] = useState(0);
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

  // Subir imagen a Cloudinary
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

      updateSlide(index, 'image_url', data.secure_url);
      toast.success('¡Imagen subida correctamente!');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Error al subir la imagen');
    } finally {
      setUploadingIndex(null);
    }
  };

  const handleAddSlide = () => {
    const newSlide: BannerSlide = {
      id: `slide-${Date.now()}`,
      image_url: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=1200&q=80',
      badge_text: '3x2',
      title: 'en vinos finos, espumantes y champañas',
      link_url: '/ofertas',
      disclaimer_text: 'HASTA EL 08/09/2026. PARA MÁS INFORMACIÓN O LIMITACIONES APLICABLES CONSULTE EN SECCIÓN "SALÓN". EL CONSUMO EXCESIVO DE ALCOHOL ES PERJUDICIAL PARA LA SALUD. BEBER CON MODERACIÓN. PROHIBIDA SU VENTA A MENORES DE 18 AÑOS. VER LEGALES',
    };
    setFormConfig({
      ...formConfig,
      slides: [...formConfig.slides, newSlide],
    });
  };

  const handleRemoveSlide = (index: number) => {
    const updated = formConfig.slides.filter((_, i) => i !== index);
    setFormConfig({ ...formConfig, slides: updated });
    if (previewIndex >= updated.length) {
      setPreviewIndex(Math.max(0, updated.length - 1));
    }
  };

  const updateSlide = (index: number, field: keyof BannerSlide, value: string) => {
    const updated = [...formConfig.slides];
    updated[index] = { ...updated[index], [field]: value };
    setFormConfig({ ...formConfig, slides: updated });
  };

  const moveSlide = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= formConfig.slides.length) return;

    const updated = [...formConfig.slides];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setFormConfig({ ...formConfig, slides: updated });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await saveLandingConfig(formConfig);
      if (res.cloudSynced) {
        setTableWarning(false);
        toast.success('☁️ ¡Banners guardados y sincronizados con la nube!');
      } else {
        setTableWarning(true);
        toast.info('💾 Guardado localmente. Para sincronizar con todos los compradores, ejecutá supabase_landing_schema.sql en Supabase.');
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Error al guardar los banners: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Cargando banners...</div>;
  }

  const activePreviewSlide = formConfig.slides[previewIndex] || formConfig.slides[0];

  return (
    <div className="h-full flex flex-col min-h-0 overflow-y-auto pr-1">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 flex-shrink-0">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">Banners Promocionales</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Personaliza el carrusel de banners con bloque de promoción (27%) y aviso legal para cada imagen.
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
            onClick={handleSave}
            disabled={saving}
            className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white font-bold px-6 py-2.5 rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer text-xs sm:text-sm"
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
        {/* Columna Izquierda / Central: Formulario */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card: Estado General del Carrusel */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-primary dark:text-blue-400">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">Carrusel de Banners</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Activa o desactiva la visualización en la Landing</p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formConfig.carousel_active}
                  onChange={(e) => setFormConfig({ ...formConfig, carousel_active: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-12 h-6.5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            {formConfig.carousel_active && (
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center gap-4 text-xs font-semibold text-gray-700 dark:text-gray-300">
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" /> Carrusel visible en la tienda
                </span>
                <span>•</span>
                <span>{formConfig.slides.length} {formConfig.slides.length === 1 ? 'banner configurado' : 'banners configurados'}</span>
              </div>
            )}
          </div>

          {/* Card: Gestión de Imágenes / Slides */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-primary dark:text-blue-400" />
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Imágenes de los Banners</h2>
              </div>

              <button
                onClick={handleAddSlide}
                className="flex items-center gap-1.5 text-xs font-bold bg-blue-50 dark:bg-blue-950/50 text-primary dark:text-blue-400 border border-blue-200 dark:border-blue-800/60 px-3 py-2 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Agregar Banner</span>
              </button>
            </div>

            {formConfig.slides.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
                <p className="text-sm text-gray-500 mb-3">No hay banners en el carrusel.</p>
                <button
                  onClick={handleAddSlide}
                  className="bg-primary text-white text-xs font-bold px-4 py-2 rounded-lg cursor-pointer"
                >
                  Agregar primer banner
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {formConfig.slides.map((slide, idx) => (
                  <div 
                    key={slide.id || idx} 
                    className={`p-4 sm:p-5 rounded-2xl border-2 transition-all space-y-4 ${
                      slide.is_active === false
                        ? 'border-dashed border-gray-300 dark:border-gray-700 bg-gray-100/50 dark:bg-gray-800/20 opacity-80'
                        : 'border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40'
                    }`}
                  >
                    {/* Encabezado del Slide */}
                    <div className="flex flex-wrap items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-3 gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="bg-primary text-white text-xs font-black px-2 py-0.5 rounded-md">
                          Banner #{idx + 1}
                        </span>

                        {/* Switch ON/OFF Individual */}
                        <div className="flex items-center gap-1.5 ml-1">
                          <label className="relative inline-flex items-center cursor-pointer" title={slide.is_active !== false ? 'Pausar este banner (no se mostrará en la tienda)' : 'Activar este banner en la tienda'}>
                            <input
                              type="checkbox"
                              checked={slide.is_active !== false}
                              onChange={(e) => updateSlide(idx, 'is_active' as any, e.target.checked as any)}
                              className="sr-only peer"
                            />
                            <div className="w-8 h-4.5 bg-gray-300 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-emerald-600"></div>
                          </label>
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                            slide.is_active !== false
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-400 border border-gray-300 dark:border-gray-700'
                          }`}>
                            {slide.is_active !== false ? 'Activo' : 'Pausado'}
                          </span>
                        </div>

                        <span className="text-xs font-bold text-gray-700 dark:text-gray-300 truncate max-w-[150px] sm:max-w-xs">
                          {slide.badge_text ? `[${slide.badge_text}] ` : ''}{slide.title || 'Sin título'}
                        </span>
                      </div>

                      {/* Botones de Reordenar y Eliminar */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setPreviewIndex(idx)}
                          className="text-[11px] font-bold text-primary dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-1 rounded-md hover:bg-blue-100 transition-colors mr-1 cursor-pointer"
                          title="Ver en previsualización"
                        >
                          Ver en Preview
                        </button>
                        <button
                          onClick={() => moveSlide(idx, 'up')}
                          disabled={idx === 0}
                          className="p-1.5 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-30 transition-colors cursor-pointer"
                          title="Mover arriba"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => moveSlide(idx, 'down')}
                          disabled={idx === formConfig.slides.length - 1}
                          className="p-1.5 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-30 transition-colors cursor-pointer"
                          title="Mover abajo"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleRemoveSlide(idx)}
                          className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition-colors ml-1 cursor-pointer"
                          title="Eliminar imagen"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 items-start">
                      {/* Miniatura con el Cuadrado Rojo simulado */}
                      <div className="w-full sm:w-36 h-28 bg-gray-200 dark:bg-gray-700 rounded-xl overflow-hidden flex-shrink-0 relative border border-gray-300 dark:border-gray-600 shadow-inner">
                        <img 
                          src={optimizeImageUrl(slide.image_url, 300)} 
                          alt={slide.title || 'Slide'} 
                          className="w-full h-full object-cover" 
                        />
                        {slide.badge_text && (
                          <div className="absolute left-0 top-0 bottom-0 w-[27%] bg-[#e30613] rounded-r-lg flex items-center justify-center p-0.5 shadow-md">
                            <span className="text-white font-black text-xs text-center leading-none">
                              {slide.badge_text}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Inputs de configuración */}
                      <div className="flex-1 space-y-3 w-full text-xs">
                        {/* URL o Subida de Imagen */}
                        <div>
                          <label className="block text-gray-600 dark:text-gray-300 font-bold mb-1">
                            URL de la Imagen o Subir Archivo:
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={slide.image_url}
                              onChange={(e) => updateSlide(idx, 'image_url', e.target.value)}
                              placeholder="https://ejemplo.com/banner.jpg"
                              className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-primary"
                            />
                            <label className="flex items-center gap-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 px-3 py-2 rounded-lg font-bold cursor-pointer transition-colors">
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

                        {/* Bloque Rojo (Ocupa el 27% total sin padding ni margin) */}
                        <div className="bg-red-50 dark:bg-red-950/40 p-3 rounded-xl border border-red-200 dark:border-red-900/60">
                          <label className="block text-red-700 dark:text-red-300 font-extrabold mb-1 flex items-center gap-1.5">
                            <span className="w-3 h-3 bg-red-600 rounded-sm inline-block"></span>
                            Texto del Bloque Rojo (Ocupa el 27% total de la imagen para promo/descuento):
                          </label>
                          <input
                            type="text"
                            value={slide.badge_text || ''}
                            onChange={(e) => updateSlide(idx, 'badge_text', e.target.value)}
                            placeholder="Ej. 3x2, 40% OFF, 2x1, OFERTA"
                            className="w-full px-3 py-2 rounded-lg border border-red-300 dark:border-red-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-black text-sm outline-none focus:ring-2 focus:ring-red-500"
                          />
                          <p className="text-[11px] text-red-600 dark:text-red-400 mt-1">
                            Aparece como un bloque rojo de borde a borde ocupando el 27% del ancho del banner. Si lo dejas vacío, se ve la imagen completa.
                          </p>
                        </div>

                        {/* Título y Enlace */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-gray-600 dark:text-gray-300 font-bold mb-1">
                              Texto Descriptivo al lado (Opcional):
                            </label>
                            <input
                              type="text"
                              value={slide.title || ''}
                              onChange={(e) => updateSlide(idx, 'title', e.target.value)}
                              placeholder="Ej. en vinos finos, espumantes y champañas"
                              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-primary"
                            />
                          </div>
                          <div>
                            <label className="block text-gray-600 dark:text-gray-300 font-bold mb-1">
                              Enlace al hacer clic (Opcional):
                            </label>
                            <input
                              type="text"
                              value={slide.link_url || ''}
                              onChange={(e) => updateSlide(idx, 'link_url', e.target.value)}
                              placeholder="Ej. /ofertas o #catalogo"
                              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-primary"
                            />
                          </div>
                        </div>

                        {/* Aviso Legal ESPECÍFICO de ESTA imagen */}
                        <div>
                          <label className="block text-gray-700 dark:text-gray-200 font-bold mb-1 flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-secondary" />
                            Aviso Legal / Condiciones de ESTA imagen:
                          </label>
                          <textarea
                            rows={2}
                            value={slide.disclaimer_text || ''}
                            onChange={(e) => updateSlide(idx, 'disclaimer_text', e.target.value)}
                            placeholder="Ej. HASTA EL 08/09/2026. PARA MÁS INFORMACIÓN O LIMITACIONES APLICABLES..."
                            className="w-full p-2.5 text-xs font-mono rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-secondary leading-snug"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Columna Derecha: Previsualización en Vivo */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 sticky top-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between text-gray-900 dark:text-white font-bold text-sm border-b border-gray-100 dark:border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-primary dark:text-blue-400" />
                <span>Previsualización en Vivo</span>
              </div>
              {formConfig.slides.length > 1 && (
                <span className="text-xs text-gray-500 font-normal">
                  Slide {previewIndex + 1} de {formConfig.slides.length}
                </span>
              )}
            </div>

            {formConfig.carousel_active && formConfig.slides.length > 0 && activePreviewSlide ? (
              <div className="space-y-3">
                {/* Simulación exacta del componente BannerCarousel */}
                <div className="rounded-2xl overflow-hidden border-2 border-gray-300 dark:border-gray-700 shadow-md bg-white dark:bg-gray-900">
                  <div className="h-44 w-full bg-gray-100 dark:bg-gray-800 overflow-hidden relative flex items-center justify-center">
                    {/* Imagen de fondo */}
                    <img 
                      src={optimizeImageUrl(activePreviewSlide.image_url, 600)} 
                      alt="Preview" 
                      className="w-full h-full object-cover" 
                    />

                    {/* Bloque Rojo (Ocupa el 27% total sin padding ni margin) */}
                    {activePreviewSlide.badge_text && (
                      <div className="absolute left-0 top-0 bottom-0 w-[27%] bg-[#e30613] rounded-r-xl flex items-center justify-center p-1.5 shadow-xl z-10">
                        <span className="text-white font-black text-2xl text-center leading-none tracking-tight">
                          {activePreviewSlide.badge_text}
                        </span>
                      </div>
                    )}

                    {/* Título de la imagen */}
                    {activePreviewSlide.title && (
                      <div className={`absolute top-1/2 -translate-y-1/2 z-10 px-2.5 py-1 rounded-lg ${
                        activePreviewSlide.badge_text ? 'left-[30%] right-4 bg-white/75 dark:bg-black/65' : 'left-4 right-4 bg-white/60 dark:bg-black/50'
                      }`}>
                        <h4 className="text-xs font-black text-gray-900 dark:text-white leading-tight">
                          {activePreviewSlide.title}
                        </h4>
                      </div>
                    )}
                  </div>

                  {/* Franja de aviso legal de ESTA imagen */}
                  {formConfig.show_disclaimer && (activePreviewSlide.disclaimer_text || formConfig.disclaimer_text) && (
                    <div className="bg-gray-200 dark:bg-gray-800 border-t border-gray-300 dark:border-gray-700 py-1.5 px-3 text-center">
                      <p className="text-[8px] font-bold text-gray-700 dark:text-gray-300 leading-tight uppercase line-clamp-3">
                        {activePreviewSlide.disclaimer_text || formConfig.disclaimer_text}
                      </p>
                    </div>
                  )}
                </div>

                {/* Dots del Preview */}
                {formConfig.slides.length > 1 && (
                  <div className="flex justify-center gap-1.5 pt-1">
                    {formConfig.slides.map((_, i) => (
                      <button 
                        key={i} 
                        onClick={() => setPreviewIndex(i)}
                        className={`transition-all rounded-full cursor-pointer ${
                          i === previewIndex ? 'w-4 h-1.5 bg-secondary' : 'w-1.5 h-1.5 bg-gray-300 dark:bg-gray-700'
                        }`} 
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-400 dark:text-gray-500 border border-dashed border-gray-200 dark:border-gray-800 rounded-xl text-xs">
                El carrusel se encuentra desactivado o no contiene imágenes.
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
