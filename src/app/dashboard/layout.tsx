/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { 
  Package, 
  LogOut, 
  LayoutDashboard, 
  ImageIcon, 
  Tags, 
  ExternalLink, 
  Sun, 
  Moon, 
  Menu, 
  X,
  ShieldCheck,
  ShieldAlert,
  TrendingUp,
  ScanBarcode,
  Banknote,
  Users,
  LineChart,
  Truck,
  Tag,
  BarChart3,
  Database,
  CalendarClock,
  Sliders,
  Lock
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useTheme } from 'next-themes';
import { UserRole } from '@/lib/pos-types';
import { isPathAllowedForRole, fetchUserRole } from '@/lib/role-service';
import { 
  getActiveLicense, 
  isRouteAllowedByLicense, 
  subscribeToLicenseChanges, 
  LicenseState 
} from '@/lib/license-service';
import { ERP_PLANS, ERP_MODULES, ErpModuleId } from '@/config/modules';
import OrdersNotificationBell from '@/components/orders-notification-bell';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Estados de autenticación y rol
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [currentRole, setCurrentRole] = useState<UserRole>('admin');

  // Estado de licencia activa y reactiva
  const [license, setLicense] = useState<LicenseState>(getActiveLicense());

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('distribuidora_simulated_role');
    }

    const unsubscribe = subscribeToLicenseChanges(() => {
      setLicense(getActiveLicense());
    });

    return () => unsubscribe();
  }, []);

  // Sincronizar rol real del usuario desde Supabase
  useEffect(() => {
    if (user) {
      fetchUserRole(user).then((r) => setCurrentRole(r));
    }
  }, [user]);

  // Verificación estricta de sesión
  useEffect(() => {
    let isMounted = true;

    async function checkSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted) return;

        if (!session) {
          router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
        } else {
          setUser(session.user);
          const role = await fetchUserRole(session.user);
          if (isMounted) {
            setCurrentRole(role);
            setCheckingAuth(false);
          }
        }
      } catch (err) {
        console.error('Error verificando sesión en dashboard:', err);
        if (isMounted) {
          router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
        }
      }
    }

    checkSession();

    // Escuchar eventos de sesión (login, logout, token expirado)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      if (event === 'SIGNED_OUT' || !session) {
        setUser(null);
        router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      } else if (session) {
        setUser(session.user);
        const role = await fetchUserRole(session.user);
        if (isMounted) {
          setCurrentRole(role);
          setCheckingAuth(false);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, [pathname, router]);

  // Cerrar sidebar móvil al cambiar de ruta
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname]);

  // Evitar cualquier scroll exterior en la ventana/body en todo el panel
  useEffect(() => {
    document.documentElement.classList.add('overflow-hidden');
    document.body.classList.add('overflow-hidden');
    return () => {
      document.documentElement.classList.remove('overflow-hidden');
      document.body.classList.remove('overflow-hidden');
    };
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Error al cerrar sesión:', err);
    } finally {
      router.push('/login');
    }
  };

  const navItems: Array<{
    href: string;
    label: string;
    description: string;
    icon: any;
    isActive: boolean;
    moduleId?: ErpModuleId;
  }> = [
    {
      href: '/dashboard',
      label: 'Inicio / Pedidos',
      description: 'Gestión de ventas y pedidos',
      icon: LayoutDashboard,
      isActive: pathname === '/dashboard',
    },
    {
      href: '/dashboard/pos',
      label: 'Punto de Venta (POS)',
      description: 'Caja rápida y escáner de barras',
      icon: ScanBarcode,
      isActive: pathname === '/dashboard/pos',
      moduleId: 'pos',
    },
    {
      href: '/dashboard/caja',
      label: 'Gestión de Caja',
      description: 'Aperturas, egresos y cierre guiado',
      icon: Banknote,
      isActive: pathname === '/dashboard/caja',
      moduleId: 'caja',
    },
    {
      href: '/dashboard/clientes',
      label: 'Clientes / Fiado',
      description: 'Cuentas corrientes, deudas y cobranzas',
      icon: Users,
      isActive: pathname.startsWith('/dashboard/clientes'),
      moduleId: 'clientes',
    },
    {
      href: '/dashboard/rentabilidad',
      label: 'Rentabilidad',
      description: 'Márgenes de venta, CMV y utilidad',
      icon: LineChart,
      isActive: pathname.startsWith('/dashboard/rentabilidad'),
      moduleId: 'rentabilidad',
    },
    {
      href: '/dashboard/reportes',
      label: 'Reportes y Gráficos',
      description: 'Facturación, medios de cobro y horas pico',
      icon: BarChart3,
      isActive: pathname.startsWith('/dashboard/reportes'),
      moduleId: 'reportes',
    },
    {
      href: '/dashboard/backup',
      label: 'Copia de Seguridad',
      description: 'Respaldos JSON, auditoría Excel y restauración',
      icon: Database,
      isActive: pathname.startsWith('/dashboard/backup'),
      moduleId: 'backup',
    },
    {
      href: '/dashboard/products',
      label: 'Productos',
      description: 'Catálogo, precios e inventario',
      icon: Package,
      isActive: pathname.startsWith('/dashboard/products'),
    },
    {
      href: '/dashboard/proveedores',
      label: 'Proveedores y Stock',
      description: 'Compras, reposición crítica y pedidos WhatsApp',
      icon: Truck,
      isActive: pathname.startsWith('/dashboard/proveedores'),
      moduleId: 'proveedores',
    },
    {
      href: '/dashboard/etiquetas',
      label: 'Etiquetas Góndola',
      description: 'Precios, códigos de barra y ofertas',
      icon: Tag,
      isActive: pathname.startsWith('/dashboard/etiquetas'),
      moduleId: 'etiquetas',
    },
    {
      href: '/dashboard/vencimientos',
      label: 'Lotes y Vencimientos',
      description: 'Control de caducidad y alertas FEFO',
      icon: CalendarClock,
      isActive: pathname.startsWith('/dashboard/vencimientos'),
      moduleId: 'vencimientos',
    },
    {
      href: '/dashboard/banners',
      label: 'Banners Web',
      description: 'Promociones principales y avisos',
      icon: ImageIcon,
      isActive: pathname.startsWith('/dashboard/banners') || pathname.startsWith('/dashboard/pagina'),
      moduleId: 'ecommerce',
    },
    {
      href: '/dashboard/categorias',
      label: 'Categorías Web',
      description: 'Vitrinas temáticas y descuentos',
      icon: Tags,
      isActive: pathname.startsWith('/dashboard/categorias'),
      moduleId: 'ecommerce',
    },
    {
      href: '/dashboard/mas-vendidos',
      label: 'Más Vendidos Web',
      description: 'Destacar productos populares',
      icon: TrendingUp,
      isActive: pathname.startsWith('/dashboard/mas-vendidos'),
      moduleId: 'ecommerce',
    },
    {
      href: '/dashboard/licencia',
      label: 'Módulos y Licencia',
      description: 'Planes, módulos contratados y precios',
      icon: Sliders,
      isActive: pathname.startsWith('/dashboard/licencia'),
    },
  ];

  // Filtrado de navegación estricto:
  // 1. Módulos no contratados en la licencia se ocultan por completo.
  // 2. Rutas bloqueadas para el rol actual (ej: cajero) se ocultan.
  const filteredNavItems = navItems.filter((item) => {
    if (item.moduleId && !license.modules.includes(item.moduleId)) {
      return false;
    }
    return isPathAllowedForRole(item.href, currentRole);
  });

  const isCurrentRouteAllowedByRole = isPathAllowedForRole(pathname, currentRole);
  const isCurrentRouteAllowedByLicense = isRouteAllowedByLicense(pathname);

  // Pantalla de carga mientras se verifica la autenticación
  if (checkingAuth) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 text-gray-600 dark:text-gray-400 gap-4">
        <div className="relative">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div className="absolute -inset-1.5 rounded-2xl border-2 border-primary/20 border-t-primary animate-spin" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-bold text-gray-900 dark:text-white">Verificando credenciales</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Comprobando permisos y perfil de acceso...</p>
        </div>
      </div>
    );
  }

  const currentPlanMeta = ERP_PLANS[license.plan];

  return (
    <div className="flex flex-col md:flex-row h-screen max-h-screen w-full bg-gray-50 dark:bg-gray-950 overflow-hidden">
      {/* Header móvil para pantallas pequeñas */}
      <div className="md:hidden h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 flex-shrink-0 z-30">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            currentRole === 'admin' ? 'bg-primary/10 text-primary' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          }`}>
            {currentRole === 'admin' ? <ShieldCheck className="w-5 h-5" /> : <ScanBarcode className="w-5 h-5" />}
          </div>
          <span className="font-extrabold text-sm text-gray-900 dark:text-white">
            ERP <span className="text-[#dc2626] dark:text-red-500">Modular</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <OrdersNotificationBell />
          <button
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
            aria-label="Abrir menú"
          >
            {mobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Backdrop para drawer móvil */}
      {mobileSidebarOpen && (
        <div 
          onClick={() => setMobileSidebarOpen(false)}
          className="md:hidden fixed inset-0 bg-black/50 backdrop-blur-xs z-40 animate-in fade-in"
        />
      )}

      {/* Sidebar (Lateral amplio y de altura completa) */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-50
        w-72 lg:w-80 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 
        flex flex-col flex-shrink-0 h-full shadow-sm md:shadow-none
        transition-transform duration-300 ease-in-out
        ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Cabecera del Lateral: Marca y badges de Rol y Plan */}
        <div className="p-5 lg:p-6 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
          <div className="flex items-center justify-between gap-1 mb-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              {currentRole === 'admin' ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider bg-blue-50 dark:bg-blue-950/60 text-primary dark:text-blue-400 px-2.5 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                  <ShieldCheck className="w-3 h-3" />
                  Admin
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                  <ScanBarcode className="w-3 h-3" />
                  Cajero
                </span>
              )}

              <span className={`inline-flex items-center text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                currentPlanMeta?.badgeClass || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
              }`}>
                {currentPlanMeta?.name.split('(')[0].trim() || 'Plan Custom'}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <OrdersNotificationBell />
              <button
                onClick={() => setMobileSidebarOpen(false)}
                className="md:hidden p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
            ERP <span className="text-[#dc2626] dark:text-red-500">Modular</span>
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {currentRole === 'admin' ? 'Panel de control y gestión comercial' : 'Terminal de ventas y operaciones de caja'}
          </p>
        </div>
        
        {/* Navegación principal con filtrado por rol y módulos activos */}
        <nav className="flex-1 p-4 lg:p-5 space-y-2.5 overflow-y-auto min-h-0">
          <div className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-3 mb-2 flex items-center justify-between">
            <span>Módulos Habilitados</span>
            {currentRole === 'cajero' && (
              <span className="text-[9px] bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-500">Cajero</span>
            )}
          </div>
          
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link 
                key={item.href}
                href={item.href} 
                className={`flex items-start gap-3.5 px-4 py-3.5 rounded-2xl font-bold transition-all ${
                  item.isActive 
                    ? 'bg-primary text-white shadow-md shadow-primary/20 scale-[1.01]' 
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:translate-x-0.5'
                }`}
              >
                <div className={`mt-0.5 p-1.5 rounded-xl ${
                  item.isActive 
                    ? 'bg-white/20 text-white' 
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                }`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-extrabold leading-tight truncate">
                    {item.label}
                  </div>
                  <div className={`text-[11px] font-medium leading-tight mt-0.5 truncate ${
                    item.isActive ? 'text-white/80' : 'text-gray-400 dark:text-gray-500'
                  }`}>
                    {item.description}
                  </div>
                </div>
              </Link>
            );
          })}

          {/* Enlace Directo a la Tienda (Solo si el módulo e-commerce está habilitado) */}
          {license.modules.includes('ecommerce') && (
            <div className="pt-4 mt-4 border-t border-gray-100 dark:border-gray-800">
              <div className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-3 mb-2">
                Acceso a la Tienda Web
              </div>
              <Link
                href="/"
                className="flex items-center justify-between px-4 py-3 rounded-2xl font-bold text-xs text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-primary dark:hover:text-blue-400 border border-gray-200 dark:border-gray-800 transition-all cursor-pointer shadow-2xs"
              >
                <div className="flex items-center gap-2">
                  <span>Ver Tienda Online</span>
                </div>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </nav>
        
        {/* Pie del Lateral: Usuario, Tema y Cerrar Sesión */}
        <div className="p-4 lg:p-5 border-t border-gray-200 dark:border-gray-800 flex-shrink-0 space-y-3 bg-gray-50/50 dark:bg-gray-900/50">
          {/* Identificación del Usuario y Rol Real */}
          {user && (
            <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-2xs">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs uppercase flex-shrink-0 ${
                currentRole === 'admin' ? 'bg-primary/10 text-primary' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              }`}>
                {user.email?.[0] || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-gray-900 dark:text-white truncate" title={user.email}>
                  {user.email}
                </p>
                <span className={`text-[10px] font-semibold flex items-center gap-1 ${
                  currentRole === 'admin' ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    currentRole === 'admin' ? 'bg-emerald-500' : 'bg-blue-500'
                  }`}></span>
                  {currentRole === 'admin' ? 'Administrador' : 'Cajero / Operador'}
                </span>
              </div>
            </div>
          )}

          {/* Selector de Tema */}
          {mounted && (
            <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs">
              <span className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                {theme === 'dark' ? <Moon className="w-3.5 h-3.5 text-blue-400" /> : <Sun className="w-3.5 h-3.5 text-amber-500" />}
                <span>{theme === 'dark' ? 'Modo Oscuro' : 'Modo Claro'}</span>
              </span>
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 transition-colors cursor-pointer"
              >
                Cambiar
              </button>
            </div>
          )}

          {/* Botón Cerrar Sesión */}
          <button 
            onClick={handleLogout}
            className="flex items-center justify-center gap-2.5 px-4 py-2.5 text-red-600 dark:text-red-400 font-bold text-xs rounded-xl bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/50 border border-red-200 dark:border-red-900/40 transition-colors w-full cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Contenido Principal con Guardias de Seguridad por Rol y por Licencia */}
      <main className="flex-1 min-h-0 p-4 sm:p-6 md:p-8 overflow-y-auto flex flex-col bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
        {!isCurrentRouteAllowedByLicense ? (
          // Guardia de Módulo No Contratado en Licencia
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto my-auto animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4 border border-amber-200 dark:border-amber-900/60 shadow-lg">
              <Lock className="w-8 h-8" />
            </div>
            <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 mb-2">
              Módulo No Contratado
            </span>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight mb-2">
              Funcionalidad no disponible
            </h2>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
              Esta sección requiere un módulo que no está incluido en su plan actual (<strong className="text-gray-900 dark:text-white">{currentPlanMeta?.name || 'Personalizado'}</strong>). Comuníquese con el proveedor del sistema para ampliar su suscripción.
            </p>
            <div className="flex flex-wrap gap-2.5 justify-center">
              {currentRole === 'admin' && (
                <Link
                  href="/dashboard/licencia"
                  className="px-4 py-2 rounded-xl bg-primary text-white font-bold text-xs hover:bg-blue-700 transition-colors shadow-xs"
                >
                  Ver Módulos y Planes
                </Link>
              )}
              <Link
                href="/dashboard"
                className="px-4 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 font-bold text-xs hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                Volver al Inicio
              </Link>
            </div>
          </div>
        ) : !isCurrentRouteAllowedByRole ? (
          // Guardia de Rol de Usuario (ej: Cajero entrando a finanzas)
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto my-auto animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-4 border border-rose-200 dark:border-rose-900/60 shadow-lg">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 mb-2">
              Acceso Restringido
            </span>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight mb-2">
              Permisos Insuficientes
            </h2>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
              Esta sección contiene métricas financieras confidenciales, márgenes de ganancia o respaldos que requieren rol de <strong className="text-gray-900 dark:text-white">Administrador</strong>.
            </p>
            <div className="flex flex-wrap gap-2.5 justify-center">
              <Link
                href="/dashboard/pos"
                className="px-4 py-2 rounded-xl bg-primary text-white font-bold text-xs hover:bg-blue-700 transition-colors shadow-xs"
              >
                Ir al Punto de Venta (POS)
              </Link>
              <Link
                href="/dashboard"
                className="px-4 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 font-bold text-xs hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                Volver a Pedidos
              </Link>
            </div>
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  );
}
