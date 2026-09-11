import { NextResponse, type NextRequest } from 'next/server';

const ECOMMERCE_ROUTES = [
  '/',
  '/catalogo',
  '/cart',
  '/checkout',
  '/checkout/success',
  '/ofertas',
  '/productos',
];

/**
 * Determina si el módulo e-commerce está habilitado en el entorno o cookie
 */
function isEcommerceEnabled(request: NextRequest): boolean {
  // 1. Verificar si hay cookie de simulación activa (para demos o testing)
  const simCookie = request.cookies.get('erp_active_license')?.value;
  if (simCookie) {
    try {
      const parsed = JSON.parse(decodeURIComponent(simCookie));
      if (Array.isArray(parsed.modules)) {
        return parsed.modules.includes('ecommerce');
      }
      if (parsed.plan === 'enterprise') return true;
      if (parsed.plan === 'basico' || parsed.plan === 'profesional') return false;
    } catch {
      // Continuar con variables de entorno si falla la cookie
    }
  }

  // 2. Variables de entorno explícitas
  const activeModulesEnv = process.env.NEXT_PUBLIC_ERP_ACTIVE_MODULES;
  if (activeModulesEnv) {
    const modules = activeModulesEnv.split(',').map((m) => m.trim().toLowerCase());
    return modules.includes('ecommerce');
  }

  const planEnv = (process.env.NEXT_PUBLIC_ERP_PLAN || 'enterprise').toLowerCase();
  if (planEnv === 'basico' || planEnv === 'profesional') {
    return false;
  }

  // Por defecto 'enterprise'
  return true;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Si el módulo e-commerce está deshabilitado y el usuario intenta acceder a la tienda pública
  const isEcommerceRoute = ECOMMERCE_ROUTES.some(
    (route) => pathname === route || (route !== '/' && pathname.startsWith(`${route}/`))
  );

  if (isEcommerceRoute && !isEcommerceEnabled(request)) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  const response = NextResponse.next();

  // Cabeceras HTTP de Seguridad
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(self), microphone=(), geolocation=()');

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
