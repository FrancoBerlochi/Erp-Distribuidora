'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Upload, X, Barcode, Camera, Sparkles, AlertTriangle, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import CategorySelect from '@/components/category-select';
import { invalidateProductsCache } from '@/lib/products-cache';
import POSCameraScanner from '@/components/pos-camera-scanner';
import { simulatePromoImpact, PromoType } from '@/lib/promotions-engine';

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  
  // URLs existentes que vienen de la DB
  const [existingImages, setExistingImages] = useState<{url: string, index: number}[]>([]);
  // URLs para preview de nuevas imágenes subidas en este formulario
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    cost_price: '',
    stock: '',
    min_stock: '5',
    supplier_name: '',
    discount_percentage: '0',
    category: '',
    barcode: '',
    wholesale_price: '',
    wholesale_min_qty: '6',
    promo_type: 'none' as PromoType,
    promo_second_unit_discount: '70',
    promo_min_qty: '3',
    promo_discount_percentage: '15',
  });

  useEffect(() => {
    if (params.id) {
      fetchProduct();
    }
  }, [params.id]);

  async function fetchProduct() {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', params.id)
        .single();
        
      if (error) throw error;
      
      setFormData({
        name: data.name,
        description: data.description || '',
        price: data.price.toString(),
        cost_price: data.cost_price != null ? data.cost_price.toString() : '',
        stock: data.stock.toString(),
        min_stock: data.min_stock != null ? data.min_stock.toString() : '5',
        supplier_name: data.supplier_name || '',
        discount_percentage: data.discount_percentage?.toString() || '0',
        category: data.category || 'Sin Categoría',
        barcode: data.barcode || '',
        wholesale_price: data.wholesale_price != null ? data.wholesale_price.toString() : '',
        wholesale_min_qty: data.wholesale_min_qty != null ? data.wholesale_min_qty.toString() : '6',
        promo_type: (data.promo_type || 'none') as PromoType,
        promo_second_unit_discount: data.promo_second_unit_discount != null ? data.promo_second_unit_discount.toString() : '70',
        promo_min_qty: data.promo_min_qty != null ? data.promo_min_qty.toString() : '3',
        promo_discount_percentage: data.promo_discount_percentage != null ? data.promo_discount_percentage.toString() : '15',
      });
      
      const imgs = [];
      if (data.image_url_1) imgs.push({ url: data.image_url_1, index: 1 });
      if (data.image_url_2) imgs.push({ url: data.image_url_2, index: 2 });
      setExistingImages(imgs);
      
    } catch (error) {
      console.error(error);
      alert('Error cargando producto');
      router.push('/dashboard/products');
    } finally {
      setLoading(false);
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      const totalImages = existingImages.length + images.length + selectedFiles.length;
      
      if (totalImages > 2) {
        alert('Solo puedes tener un máximo de 2 imágenes por producto.');
        return;
      }
      
      const newImages = [...images, ...selectedFiles];
      setImages(newImages);
      
      const newPreviews = selectedFiles.map(file => URL.createObjectURL(file));
      setImagePreviewUrls([...imagePreviewUrls, ...newPreviews]);
    }
  };

  const removeExistingImage = (indexToRemove: number) => {
    setExistingImages(existingImages.filter(img => img.index !== indexToRemove));
  };

  const removeNewImage = (index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    setImages(newImages);
    
    const newPreviews = [...imagePreviewUrls];
    URL.revokeObjectURL(newPreviews[index]);
    newPreviews.splice(index, 1);
    setImagePreviewUrls(newPreviews);
  };

  const uploadToCloudinary = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || '');
    
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) throw new Error('Error subiendo imagen a Cloudinary');
    const data = await response.json();
    return data.secure_url;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Determinar qué imágenes quedan y consolidar en slots 1 y 2
      const availableUrls = existingImages.map(img => img.url);

      // Subir nuevas imágenes y agregarlas
      for (const file of images) {
        const uploadedUrl = await uploadToCloudinary(file);
        availableUrls.push(uploadedUrl);
      }

      const final_img_1 = availableUrls[0] || null;
      const final_img_2 = availableUrls[1] || null;

      // Actualizar en Supabase
      const updatePayload: any = {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock),
        min_stock: isNaN(parseInt(formData.min_stock)) ? 5 : parseInt(formData.min_stock),
        supplier_name: formData.supplier_name?.trim() || null,
        discount_percentage: parseInt(formData.discount_percentage),
        category: formData.category || 'Sin Categoría',
        barcode: formData.barcode?.trim() || null,
        image_url_1: final_img_1,
        image_url_2: final_img_2,
        cost_price: formData.cost_price && formData.cost_price.trim() !== ''
          ? parseFloat(formData.cost_price)
          : null,
        wholesale_price: formData.wholesale_price && formData.wholesale_price.trim() !== '' 
          ? parseFloat(formData.wholesale_price) 
          : null,
        wholesale_min_qty: parseInt(formData.wholesale_min_qty) || 6,
        promo_type: formData.promo_type || 'none',
        promo_second_unit_discount: formData.promo_type === 'second_unit_discount' 
          ? (parseFloat(formData.promo_second_unit_discount) || 70) 
          : null,
        promo_min_qty: formData.promo_type === 'volume_discount' 
          ? (parseInt(formData.promo_min_qty) || 3) 
          : null,
        promo_discount_percentage: formData.promo_type === 'volume_discount' 
          ? (parseFloat(formData.promo_discount_percentage) || 15) 
          : null,
      };

      let { error } = await supabase
        .from('products')
        .update(updatePayload)
        .eq('id', params.id);

      if (error && error.code === '42703') {
        delete updatePayload.min_stock;
        delete updatePayload.supplier_name;
        delete updatePayload.promo_type;
        delete updatePayload.promo_second_unit_discount;
        delete updatePayload.promo_min_qty;
        delete updatePayload.promo_discount_percentage;
        delete updatePayload.cost_price;
        delete updatePayload.wholesale_price;
        delete updatePayload.wholesale_min_qty;
        const retry = await supabase
          .from('products')
          .update(updatePayload)
          .eq('id', params.id);
        error = retry.error;
      }

      if (error) throw error;
      
      await invalidateProductsCache();
      router.push('/dashboard/products');
    } catch (error: any) {
      console.error(error);
      alert(error.message || 'Error al actualizar el producto');
    } finally {
      setSaving(false);
    }
  };

  const unitPriceNum = parseFloat(formData.price) || 0;
  const costPriceNum = parseFloat(formData.cost_price) || 0;
  const promoSimulation = simulatePromoImpact(unitPriceNum, costPriceNum, {
    promo_type: formData.promo_type,
    promo_second_unit_discount: parseFloat(formData.promo_second_unit_discount) || 70,
    promo_min_qty: parseInt(formData.promo_min_qty) || 3,
    promo_discount_percentage: parseFloat(formData.promo_discount_percentage) || 15,
  });

  if (loading) return <div className="p-8 text-center">Cargando producto...</div>;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/dashboard/products" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">Editar Producto</h1>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-2">
              <label className="block text-sm font-bold text-gray-900 dark:text-gray-100 mb-1.5">Nombre del Producto *</label>
              <input 
                required 
                type="text" 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none font-medium placeholder:text-gray-500" 
              />
            </div>
            
            <div className="col-span-2">
              <label className="block text-sm font-bold text-gray-900 dark:text-gray-100 mb-1.5">Descripción</label>
              <textarea 
                rows={3}
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none font-medium placeholder:text-gray-500" 
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-900 dark:text-gray-100 mb-1.5">Precio de Venta ($) *</label>
              <input 
                required 
                type="number" 
                step="0.01" 
                min="0"
                value={formData.price}
                onChange={e => setFormData({...formData, price: e.target.value})}
                className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none font-medium placeholder:text-gray-500" 
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-900 dark:text-gray-100 mb-1.5">
                Precio de Costo ($)
                <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-1">(Para control de CMV y margen)</span>
              </label>
              <input 
                type="number" 
                step="0.01" 
                min="0"
                placeholder="Ej: 450.00"
                value={formData.cost_price}
                onChange={e => setFormData({...formData, cost_price: e.target.value})}
                className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none font-medium placeholder:text-gray-500" 
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-900 dark:text-gray-100 mb-1.5">Stock *</label>
              <input 
                required 
                type="number" 
                min="0"
                value={formData.stock}
                onChange={e => setFormData({...formData, stock: e.target.value})}
                className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none font-medium placeholder:text-gray-500" 
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-900 dark:text-gray-100 mb-1.5">
                Stock Mínimo
                <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-1">(Alerta reposición)</span>
              </label>
              <input 
                type="number" 
                min="0"
                value={formData.min_stock}
                onChange={e => setFormData({...formData, min_stock: e.target.value})}
                className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none font-medium placeholder:text-gray-500" 
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-900 dark:text-gray-100 mb-1.5">
                Proveedor Habitual
                <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-1">(Opcional)</span>
              </label>
              <input 
                type="text" 
                placeholder="Ej: Arcor, Molinos, Quilmes..."
                value={formData.supplier_name}
                onChange={e => setFormData({...formData, supplier_name: e.target.value})}
                className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none font-medium placeholder:text-gray-500" 
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-gray-900 dark:text-gray-100 mb-1.5">Descuento Directo Individual (%)</label>
              <input 
                type="number" 
                min="0" 
                max="100"
                value={formData.discount_percentage}
                onChange={e => setFormData({...formData, discount_percentage: e.target.value})}
                className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none font-medium placeholder:text-gray-500" 
              />
            </div>
            
            <div className="col-span-2">
              <CategorySelect 
                value={formData.category} 
                onChange={(cat) => setFormData({ ...formData, category: cat })} 
              />
            </div>

            {/* Sección Promociones Especiales y Descuentos por Cantidad */}
            <div className="col-span-2 p-5 bg-gradient-to-br from-amber-50/70 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/10 border border-amber-200 dark:border-amber-800/60 rounded-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  <span className="text-base font-bold text-amber-950 dark:text-amber-200">
                    Promociones y Descuentos por Cantidad
                  </span>
                </div>
                {formData.promo_type !== 'none' && (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-200 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                    Oferta Activa
                  </span>
                )}
              </div>
              <p className="text-xs text-amber-800/80 dark:text-amber-300/80">
                Configura ofertas automáticas como 2x1, 3x2, descuentos en la segunda unidad o descuentos por volumen. El sistema cuenta con un simulador preventivo para evitar ofertas por debajo de tu costo.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={formData.promo_type === 'none' ? 'col-span-2' : ''}>
                  <label className="block text-xs font-bold text-gray-800 dark:text-gray-200 mb-1">
                    Tipo de Promoción
                  </label>
                  <select
                    value={formData.promo_type}
                    onChange={(e) => setFormData({ ...formData, promo_type: e.target.value as PromoType })}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-amber-300 dark:border-amber-700 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none font-medium text-sm"
                  >
                    <option value="none">Sin Promoción Activa</option>
                    <option value="2x1">Promo 2x1 (Llevá 2, Pagá 1 - 2da gratis)</option>
                    <option value="3x2">Promo 3x2 (Llevá 3, Pagá 2 - 3ra gratis)</option>
                    <option value="4x3">Promo 4x3 (Llevá 4, Pagá 3 - 4ta gratis)</option>
                    <option value="second_unit_discount">% de Descuento en la 2da Unidad (Ej: 50%, 70%, 80%)</option>
                    <option value="volume_discount">Descuento por Volumen (A partir de N unidades)</option>
                  </select>
                </div>

                {formData.promo_type === 'second_unit_discount' && (
                  <div>
                    <label className="block text-xs font-bold text-gray-800 dark:text-gray-200 mb-1">
                      % Descuento en 2da Unidad
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        max="100"
                        placeholder="Ej: 70"
                        value={formData.promo_second_unit_discount}
                        onChange={(e) => setFormData({ ...formData, promo_second_unit_discount: e.target.value })}
                        className="w-full px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-amber-300 dark:border-amber-700 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none font-medium text-sm pr-8"
                      />
                      <span className="absolute right-3 top-2.5 text-xs font-bold text-gray-500">%</span>
                    </div>
                  </div>
                )}

                {formData.promo_type === 'volume_discount' && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-gray-800 dark:text-gray-200 mb-1">
                        Cantidad Mínima Requerida (u.)
                      </label>
                      <input
                        type="number"
                        min="2"
                        placeholder="Ej: 3"
                        value={formData.promo_min_qty}
                        onChange={(e) => setFormData({ ...formData, promo_min_qty: e.target.value })}
                        className="w-full px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-amber-300 dark:border-amber-700 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none font-medium text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-800 dark:text-gray-200 mb-1">
                        % Descuento Total en la Compra
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="1"
                          max="100"
                          placeholder="Ej: 15"
                          value={formData.promo_discount_percentage}
                          onChange={(e) => setFormData({ ...formData, promo_discount_percentage: e.target.value })}
                          className="w-full px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-amber-300 dark:border-amber-700 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none font-medium text-sm pr-8"
                        />
                        <span className="absolute right-3 top-2.5 text-xs font-bold text-gray-500">%</span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* SIMULADOR PREVENTIVO DE OFERTA */}
              {promoSimulation && (
                <div className="mt-4 pt-4 border-t border-amber-200/80 dark:border-amber-800/60">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                      🛡️ Simulador Preventivo de Oferta
                    </span>
                    {unitPriceNum > 0 && costPriceNum > 0 && (
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        Costo base: <strong className="font-mono text-gray-900 dark:text-white">${costPriceNum.toFixed(2)}</strong>
                      </span>
                    )}
                  </div>

                  {/* Alerta de Pérdida / Margen Seguro */}
                  {promoSimulation.hasLossRisk ? (
                    <div className="mb-3 p-3 bg-red-100 dark:bg-red-950/60 border border-red-300 dark:border-red-800 rounded-lg flex items-start gap-2.5 text-red-800 dark:text-red-200">
                      <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <p className="font-bold">¡CUIDADO! La oferta genera venta a pérdida en algunas cantidades.</p>
                        <p className="mt-0.5 opacity-90">
                          El precio unitario efectivo que cobrarías al cliente queda por debajo de tu costo de reposición (${costPriceNum.toFixed(2)}). Revisa el porcentaje de descuento o el precio de venta.
                        </p>
                      </div>
                    </div>
                  ) : costPriceNum > 0 ? (
                    <div className="mb-3 p-2.5 bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 rounded-lg flex items-center gap-2 text-emerald-800 dark:text-emerald-200 text-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>
                        <strong>Margen Protegido:</strong> Todas las cantidades cubren el costo de reposición (${costPriceNum.toFixed(2)}).
                      </span>
                    </div>
                  ) : null}

                  {/* Tabla de Simulación */}
                  <div className="overflow-x-auto rounded-lg border border-amber-200 dark:border-amber-800/60 bg-white/90 dark:bg-gray-900/90">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-amber-100/70 dark:bg-amber-950/40 text-amber-950 dark:text-amber-300 border-b border-amber-200 dark:border-amber-800 font-bold">
                        <tr>
                          <th className="p-2.5">Cantidad</th>
                          <th className="p-2.5">Total Regular</th>
                          <th className="p-2.5">A Pagar Promo</th>
                          <th className="p-2.5">Ahorro Cliente</th>
                          <th className="p-2.5">Precio c/u Efectivo</th>
                          {costPriceNum > 0 && <th className="p-2.5">Margen vs Costo</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {promoSimulation.rows.map((row) => (
                          <tr 
                            key={row.quantity}
                            className={
                              row.isBelowCost 
                                ? 'bg-red-50 dark:bg-red-950/30 text-red-900 dark:text-red-300 font-medium' 
                                : row.isPromoActive 
                                  ? 'bg-amber-50/50 dark:bg-amber-950/20' 
                                  : ''
                            }
                          >
                            <td className="p-2.5 font-bold">
                              {row.quantity} {row.quantity === 1 ? 'unidad' : 'unidades'}
                              {row.isPromoActive && (
                                <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-amber-200 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200 font-bold">
                                  PROMO
                                </span>
                              )}
                            </td>
                            <td className="p-2.5 text-gray-500 dark:text-gray-400 font-mono">
                              ${row.regularTotal.toFixed(2)}
                            </td>
                            <td className="p-2.5 font-bold font-mono text-gray-900 dark:text-white">
                              ${row.totalToPay.toFixed(2)}
                            </td>
                            <td className="p-2.5 font-semibold text-emerald-600 dark:text-emerald-400">
                              {row.discountAmount > 0 
                                ? `-$${row.discountAmount.toFixed(2)} (${row.savingsPercent}%)` 
                                : '—'}
                            </td>
                            <td className="p-2.5 font-mono font-bold">
                              ${row.effectiveUnitPrice.toFixed(2)}
                            </td>
                            {costPriceNum > 0 && (
                              <td className="p-2.5">
                                {row.isBelowCost ? (
                                  <span className="font-bold text-red-600 dark:text-red-400 flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" />
                                    Pérdida ({row.unitMargin}%)
                                  </span>
                                ) : row.unitMargin !== null ? (
                                  <span className="font-medium text-emerald-600 dark:text-emerald-400">
                                    +{row.unitMargin}%
                                  </span>
                                ) : '—'}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Sección Precios Diferenciados / Mayorista */}
            <div className="col-span-2 p-4 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 rounded-xl space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
                  ⚡ Lista de Precios Mayorista / Bulto Cerrado (Opcional)
                </span>
              </div>
              <p className="text-xs text-emerald-700 dark:text-emerald-400">
                Se aplicará automáticamente en mostrador POS o en tienda online al alcanzar la cantidad mínima, o al seleccionar &quot;Mayorista&quot; en POS.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-800 dark:text-gray-200 mb-1">
                    Precio Mayorista ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Ej: 850.00"
                    value={formData.wholesale_price}
                    onChange={e => setFormData({ ...formData, wholesale_price: e.target.value })}
                    className="w-full px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none font-medium text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-800 dark:text-gray-200 mb-1">
                    Cantidad Mínima para Mayorista (u.)
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="6"
                    value={formData.wholesale_min_qty}
                    onChange={e => setFormData({ ...formData, wholesale_min_qty: e.target.value })}
                    className="w-full px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none font-medium text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-bold text-gray-900 dark:text-gray-100 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Barcode className="w-4 h-4 text-gray-500" />
                  Código de Barras (EAN-13, UPC o Código Propio)
                </span>
                <button
                  type="button"
                  onClick={() => setShowCameraScanner(true)}
                  className="text-xs text-primary hover:underline flex items-center gap-1 font-semibold px-2 py-0.5 rounded bg-primary/10"
                >
                  <Camera className="w-3.5 h-3.5" />
                  Escanear con Cámara
                </button>
              </label>
              <input 
                type="text" 
                placeholder="Ej: 7791234567890 (opcional, o escanéalo con la pistola)"
                value={formData.barcode}
                onChange={e => setFormData({...formData, barcode: e.target.value})}
                className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none font-mono placeholder:text-gray-400" 
              />
            </div>
            
            <div className="col-span-2 border-t border-gray-200 dark:border-gray-800 pt-6 mt-2">
              <label className="block text-sm font-bold text-gray-900 dark:text-gray-100 mb-3">Imágenes (Máx 2)</label>
              
              <div className="flex gap-4 mb-4">
                {/* Mostrar imágenes existentes */}
                {existingImages.map((img) => (
                  <div key={`exist-${img.index}`} className="relative w-24 h-24 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-800">
                    <img src={img.url} alt="Existente" className="w-full h-full object-contain" />
                    <button 
                      type="button" 
                      onClick={() => removeExistingImage(img.index)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 shadow-sm"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                {/* Mostrar imágenes nuevas subidas */}
                {imagePreviewUrls.map((url, i) => (
                  <div key={`new-${i}`} className="relative w-24 h-24 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-800">
                    <img src={url} alt="Preview" className="w-full h-full object-contain" />
                    <button 
                      type="button" 
                      onClick={() => removeNewImage(i)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 shadow-sm"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                
                {/* Botón para subir más si hay espacio */}
                {(existingImages.length + images.length) < 2 && (
                  <label className="w-24 h-24 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg flex flex-col items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer hover:text-primary hover:border-primary transition-colors">
                    <Upload className="w-6 h-6 mb-1" />
                    <span className="text-xs font-bold">Subir</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      multiple 
                      className="hidden" 
                      onChange={handleImageChange}
                    />
                  </label>
                )}
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Puedes tener hasta 2 imágenes por producto. Formato recomendado: cuadrado.</p>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-800">
            <button 
              type="submit" 
              disabled={saving}
              className="bg-primary text-white px-8 py-3 rounded-xl font-bold hover:bg-primary/90 disabled:opacity-50 shadow-md hover:shadow-lg transition-all"
            >
              {saving ? 'Guardando...' : 'Actualizar Producto'}
            </button>
          </div>
        </form>
      </div>

      <POSCameraScanner
        isOpen={showCameraScanner}
        onClose={() => setShowCameraScanner(false)}
        onScan={(code) => setFormData((prev) => ({ ...prev, barcode: code }))}
      />
    </div>
  );
}
