import Link from 'next/link';
import { Home, Search, Flame, ShoppingBag, ArrowLeft, MessageCircle } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-xl w-full text-center">
        {/* Gráfico / Icono decorativo */}
        <div className="relative mb-8 inline-flex items-center justify-center">
          {/* Círculos con brillo de fondo */}
          <div className="absolute w-32 h-32 bg-primary/15 dark:bg-primary/25 rounded-full blur-2xl animate-pulse"></div>
          <div className="absolute w-24 h-24 bg-secondary/20 dark:bg-secondary/30 rounded-full blur-xl -top-2 -right-2"></div>
          
          <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-gradient-to-tr from-blue-50 to-white dark:from-gray-800 dark:to-gray-900 border-2 border-gray-200 dark:border-gray-700 shadow-xl flex items-center justify-center">
            <ShoppingBag className="w-14 h-14 sm:w-16 sm:h-16 text-primary dark:text-blue-400 -rotate-12 transition-transform hover:rotate-0 duration-300" />
            <div className="absolute -bottom-2 -right-2 bg-secondary text-white text-[11px] font-black px-2.5 py-1 rounded-full shadow-md border-2 border-white dark:border-gray-900">
              404
            </div>
          </div>
        </div>

        {/* Título y Mensaje */}
        <span className="text-xs sm:text-sm font-extrabold uppercase tracking-widest text-secondary mb-2 block">
          Página no encontrada
        </span>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-gray-900 dark:text-white tracking-tight mb-4">
          ¡Ups! No encontramos esta página
        </h1>
        <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto leading-relaxed">
          El producto, oferta o sección que buscas no está en nuestro inventario o fue movida a otra estantería.
        </p>

        {/* Botones de Acción */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
          <Link
            href="/"
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white font-bold px-6 py-3.5 rounded-2xl shadow-lg transition-all active:scale-95"
          >
            <Home className="w-4 h-4" />
            <span>Volver al Inicio</span>
          </Link>

          <Link
            href="/ofertas"
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-secondary/10 hover:bg-secondary/20 text-secondary dark:text-secondary font-bold px-6 py-3.5 rounded-2xl border border-secondary/30 transition-all active:scale-95"
          >
            <Flame className="w-4 h-4 fill-secondary" />
            <span>Ver Ofertas</span>
          </Link>
        </div>

        {/* Enlace de ayuda secundaria */}
        <div className="mt-10 pt-8 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400 flex flex-wrap items-center justify-center gap-4">
          <span>¿Buscabas algo específico?</span>
          <Link 
            href="/productos" 
            className="text-primary hover:underline font-bold flex items-center gap-1"
          >
            <Search className="w-3.5 h-3.5" />
            Explorar todos los productos
          </Link>
          <span>•</span>
          <a
            href="https://wa.me/5491112345678"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-600 dark:text-emerald-400 hover:underline font-bold flex items-center gap-1"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            Consultar por WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}
