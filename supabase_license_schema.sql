-- ==========================================================
-- SCHEMA: TABLA DE LICENCIA Y MÓDULOS ACTIVOS DEL ERP (OPCIÓN 1)
-- ==========================================================
-- Esta tabla permite consultar o actualizar remotamente la licencia
-- de una instancia de cliente desde Supabase sin necesidad de redeploy.

CREATE TABLE IF NOT EXISTS public.system_license (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_name TEXT NOT NULL DEFAULT 'Distribuidora Express',
  active_plan TEXT NOT NULL DEFAULT 'enterprise' CHECK (active_plan IN ('basico', 'profesional', 'enterprise', 'custom')),
  active_modules JSONB NOT NULL DEFAULT '["pos", "caja", "clientes", "proveedores", "vencimientos", "etiquetas", "ecommerce", "rentabilidad", "reportes", "backup"]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insertar licencia inicial por defecto (Plan Enterprise activo)
INSERT INTO public.system_license (organization_name, active_plan, active_modules)
VALUES (
  'Distribuidora Express',
  'enterprise',
  '["pos", "caja", "clientes", "proveedores", "vencimientos", "etiquetas", "ecommerce", "rentabilidad", "reportes", "backup"]'::jsonb
)
ON CONFLICT DO NOTHING;

-- Habilitar RLS
ALTER TABLE public.system_license ENABLE ROW LEVEL SECURITY;

-- Política de solo lectura para usuarios autenticados
CREATE POLICY "Usuarios autenticados pueden consultar licencia" 
ON public.system_license 
FOR SELECT 
TO authenticated 
USING (true);

-- Política de actualización solo para administradores
CREATE POLICY "Solo administradores pueden modificar la licencia" 
ON public.system_license 
FOR UPDATE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);
