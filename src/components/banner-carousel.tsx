/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLandingConfig } from '@/lib/landing-config';
import { optimizeImageUrl } from '@/lib/products-cache';

export default function BannerCarousel() {
  const { config } = useLandingConfig();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  // Solo considerar slides que estén activos
  const slides = (config.slides || []).filter((s) => s.is_active !== false);
  const totalSlides = slides.length;

  // Autoplay con temporizador
  useEffect(() => {
    if (totalSlides <= 1 || isPaused) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % totalSlides);
    }, (config.autoplay_interval || 5) * 1000);

    return () => clearInterval(interval);
  }, [totalSlides, isPaused, config.autoplay_interval]);

  // Si el carrusel está desactivado o no hay imágenes, no renderizar
  if (!config.carousel_active || totalSlides === 0) {
    return null;
  }

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % totalSlides);
  };

  // Soporte táctil / Swipe para móviles
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;

    if (diff > 45) {
      handleNext();
    } else if (diff < -45) {
      handlePrev();
    }
    touchStartX.current = null;
  };

  const currentSlide = slides[currentIndex] || slides[0];

  const SlideWrapper = ({ children }: { children: React.ReactNode }) => {
    if (currentSlide.link_url) {
      return (
        <Link href={currentSlide.link_url} className="block w-full h-full">
          {children}
        </Link>
      );
    }
    return <div className="w-full h-full">{children}</div>;
  };

  // Texto legal específico de ESTA imagen o fallback global
  const activeDisclaimer = currentSlide.disclaimer_text || config.disclaimer_text;

  return (
    <section 
      className="mb-12"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      aria-label="Carrusel de promociones"
    >
      <div className="relative rounded-3xl overflow-hidden border-2 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-md">
        {/* Contenedor de la Imagen y el Cuadrado Rojo */}
        <div className="relative w-full h-44 sm:h-72 md:h-80 lg:h-96 overflow-hidden bg-white dark:bg-gray-800 flex items-center justify-center">
          <SlideWrapper>
            <div className="relative w-full h-full flex items-center overflow-hidden">
              {/* Imagen de fondo / banner */}
              <img
                key={currentSlide.id || currentIndex}
                src={optimizeImageUrl(currentSlide.image_url, 1200)}
                alt={currentSlide.title || `Promoción ${currentIndex + 1}`}
                className="w-full h-full object-cover object-center animate-in fade-in duration-300 transition-all"
                loading="eager"
              />

              {/* Cuadrado Rojo de Descuento/Promoción (Ocupa el 27% total sin padding ni margin) */}
              {currentSlide.badge_text && (
                <div className="absolute left-0 top-0 bottom-0 w-[27%] bg-[#e30613] rounded-r-2xl sm:rounded-r-3xl flex items-center justify-center p-2 sm:p-4 shadow-xl z-10 select-none">
                  <span className="text-white font-black text-3xl sm:text-5xl md:text-7xl lg:text-8xl tracking-tighter text-center leading-none drop-shadow-md">
                    {currentSlide.badge_text}
                  </span>
                </div>
              )}

              {/* Título opcional al lado del cuadrado rojo */}
              {currentSlide.title && (
                <div className={`absolute top-1/2 -translate-y-1/2 z-10 pointer-events-none px-3 py-1.5 rounded-xl ${
                  currentSlide.badge_text 
                    ? 'left-[30%] sm:left-[29%] right-12 sm:right-16 bg-white/75 dark:bg-black/65 backdrop-blur-xs max-w-lg' 
                    : 'left-6 right-12 sm:right-16 bg-white/60 dark:bg-black/50 backdrop-blur-xs max-w-md'
                }`}>
                  <h3 className="text-xs sm:text-2xl md:text-3xl font-black text-gray-900 dark:text-white leading-tight">
                    {currentSlide.title}
                  </h3>
                </div>
              )}
            </div>
          </SlideWrapper>

          {/* Flechas de Navegación (solo visibles en desktop, en mobile se usa swipe) */}
          {totalSlides > 1 && (
            <>
              <button
                onClick={handlePrev}
                className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/85 dark:bg-gray-900/85 backdrop-blur-sm border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-900 items-center justify-center shadow-lg transition-all active:scale-95 z-20 cursor-pointer"
                aria-label="Anterior slide"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              <button
                onClick={handleNext}
                className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/85 dark:bg-gray-900/85 backdrop-blur-sm border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-900 items-center justify-center shadow-lg transition-all active:scale-95 z-20 cursor-pointer"
                aria-label="Siguiente slide"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}
        </div>

        {/* Franja de Texto Legal / Promocional Inferior ESPECÍFICA de cada imagen */}
        {config.show_disclaimer && activeDisclaimer && (
          <div className="bg-gray-200 dark:bg-gray-800 border-t border-gray-300 dark:border-gray-700 py-2 sm:py-2.5 px-4 text-center">
            <p className="text-[9px] sm:text-[11px] font-bold text-gray-700 dark:text-gray-300 tracking-tight uppercase leading-snug">
              {activeDisclaimer}
            </p>
          </div>
        )}
      </div>

      {/* Indicadores de Puntos (Dots: o o • o o) */}
      {totalSlides > 1 && (
        <div className="flex items-center justify-center gap-2 mt-3">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`transition-all rounded-full cursor-pointer ${
                idx === currentIndex
                  ? 'w-6 h-2.5 bg-secondary shadow-sm scale-105'
                  : 'w-2.5 h-2.5 bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600'
              }`}
              aria-label={`Ir al slide ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
