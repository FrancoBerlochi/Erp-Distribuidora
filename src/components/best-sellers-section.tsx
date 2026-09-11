/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useBestSellersConfig } from '@/lib/best-sellers-config';
import { optimizeImageUrl } from '@/lib/products-cache';
import { 
  TrendingUp, 
  Flame, 
  ChevronLeft, 
  ChevronRight, 
  ShoppingCart, 
  Sparkles,
  Award
} from 'lucide-react';

interface BestSellersSectionProps {
  products: any[];
  onOpenModal: (product: any) => void;
  onAddToCart: (product: any, e?: React.MouseEvent) => void;
}

export default function BestSellersSection({
  products,
  onOpenModal,
  onAddToCart,
}: BestSellersSectionProps) {
  const { config } = useBestSellersConfig();
  const containerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [activeDot, setActiveDot] = useState(0);

  // Mapear los IDs seleccionados en la configuración al catálogo de productos manteniendo el orden exacto
  const bestSellerProducts = useMemo(() => {
    if (!config?.product_ids || !Array.isArray(config.product_ids) || config.product_ids.length === 0) {
      return [];
    }
    const productMap = new Map(products.map((p) => [p.id, p]));
    return config.product_ids
      .map((id) => productMap.get(id))
      .filter(Boolean) as any[];
  }, [products, config?.product_ids]);

  const totalDots = Math.min(5, Math.max(2, Math.ceil(bestSellerProducts.length / 2)));

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
  }, [bestSellerProducts.length]);

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

  // Si la sección está oculta por admin o no hay productos seleccionados, no se muestra nada
  if (!config.is_active || bestSellerProducts.length === 0) {
    return null;
  }

  return (
    <section className="mb-14 scroll-mt-20">
      {/* Encabezado de la Sección con Badge */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-3 py-1 rounded-full border border-amber-200 dark:border-amber-800/80 mb-2">
            <Flame className="w-4 h-4 fill-amber-500 text-amber-500 animate-pulse" />
            <span>{config.badge_text || 'TOP VENTAS'}</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
            {config.title || 'Los Más Vendidos'}
          </h2>

          {config.subtitle && (
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1 max-w-xl">
              {config.subtitle}
            </p>
          )}
        </div>

        {/* Indicador de posición en desktop */}
        <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400">
          <Award className="w-4 h-4 text-amber-500" />
          <span>{bestSellerProducts.length} productos destacados</span>
        </div>
      </div>

      {/* Contenedor del Carrusel */}
      <div className="relative group/bestsellers">
        {/* Flecha Izquierda (Solo Desktop) */}
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

        {/* Flecha Derecha (Solo Desktop) */}
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

        {/* Lista Carrusel: 2 en móvil, 3 en tablets, 4 en escritorios */}
        <div
          ref={containerRef}
          onScroll={updateScrollButtons}
          className="flex gap-3 md:gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory py-2 px-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        >
          {bestSellerProducts.map((product, idx) => {
            const hasDiscount = product.discount_percentage > 0;
            const finalPrice = hasDiscount
              ? product.price - product.price * (product.discount_percentage / 100)
              : product.price;

            // Estilos del ranking
            const rankStyle =
              idx === 0
                ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-gray-950 font-black shadow-xs'
                : idx === 1
                ? 'bg-gradient-to-r from-slate-400 to-gray-300 text-gray-950 font-black'
                : idx === 2
                ? 'bg-gradient-to-r from-amber-700 to-amber-600 text-white font-black'
                : 'bg-gray-900/90 dark:bg-gray-800 text-white font-bold';

            return (
              <div
                key={product.id}
                onClick={() => onOpenModal(product)}
                className="w-[calc(50%-6px)] sm:w-[calc(50%-8px)] md:w-[calc((100%-32px)/3)] xl:w-[calc((100%-48px)/4)] shrink-0 snap-start bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden hover:shadow-xl transition-all flex flex-col cursor-pointer group hover:-translate-y-1 relative"
              >
                {/* Ribbon de Ranking de Ventas */}
                <div className="absolute top-2 left-2 z-10">
                  <span className={`text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 ${rankStyle}`}>
                    <Sparkles className="w-3 h-3" />
                    #{idx + 1} Más Vendido
                  </span>
                </div>

                {/* Badge de Descuento si tiene */}
                {hasDiscount && (
                  <div className="absolute top-2 right-2 z-10 bg-secondary text-white text-[10px] sm:text-xs font-black px-2 py-0.5 rounded-full shadow-md">
                    -{product.discount_percentage}% OFF
                  </div>
                )}

                {/* Imagen del Producto */}
                <div className="h-40 sm:h-52 w-full bg-gray-50 dark:bg-gray-800/60 flex items-center justify-center p-4 border-b border-gray-100 dark:border-gray-800 relative">
                  {product.image_url_1 ? (
                    <img
                      src={optimizeImageUrl(product.image_url_1, 400)}
                      alt={product.name}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <span className="text-gray-400 text-xs font-medium">Sin imagen</span>
                  )}
                </div>

                {/* Contenido / Datos */}
                <div className="p-3 sm:p-4 flex flex-col flex-1">
                  {product.category && product.category !== 'Sin Categoría' && (
                    <span className="text-[10px] sm:text-xs text-primary dark:text-blue-400 font-extrabold uppercase tracking-wider mb-1 line-clamp-1">
                      {product.category}
                    </span>
                  )}

                  <h3 className="font-bold text-xs sm:text-sm md:text-base text-gray-900 dark:text-white leading-tight line-clamp-2 mb-2 flex-1">
                    {product.name}
                  </h3>

                  {/* Precios y Botón de Carrito */}
                  <div className="mt-auto pt-3 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-end justify-between gap-2">
                    <div>
                      {hasDiscount && (
                        <p className="text-[10px] sm:text-xs text-gray-400 line-through">
                          ${product.price.toFixed(2)}
                        </p>
                      )}
                      <p className="text-sm sm:text-lg font-black text-primary dark:text-blue-400 leading-none">
                        ${finalPrice.toFixed(2)}
                      </p>
                      {product.wholesale_price && Number(product.wholesale_price) > 0 && (
                        <span className="inline-block mt-1 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-[9px] font-bold px-1.5 py-0.5 rounded">
                          x{product.wholesale_min_qty || 6}+: ${Number(product.wholesale_price).toFixed(2)}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => onAddToCart(product, e)}
                      className="w-full sm:w-auto bg-gray-900 hover:bg-primary dark:bg-primary dark:hover:bg-primary/90 text-white py-1.5 px-3 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      <span>Agregar</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Puntos Indicadores de Navegación */}
        {totalDots > 1 && (
          <div className="flex justify-center items-center gap-1.5 mt-4">
            {Array.from({ length: totalDots }).map((_, dotIdx) => (
              <button
                key={dotIdx}
                type="button"
                onClick={() => scrollToDot(dotIdx)}
                className={`transition-all duration-300 rounded-full cursor-pointer ${
                  activeDot === dotIdx
                    ? 'w-6 h-2 bg-amber-500'
                    : 'w-2 h-2 bg-gray-300 dark:bg-gray-700 hover:bg-gray-400'
                }`}
                aria-label={`Ir al grupo ${dotIdx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
