-- ==============================================================================
-- DISTRIBUIDORA EXPRESS: CONFIGURACIÓN DE ROLES REALES (ADMIN / CAJERO)
-- ==============================================================================
-- Ejecuta este script en el "SQL Editor" de tu proyecto de Supabase.
-- Configura la tabla 'profiles', sincroniza los usuarios actuales y futuros,
-- y te permite asignar roles de Administrador o Cajero fácilmente.

-- 1. Crear tabla de perfiles si no existiera
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    role TEXT NOT NULL DEFAULT 'cajero' CHECK (role IN ('admin', 'cajero')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Habilitar seguridad por fila (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de acceso RLS
DROP POLICY IF EXISTS "Los usuarios autenticados pueden ver su propio perfil" ON public.profiles;
CREATE POLICY "Los usuarios autenticados pueden ver su propio perfil"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Los usuarios autenticados pueden actualizar su perfil" ON public.profiles;
CREATE POLICY "Los usuarios autenticados pueden actualizar su perfil"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Acceso total para service_role" ON public.profiles;
CREATE POLICY "Acceso total para service_role"
ON public.profiles FOR ALL
TO service_role
USING (true);

-- 4. Sincronizar todos los usuarios existentes de auth.users a public.profiles
INSERT INTO public.profiles (id, email, role)
SELECT 
    id, 
    email, 
    COALESCE(
        raw_user_meta_data->>'role', 
        CASE 
            WHEN email ILIKE '%caja%' OR email ILIKE '%cajero%' THEN 'cajero' 
            ELSE 'admin' 
        END
    )
FROM auth.users
ON CONFLICT (id) DO UPDATE 
SET email = EXCLUDED.email;

-- 5. Función y Trigger automático para nuevos usuarios registrados
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
        NEW.raw_user_meta_data->>'role', 
        CASE 
            WHEN NEW.email ILIKE '%caja%' OR NEW.email ILIKE '%cajero%' THEN 'cajero' 
            ELSE 'cajero'
        END
    )
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- COMANDOS RÁPIDOS DE ADMINISTRACIÓN (Ejecútalos cuando quieras cambiar roles)
-- ==============================================================================

-- A) Ver todos los usuarios del sistema y su rol actual:
-- SELECT p.id, p.email, p.role, u.created_at 
-- FROM public.profiles p 
-- JOIN auth.users u ON p.id = u.id 
-- ORDER BY u.created_at ASC;

-- B) Ascender un usuario a Administrador:
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'tu_email@ejemplo.com';

-- C) Configurar un usuario como Cajero:
-- UPDATE public.profiles SET role = 'cajero' WHERE email = 'cajero@distribuidora.com';
