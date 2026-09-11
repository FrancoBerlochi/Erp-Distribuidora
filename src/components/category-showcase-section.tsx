/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useRef, useEffect } from 'react';
import { useCategoryShowcases } from '@/lib/categories-showcase-config';
import { optimizeImageUrl } from '@/lib/products-cache';
import { Play, ChevronLeft, ChevronRight } from 'lucide-react';

interface CategoryShowcaseSectionProps {
  products: any[];
  onOpenModal: (product: any) => void;
  onAddToCart: (product: any, e?: React.MouseEvent) => void;
  onSelectCategory?: (category: string) => void;
}

interface CategoryProductCarouselProps {
  products: any[];
  discountPct: number;
  formatMoney: (amount: number) => string;
  onOpenModal: (product: any) => void;
  onAddToCart: (product: any, e?: React.MouseEvent) => void;
}

function CategoryProductCarousel({
  products,
  discountPct,
  formatMoney,
  onOpenModal,
  onAddToCart,
}: CategoryProductCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [activeDot, setActiveDot] = useState(0);

  // Cantidad de puntos indicadores calculados según cantidad de productos
  const totalDots = Math.min(5, Math.max(2, Math.ceil(products.length / 2)));

  const updateScrollButtons = () => {
    if (!containerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = containerRef.current;
    setCanScrollLeft(scrollLeft > 15);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 15);

    const maxScroll = scrollWidth - clientWidth;
    if (maxScroll > 0) {
      const progress = scrollLeft / maxScroll;
      const dotIdx = Math.min(Math.round(progress * (totalDots - 1)), totalDots - 1);
      setActiveDot(dotIdx);
    }
  };

  useEffect(() => {
    updateScrollButtons();
    window.addEventListener('resize', updateScrollButtons);
    return () => window.removeEventListener('resize', updateScrollButtons);
  }, [products.length]);

  const handleScroll = (direction: 'left' | 'right') => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const scrollAmount = container.clientWidth * 0.8;
    container.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  const scrollToDot = (dotIdx: number) => {
    if (!containerRef.current) return;
    const { scrollWidth, clientWidth } = containerRef.current;
    const maxScroll = scrollWidth - clientWidth;
    if (maxScroll > 0 && totalDots > 1) {
      const targetScroll = (dotIdx / (totalDots - 1)) * maxScroll;
      containerRef.current.scrollTo({
        left: targetScroll,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div className="relative mt-6 group/carousel">
      {/* Flecha Izquierda (Solo Desktop, oculta en mobile) */}
      <button
        type="button"
        onClick={() => handleScroll('left')}
        disabled={!canScrollLeft}
        className={`hidden md:flex absolute -left-3 lg:-left-5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 items-center justify-center shadow-lg transition-all z-20 cursor-pointer ${
          canScrollLeft
            ? 'hover:bg-gray-100 dark:hover:bg-gray-700 active:scale-95 opacity-90 hover:opacity-100'
            : 'opacity-0 pointer-events-none'
        }`}
        aria-label="Anterior"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      {/* Flecha Derecha (Solo Desktop, oculta en mobile) */}
      <button
        type="button"
        onClick={() => handleScroll('right')}
        disabled={!canScrollRight}
        className={`hidden md:flex absolute -right-3 lg:-right-5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 items-center justify-center shadow-lg transition-all z-20 cursor-pointer ${
          canScrollRight
            ? 'hover:bg-gray-100 dark:hover:bg-gray-700 active:scale-95 opacity-90 hover:opacity-100'
            : 'opacity-0 pointer-events-none'
        }`}
        aria-label="Siguiente"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Carrusel: 2 en móvil, 3 en pantallas medianas (md), 4 en pantallas grandes (xl) */}
      <div
        ref={containerRef}
        onScroll={updateScrollButtons}
        className="flex gap-3 md:gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory py-2 px-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      >
        {products.map((product) => {
          const regularPrice = product.price;
          const effectiveDiscount = product.discount_percentage > 0 ? product.discount_percentage : discountPct;
          const hasDiscount = effectiveDiscount > 0;
          const discountedPrice = hasDiscount 
            ? regularPrice - (regularPrice * (effectiveDiscount / 100)) 
            : regularPrice;

          return (
            <div
              key={product.id}
              onClick={() => onOpenModal(product)}
              className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-3 sm:p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-all cursor-pointer group snap-start flex-none w-[calc(50%-6px)] min-w-[calc(50%-6px)] max-w-[calc(50%-6px)] md:w-[calc((100%-32px)/3)] md:min-w-[calc((100%-32px)/3)] md:max-w-[calc((100%-32px)/3)] xl:w-[calc((100%-48px)/4)] xl:min-w-[calc((100%-48px)/4)] xl:max-w-[calc((100%-48px)/4)]"
            >
              <div>
                {/* Badges superiores */}
                <div className="flex items-start justify-between gap-1 mb-2 min-h-[26px]">
                  <span className="text-[8px] sm:text-[9px] font-bold text-gray-400 uppercase leading-tight max-w-[100px]">
                    {hasDiscount ? 'NO ACUMULABLE CON OTRAS PROMOS' : ''}
                  </span>
                  {hasDiscount && (
                    <div className="flex flex-col items-end gap-1">
                      <span className="bg-yellow-400 text-gray-950 font-black text-[9px] px-1.5 py-0.5 rounded">
                        {effectiveDiscount}%DTO
                      </span>
                      <span className="bg-cyan-400 text-gray-950 font-black text-[8px] px-1.5 py-0.2 rounded uppercase">
                        EXCLUSIVO ONLINE
                      </span>
                    </div>
                  )}
                </div>

                {/* Imagen del Producto */}
                <div className="w-full aspect-square relative rounded-2xl overflow-hidden mb-3 bg-gray-50 dark:bg-gray-800/50 flex items-center justify-center p-2">
                  <img
                    src={optimizeImageUrl(product.image_url_1, 400)}
                    alt={product.name}
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                    decoding="async"
                  />
                </div>

                {/* Título del Producto */}
                <h4 className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white text-center line-clamp-2 min-h-[2rem] mb-2 leading-tight">
                  {product.name}
                </h4>

                {/* Precio: con descuento o regular */}
                <div className="text-center mb-4">
                  {hasDiscount ? (
                    <>
                      <div className="inline-block border border-red-500 text-red-600 dark:text-red-400 text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded uppercase mb-1">
                        PRECIO CON {effectiveDiscount}%DTO
                      </div>
                      <p className="text-lg sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                        {formatMoney(discountedPrice)}
                      </p>
                      <p className="text-[10px] sm:text-xs text-gray-400 line-through mt-0.5">
                        Precio Regular: {formatMoney(regularPrice)}
                      </p>
                      {product.wholesale_price && Number(product.wholesale_price) > 0 && (
                        <div className="inline-block mt-1 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          Mayorista x{product.wholesale_min_qty || 6}+: {formatMoney(Number(product.wholesale_price))}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="py-2">
                      <p className="text-lg sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                        {formatMoney(regularPrice)}
                      </p>
                      {product.wholesale_price && Number(product.wholesale_price) > 0 ? (
                        <div className="inline-block mt-1 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          Llevando {product.wholesale_min_qty || 6}+: {formatMoney(Number(product.wholesale_price))}
                        </div>
                      ) : (
                        <span className="text-[10px] text-gray-400 block mt-0.5">Precio por unidad</span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Botón Agregar */}
              <div className="space-y-1.5 mt-auto">
                <button
                  type="button"
                  onClick={(e) => {
                    onAddToCart({
                      ...product,
                      price: hasDiscount ? discountedPrice : regularPrice,
                      discount_percentage: hasDiscount ? effectiveDiscount : 0,
                    }, e);
                  }}
                  className="w-full bg-[#a31d1d] hover:bg-[#881818] active:scale-95 text-white font-bold py-2.5 px-4 rounded-full text-xs sm:text-sm transition-all shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
                >
                  Agregar
                </button>

                <p className="text-[9px] sm:text-[10px] text-center text-red-600 dark:text-red-400 font-semibold underline cursor-pointer">
                  Ver planes de cuotas
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Puntos inferiores interactivos estilo referencia */}
      {products.length > 2 && (
        <div className="flex justify-center items-center gap-2 mt-4">
          {Array.from({ length: totalDots }).map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => scrollToDot(idx)}
              className={`rounded-full transition-all cursor-pointer ${
                idx === activeDot
                  ? 'w-6 h-2 bg-[#e30613] shadow-xs'
                  : 'w-2 h-2 bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600'
              }`}
              aria-label={`Ir al grupo ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function CategoryShowcaseSection({
  products,
  onOpenModal,
  onAddToCart,
  onSelectCategory,
}: CategoryShowcaseSectionProps) {
  const { showcases } = useCategoryShowcases();
  const activeShowcases = showcases.filter((s) => s.is_active);

  if (!activeShowcases || activeShowcases.length === 0) {
    return null;
  }

  // Formato argentino de moneda ($1.234,50)
  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="space-y-16 mb-16">
      {activeShowcases.map((showcase, sIdx) => {
        // Descuento promocional numérico configurado en la vitrina (bloque rojo)
        const maxCategoryDiscount = Number(showcase.discount_percentage) || 0;

        // Filtrar productos que correspondan a la categoría, que tengan descuento activo,
        // y cuyo descuento no exceda el descuento fijado en el bloque rojo (si está configurado)
        const categoryProducts = products.filter((p) => {
          const matchesCategory = (p.category || '').trim().toLowerCase() === (showcase.category || '').trim().toLowerCase();
          if (!matchesCategory) return false;

          // Solo productos con descuento activo
          const prodDiscount = Number(p.discount_percentage) || 0;
          if (prodDiscount <= 0) return false;

          // Si la vitrina define un descuento máximo en el bloque rojo, fijar como tope
          if (maxCategoryDiscount > 0 && prodDiscount > maxCategoryDiscount) {
            return false;
          }

          return true;
        });

        // Si no hay productos con descuento en esta categoría, no mostrar la vitrina
        if (categoryProducts.length === 0) return null;

        const rawBadge = (showcase.badge_discount || '').trim();
        const hasBadgeDiscount = rawBadge !== '' && rawBadge !== '0' && rawBadge !== '0%';
        const hasBadgeTag = Boolean(showcase.badge_tag && showcase.badge_tag.trim() !== '');
        const hasRedBlock = hasBadgeDiscount || hasBadgeTag;

        return (
          <section key={showcase.id || sIdx} className="scroll-mt-24">
            {/* Banner Superior Estilo Referencia */}
            <div className="relative rounded-3xl overflow-hidden border-2 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
              <div className="relative w-full h-36 sm:h-52 md:h-56 overflow-hidden flex items-center bg-gray-50 dark:bg-gray-800/40">
                {/* Imagen decorativa de fondo/derecha */}
                <div className="absolute right-0 top-0 bottom-0 w-1/2 sm:w-2/5 overflow-hidden flex items-center justify-end">
                  <img
                    src={optimizeImageUrl(showcase.banner_image_url, 800)}
                    alt={showcase.title}
                    className="w-full h-full object-cover object-center opacity-90 dark:opacity-80"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-white via-white/40 to-transparent dark:from-gray-900 dark:via-gray-900/40 dark:to-transparent"></div>
                </div>

                {/* Bloque Rojo a la izquierda (Ocupa ~27% de borde a borde solo si hay descuento o etiqueta) */}
                {hasRedBlock && (
                  <div className="absolute left-0 top-0 bottom-0 w-[30%] sm:w-[27%] bg-[#e30613] rounded-r-2xl sm:rounded-r-3xl flex flex-col items-center justify-center p-2 sm:p-4 text-white z-10 select-none shadow-md">
                    {hasBadgeDiscount && (
                      <>
                        <span className="text-3xl sm:text-5xl md:text-6xl font-black leading-none tracking-tighter text-center">
                          {rawBadge}
                        </span>
                        <span className="text-[9px] sm:text-xs font-extrabold uppercase tracking-widest text-center mt-0.5">
                          descuento
                        </span>
                      </>
                    )}

                    {hasBadgeTag && (
                      <div className="mt-1 sm:mt-2 inline-flex items-center gap-1 bg-white/20 border border-white/30 px-2 py-0.5 rounded-full">
                        <Play className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-white text-white" />
                        <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-tight">
                          {showcase.badge_tag}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Título Central y Botón INGRESAR */}
                <div className={`relative z-10 flex-1 pr-4 sm:pr-8 flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                  hasRedBlock ? 'pl-[33%] sm:pl-[30%]' : 'pl-6 sm:pl-10'
                }`}>
                  <div className="max-w-md">
                    <span className="text-[10px] sm:text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">
                      en seleccionados de
                    </span>
                    <h3 className="text-base sm:text-2xl md:text-3xl font-black text-gray-900 dark:text-white capitalize leading-tight">
                      {showcase.title || showcase.category}
                    </h3>
                  </div>

                  {onSelectCategory && (
                    <button
                      onClick={() => onSelectCategory(showcase.category)}
                      className="self-start sm:self-center bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-black text-[10px] sm:text-xs tracking-wider uppercase px-4 sm:px-6 py-1.5 sm:py-2 rounded-full border-2 border-gray-400 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all shadow-sm active:scale-95 cursor-pointer flex-shrink-0"
                    >
                      INGRESAR
                    </button>
                  )}
                </div>
              </div>

              {/* Franja de Aviso Legal Inferior */}
              {showcase.disclaimer_text && (
                <div className="bg-gray-200 dark:bg-gray-800 border-t border-gray-300 dark:border-gray-700 py-1.5 px-4 text-center">
                  <p className="text-[8px] sm:text-[10px] font-bold text-gray-700 dark:text-gray-300 tracking-tight uppercase leading-snug">
                    {showcase.disclaimer_text}
                  </p>
                </div>
              )}
            </div>

            {/* Carrusel de Productos de la Categoría */}
            <CategoryProductCarousel
              products={categoryProducts}
              discountPct={maxCategoryDiscount}
              formatMoney={formatMoney}
              onOpenModal={onOpenModal}
              onAddToCart={onAddToCart}
            />
          </section>
        );
      })}
    </div>
  );
}
