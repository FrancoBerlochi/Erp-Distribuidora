/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/lib/store';
import { useProducts, optimizeImageUrl } from '@/lib/products-cache';
import { toast } from 'react-toastify';
import { X, Flame, ShoppingCart, Plus, Minus, ArrowRight, Package } from 'lucide-react';
import BannerCarousel from '@/components/banner-carousel';
import CategoryShowcaseSection from '@/components/category-showcase-section';
import BestSellersSection from '@/components/best-sellers-section';

export default function Home() {
  const router = useRouter();
  const { products, loading } = useProducts();
  const [selectedProduct, setSelectedProduct] = useState<any>(null); // State for modal
  const [modalQuantity, setModalQuantity] = useState<number>(1);
  const addItem = useCartStore(state => state.addItem);

  const handleAddToCart = (product: any, e?: React.MouseEvent, qty: number = 1) => {
    if (e) e.stopPropagation();
    
    const price = product.price;
    const finalPrice = product.discount_percentage > 0 
      ? price - (price * (product.discount_percentage / 100))
      : price;

    addItem({
      id: product.id,
      name: product.name,
      price: finalPrice,
      discount_percentage: product.discount_percentage,
      image_url: product.image_url_1,
      quantity: qty,
      stock: product.stock,
      wholesale_price: product.wholesale_price,
      wholesale_min_qty: product.wholesale_min_qty,
      promo_type: product.promo_type,
      promo_second_unit_discount: product.promo_second_unit_discount,
      promo_min_qty: product.promo_min_qty,
      promo_discount_percentage: product.promo_discount_percentage,
    });
    
    toast.success(qty > 1 
      ? `🛒 ${qty}x ${product.name} agregados al carrito!` 
      : `🛒 ${product.name} agregado al carrito!`);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <section className="mb-12 relative rounded-3xl overflow-hidden shadow-lg border border-gray-100 dark:border-gray-800">
        <img src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=75" alt="Supermercado" fetchPriority="high" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-black/85 via-black/55 to-black/25 z-10"></div>
        <div className="relative z-20 py-20 px-8 md:px-16 text-white text-center md:text-left flex flex-col md:flex-row items-center justify-between">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-4 leading-tight text-white drop-shadow-md">
              Tu abastecimiento, <span className="text-yellow-400">simplificado.</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-100 mb-8 max-w-xl drop-shadow-sm font-medium">
              Somos Distribuidora Express. Llevamos más de 10 años abasteciendo negocios, oficinas y hogares con los mejores productos de limpieza y almacén al por mayor.
            </p>
            <div className="flex flex-wrap gap-4 justify-center md:justify-start">
              <Link 
                href="/productos"
                className="bg-yellow-400 text-gray-950 font-bold px-8 py-3 rounded-full hover:bg-yellow-300 transition-colors shadow-lg cursor-pointer flex items-center justify-center"
              >
                Ver Productos
              </Link>
              <Link
                href="/ofertas"
                className="bg-secondary text-white font-bold px-8 py-3 rounded-full hover:bg-secondary/90 transition-all shadow-lg flex items-center gap-2 transform hover:scale-105"
              >
                <Flame className="w-5 h-5 fill-white animate-pulse" />
                Ver Ofertas
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Carrusel de Banners Promocionales (Configurable desde Admin > Banners) */}
      <BannerCarousel />

      {/* Sección de Más Vendidos (Configurable desde Admin > Más Vendidos) */}
      <BestSellersSection 
        products={products}
        onOpenModal={(product) => {
          setSelectedProduct(product);
          setModalQuantity(1);
        }}
        onAddToCart={handleAddToCart}
      />

      {/* Vitrinas de Categorías con Banner y Productos (Configurables desde Admin > Categorías) */}
      <CategoryShowcaseSection 
        products={products}
        onOpenModal={(product) => {
          setSelectedProduct(product);
          setModalQuantity(1);
        }}
        onAddToCart={handleAddToCart}
        onSelectCategory={(category) => {
          router.push(`/productos?categoria=${encodeURIComponent(category)}`);
        }}
      />

      {/* Banner / Llamada a la acción hacia Todos los Productos con imagen de góndola oscurecida en negro */}
      <section className="mb-14 relative rounded-3xl overflow-hidden shadow-2xl bg-black text-white p-8 md:p-14 text-center flex flex-col items-center justify-center">
        {/* Imagen de fondo con filtro brightness oscurecido en negro */}
        <img
          src="/catalogo-banner-bg.jpg"
          alt="Góndolas de productos"
          className="absolute inset-0 w-full h-full object-cover brightness-[0.45] contrast-105"
        />
        {/* Capa de oscurecimiento en negro puro */}
        <div className="absolute inset-0 bg-black/60 backdrop-brightness-90" />

        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md px-4 py-1.5 rounded-full text-xs sm:text-sm font-bold border border-white/20 shadow-sm">
            <Package className="w-4 h-4" /> Productos Mayoristas y Minoristas
          </div>
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-white drop-shadow-md">
            ¡Mira nuestro catálogo de productos!
          </h2>
          <p className="text-sm sm:text-base text-gray-200 max-w-lg mx-auto leading-relaxed drop-shadow-sm font-medium">
            Explora nuestros productos con cientos de artículos en bebidas, limpieza, comestibles y snacks con precios especiales al por mayor y menor.
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/productos"
              className="bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-black px-8 py-3.5 rounded-full transition-all shadow-xl hover:shadow-2xl flex items-center gap-2 transform hover:scale-105 text-sm sm:text-base cursor-pointer"
            >
              <span>Ver Todos los Productos</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/ofertas"
              className="bg-white/15 hover:bg-white/25 text-white border border-white/30 backdrop-blur-md font-bold px-6 py-3.5 rounded-full transition-all flex items-center gap-2 text-sm sm:text-base shadow-lg cursor-pointer"
            >
              <Flame className="w-5 h-5 fill-white text-white" />
              <span>Ver Ofertas Especiales</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Product Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setSelectedProduct(null)}>
          <div 
            className="bg-white dark:bg-gray-900 rounded-3xl overflow-hidden shadow-2xl max-w-4xl w-full flex flex-col md:flex-row relative border border-gray-200 dark:border-gray-800"
            onClick={e => e.stopPropagation()}
          >
            <button 
              onClick={() => setSelectedProduct(null)}
              className="absolute top-4 right-4 bg-gray-100 dark:bg-gray-800 p-2 rounded-full text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 z-10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="w-full md:w-1/2 bg-gray-50 dark:bg-gray-800/60 p-8 flex items-center justify-center relative min-h-[300px]">
              {selectedProduct.image_url_1 ? (
                <img 
                  src={optimizeImageUrl(selectedProduct.image_url_1, 700)} 
                  alt={selectedProduct.name} 
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-contain max-h-[400px]" 
                />
              ) : (
                <span className="text-gray-500 dark:text-gray-400 font-medium">Sin imagen</span>
              )}
              {selectedProduct.discount_percentage > 0 && (
                <div className="absolute top-6 left-6 bg-secondary text-white text-sm font-black px-4 py-2 rounded-full shadow-lg">
                  -{selectedProduct.discount_percentage}% OFF
                </div>
              )}
            </div>
            
            <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col">
              {selectedProduct.category && selectedProduct.category !== 'Sin Categoría' && (
                <span className="text-sm text-primary dark:text-blue-400 font-extrabold mb-2 uppercase tracking-wider">{selectedProduct.category}</span>
              )}
              <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-4">{selectedProduct.name}</h2>
              <p className="text-gray-800 dark:text-gray-200 mb-8 flex-1 text-lg leading-relaxed">
                {selectedProduct.description || 'Sin descripción detallada disponible.'}
              </p>
              
              <div className="mt-auto border-t border-gray-200 dark:border-gray-800 pt-6">
                <div className="flex items-end justify-between mb-4">
                  <div>
                    <p className="text-xs text-gray-700 dark:text-gray-300 font-semibold mb-1">Precio Final</p>
                    <div className="flex items-baseline gap-2.5">
                      <span className="text-2xl sm:text-3xl font-black text-primary dark:text-blue-400">
                        ${(selectedProduct.discount_percentage > 0 
                          ? selectedProduct.price - (selectedProduct.price * (selectedProduct.discount_percentage / 100))
                          : selectedProduct.price).toFixed(2)}
                      </span>
                      {selectedProduct.discount_percentage > 0 && (
                        <span className="text-sm sm:text-base text-gray-500 dark:text-gray-400 line-through font-semibold">${selectedProduct.price.toFixed(2)}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-700 dark:text-gray-300 font-semibold mb-1">Disponibilidad</p>
                    <p className="font-bold text-emerald-700 dark:text-emerald-400">{selectedProduct.stock} en stock</p>
                  </div>
                </div>

                {selectedProduct.wholesale_price && Number(selectedProduct.wholesale_price) > 0 && (
                  <div className="mb-4 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 flex items-center justify-between text-xs font-semibold">
                    <span>⚡ Precio Mayorista (llevando {selectedProduct.wholesale_min_qty || 6}+ u.):</span>
                    <span className="font-extrabold text-sm">${Number(selectedProduct.wholesale_price).toFixed(2)} c/u</span>
                  </div>
                )}

                {/* Selector de Cantidad */}
                <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/60 p-3 rounded-2xl mb-4 border border-gray-200 dark:border-gray-700">
                  <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Cantidad:</span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setModalQuantity(Math.max(1, modalQuantity - 1))}
                      disabled={modalQuantity <= 1}
                      className="w-9 h-9 rounded-xl bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-40 transition-all cursor-pointer font-bold"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="font-black text-base w-8 text-center text-gray-900 dark:text-white">
                      {modalQuantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setModalQuantity(Math.min(selectedProduct.stock, modalQuantity + 1))}
                      disabled={modalQuantity >= selectedProduct.stock}
                      className="w-9 h-9 rounded-xl bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-40 transition-all cursor-pointer font-bold"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <button 
                  onClick={() => {
                    handleAddToCart(selectedProduct, undefined, modalQuantity);
                    setSelectedProduct(null);
                  }}
                  className="w-full bg-primary text-white py-3.5 rounded-xl font-bold text-base sm:text-lg hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ShoppingCart className="w-5 h-5" />
                  <span>Agregar {modalQuantity > 1 ? `(${modalQuantity})` : ''} al Carrito</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
