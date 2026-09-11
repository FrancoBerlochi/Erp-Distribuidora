'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Footer() {
  const pathname = usePathname();

  // Ocultar el footer en el panel de administración y en el login
  if (pathname?.startsWith('/dashboard') || pathname === '/login') {
    return null;
  }
  return (
    <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="text-2xl font-bold tracking-tight text-primary mb-4 block">
              Distribuidora <span className="text-secondary">Express</span>
            </Link>
            <p className="text-gray-600 dark:text-gray-400 max-w-sm mb-4">
              Tu proveedor confiable de alimentos y productos de limpieza al por mayor. Entregas rápidas y seguras.
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Enlaces Rápidos</h3>
            <ul className="space-y-2">
              <li><Link href="/" className="text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-primary transition-colors">Inicio</Link></li>
              <li><Link href="/ofertas" className="text-gray-600 dark:text-gray-400 hover:text-secondary dark:hover:text-secondary transition-colors font-medium flex items-center gap-1"><span>🔥</span> Ofertas Especiales</Link></li>
              <li><Link href="/cart" className="text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-primary transition-colors">Carrito</Link></li>
              <li><Link href="/login" className="text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-primary transition-colors">Acceso Empresas</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Contacto</h3>
            <ul className="space-y-2 text-gray-600 dark:text-gray-400">
              <li>WhatsApp: +54 9 11 1234-5678</li>
              <li>Email: info@distribuidora.com</li>
              <li>Av. Siempre Viva 123, Ciudad</li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-200 dark:border-gray-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} Distribuidora Express. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
