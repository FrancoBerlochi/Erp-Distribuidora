/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingCart, Moon, Sun, Menu, X, Flame, Home, LayoutDashboard, Phone, Mail, Package } from 'lucide-react';
import { useCartStore } from '@/lib/store';
import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';

export default function Navbar() {
  const items = useCartStore((state) => state.items);
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Cerrar menú móvil al cambiar de ruta
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Bloquear scroll del body cuando el drawer esté abierto
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mobileMenuOpen]);

  const productCount = items.length;
  const totalPrice = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const isHomeActive = pathname === '/';
  const isCatalogoActive = pathname.startsWith('/catalogo') || pathname.startsWith('/productos');
  const isOfertasActive = pathname === '/ofertas';
  const isDashboardActive = pathname.startsWith('/dashboard');

  // Ocultar la barra pública en el panel de administración, en el login y en onboarding
  if (isDashboardActive || pathname === '/login' || pathname.startsWith('/onboarding')) {
    return null;
  }

  return (
    <>
      <header className="h-16 box-border bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40 transition-colors flex-shrink-0">
        <div className="container mx-auto px-4 h-full flex items-center justify-between">
          {/* Logo y Enlaces Desktop */}
          <div className="flex items-center gap-8">
            <Link href="/" className="text-xl sm:text-2xl font-black tracking-tight text-primary flex items-center gap-1">
              Distribuidora <span className="text-secondary">Express</span>
            </Link>

            <nav className="hidden md:flex items-center gap-1.5 text-sm font-semibold">
              <Link
                href="/"
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  isHomeActive
                    ? 'bg-blue-50 dark:bg-blue-950/40 text-primary font-bold'
                    : 'text-gray-700 dark:text-gray-300 hover:text-primary hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                Inicio
              </Link>
              <Link
                href="/productos"
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                  isCatalogoActive
                    ? 'bg-blue-50 dark:bg-blue-950/40 text-primary font-bold'
                    : 'text-gray-700 dark:text-gray-300 hover:text-primary hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <span>Productos</span>
              </Link>
              <Link
                href="/ofertas"
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  isOfertasActive
                    ? 'bg-red-50 dark:bg-red-950/40 text-secondary font-bold'
                    : 'text-gray-700 dark:text-gray-300 hover:text-secondary hover:bg-red-50/50 dark:hover:bg-gray-800'
                }`}
              >
                <Flame className="w-4 h-4 text-secondary fill-secondary animate-pulse" />
                <span>Ofertas</span>
                <span className="text-[10px] uppercase tracking-wider font-extrabold bg-secondary text-white px-1.5 py-0.5 rounded-full">
                  Hot
                </span>
              </Link>
            </nav>
          </div>

          {/* Acciones de la derecha */}
          <div className="flex items-center gap-3">
            {/* Solo en Desktop: Enlace Admin */}
            <Link
              href="/dashboard"
              className="hidden md:block text-sm font-bold text-gray-700 dark:text-gray-300 hover:text-primary transition-colors"
            >
              Admin
            </Link>

            {/* Solo en Desktop: Botón Modo Oscuro */}
            {mounted && (
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="hidden md:flex p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors cursor-pointer"
                aria-label="Toggle Dark Mode"
              >
                {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-gray-700" />}
              </button>
            )}

            {/* Solo en Desktop: Botón Carrito */}
            <Link
              href="/cart"
              className="hidden md:flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-full font-bold hover:bg-primary/90 transition-all shadow-sm hover:shadow"
            >
              <ShoppingCart className="w-5 h-5" />
              <span>{mounted ? productCount : 0}</span>
            </Link>

            {/* Botón Hamburguesa Estilo Azul Landing (Visible solo en Mobile) */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 text-primary dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 shadow-sm active:scale-95 transition-all cursor-pointer"
              aria-label="Abrir Menú"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Menú Lateral Drawer con los Colores de la Landing (Mobile) */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          {/* Fondo oscuro traslúcido */}
          <div 
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200" 
          />

          {/* Panel Lateral Deslizable adaptado a los colores de la tienda */}
          <aside className="fixed top-0 right-0 bottom-0 w-[290px] max-w-[85vw] bg-white dark:bg-gray-950 border-l border-gray-200 dark:border-gray-800 shadow-2xl flex flex-col p-6 z-50 animate-in slide-in-from-right duration-300">
            {/* Encabezado del Drawer */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-800">
              <div>
                <h2 className="text-lg font-black text-primary tracking-tight">
                  Distribuidora <span className="text-secondary">Express</span>
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Mayorista & Minorista</p>
              </div>

              {/* Botón Cerrar idéntico al estilo del botón hamburguesa */}
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 text-primary dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 flex items-center justify-center shadow-sm active:scale-95 transition-all cursor-pointer"
                aria-label="Cerrar Menú"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navegación Principal */}
            <nav className="my-6 space-y-2 flex-1 overflow-y-auto">
              {/* Inicio */}
              <Link
                href="/"
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all ${
                  isHomeActive
                    ? 'bg-blue-50 dark:bg-blue-950/50 border-l-4 border-primary text-primary dark:text-blue-400 font-bold shadow-xs'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900 font-semibold'
                }`}
              >
                <Home className="w-5 h-5" />
                <span>Inicio</span>
              </Link>

              {/* Productos */}
              <Link
                href="/productos"
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all ${
                  isCatalogoActive
                    ? 'bg-blue-50 dark:bg-blue-950/50 border-l-4 border-primary text-primary dark:text-blue-400 font-bold shadow-xs'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900 font-semibold'
                }`}
              >
                <Package className="w-5 h-5" />
                <span>Productos</span>
              </Link>

              {/* Ofertas */}
              <Link
                href="/ofertas"
                className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-all ${
                  isOfertasActive
                    ? 'bg-red-50 dark:bg-red-950/50 border-l-4 border-secondary text-secondary font-bold shadow-xs'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-red-50/50 dark:hover:bg-gray-900 font-semibold'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Flame className="w-5 h-5 text-secondary fill-secondary" />
                  <span>Ofertas y Promos</span>
                </div>
                <span className="text-[10px] font-black bg-secondary text-white px-2 py-0.5 rounded-full">
                  HOT
                </span>
              </Link>

              {/* Admin Panel */}
              <Link
                href="/dashboard"
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all ${
                  isDashboardActive
                    ? 'bg-blue-50 dark:bg-blue-950/50 border-l-4 border-primary text-primary dark:text-blue-400 font-bold shadow-xs'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900 font-semibold'
                }`}
              >
                <LayoutDashboard className="w-5 h-5" />
                <span>Panel de Admin</span>
              </Link>
            </nav>

            {/* Sección Inferior del Drawer */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-800 space-y-4">
              {/* Selector de Modo Claro / Oscuro */}
              {mounted && (
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
                  <div className="flex items-center gap-2.5">
                    {theme === 'dark' ? (
                      <Moon className="w-4 h-4 text-blue-400" />
                    ) : (
                      <Sun className="w-4 h-4 text-amber-500" />
                    )}
                    <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                      {theme === 'dark' ? 'Modo Oscuro' : 'Modo Claro'}
                    </span>
                  </div>
                  
                  <button
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all cursor-pointer shadow-xs"
                  >
                    Cambiar
                  </button>
                </div>
              )}

              {/* Botón Carrito Destacado con el Azul Primario de la Landing */}
              <Link
                href="/cart"
                className="w-full flex items-center justify-center gap-2.5 bg-primary text-white py-3.5 px-4 rounded-xl font-bold text-sm shadow-md hover:bg-primary/90 active:scale-[0.98] transition-all cursor-pointer"
              >
                <ShoppingCart className="w-5 h-5" />
                <span>Ver Carrito ({mounted ? productCount : 0})</span>
                {totalPrice > 0 && <span>• ${totalPrice.toFixed(2)}</span>}
              </Link>

              {/* Iconos de Contacto / Redes al pie */}
              <div className="flex justify-center items-center gap-3 pt-2">
                <a
                  href="tel:+5491100000000"
                  className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 flex items-center justify-center transition-all"
                  title="Llamar"
                >
                  <Phone className="w-4 h-4" />
                </a>
                <a
                  href="mailto:contacto@distribuidora.com"
                  className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 flex items-center justify-center transition-all"
                  title="Correo"
                >
                  <Mail className="w-4 h-4" />
                </a>
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
