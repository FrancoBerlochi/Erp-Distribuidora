import { UserRole } from './pos-types';
import { supabase } from './supabase';

export const ADMIN_ONLY_PATHS = [
  '/dashboard/rentabilidad',
  '/dashboard/reportes',
  '/dashboard/backup',
  '/dashboard/proveedores',
  '/dashboard/banners',
  '/dashboard/categorias',
  '/dashboard/mas-vendidos',
  '/dashboard/pagina',
  '/dashboard/licencia',
];

export const CASHIER_ALLOWED_PATHS = [
  '/dashboard',
  '/dashboard/pos',
  '/dashboard/caja',
  '/dashboard/clientes',
  '/dashboard/products',
  '/dashboard/etiquetas',
  '/dashboard/vencimientos',
];

/**
 * Determina si la ruta actual está permitida según el rol del usuario
 */
export function isPathAllowedForRole(pathname: string, role: UserRole): boolean {
  if (role === 'admin') return true;

  // Los cajeros tienen bloqueado el acceso a finanzas, costos, reportes gerenciales y backups
  const isBlocked = ADMIN_ONLY_PATHS.some(
    (restricted) => pathname === restricted || pathname.startsWith(`${restricted}/`)
  );

  return !isBlocked;
}

/**
 * Resuelve el rol real del usuario consultando Supabase profiles, metadata de auth o convención de email
 */
export async function fetchUserRole(user: any): Promise<UserRole> {
  if (!user) return 'admin';

  try {
    // 1. Consultar tabla profiles en Supabase por ID de usuario
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.role === 'cajero' || profile?.role === 'admin') {
      return profile.role;
    }
  } catch (err) {
    console.warn('[ROLE_SERVICE] Aviso consultando profiles en Supabase:', err);
  }

  // 2. Metadatos del usuario de Supabase Auth
  const metaRole = user.user_metadata?.role || user.app_metadata?.role;
  if (metaRole === 'cajero') return 'cajero';
  if (metaRole === 'admin') return 'admin';

  // 3. Convención de cuenta para personal de caja (ej: cajero@distribuidora.com, caja1@...)
  const email = (user.email || '').toLowerCase();
  if (email.startsWith('caja') || email.includes('cajero')) {
    return 'cajero';
  }

  return 'admin';
}

/**
 * Resuelve sincrónicamente el rol inicial a partir de metadatos o email
 */
export function resolveUserRole(user: any): UserRole {
  if (!user) return 'admin';

  // Metadatos de Supabase Auth
  const metaRole = user.user_metadata?.role || user.app_metadata?.role;
  if (metaRole === 'cajero') return 'cajero';
  if (metaRole === 'admin') return 'admin';

  // Convención por correo
  const email = (user.email || '').toLowerCase();
  if (email.startsWith('caja') || email.includes('cajero')) {
    return 'cajero';
  }

  return 'admin';
}
