-- ==============================================================================
-- DISTRIBUIDORA EXPRESS: ESQUEMA COMPLETO DE TABLA PRODUCTS Y POLÍTICAS RLS
-- ==============================================================================
-- Copia y ejecuta este script en el "SQL Editor" de tu panel de Supabase:
-- https://app.supabase.com -> Tu Proyecto -> SQL Editor
--
-- Este script:
-- 1. Crea la tabla 'products' si no existe con todos los campos necesarios.
-- 2. Agrega de forma segura (IF NOT EXISTS) cualquier columna faltante.
-- 3. Habilita los índices para máxima velocidad de consulta.
-- 4. Configura las Políticas RLS (Row Level Security) para que la app pueda
--    leer (SELECT) y escribir (INSERT/UPDATE/DELETE) productos libremente.
-- ==============================================================================

-- 1. Habilitar extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Crear tabla products si no existe
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  stock INT NOT NULL DEFAULT 0,
  discount_percentage INT DEFAULT 0,
  image_url_1 TEXT,
  image_url_2 TEXT,
  category TEXT DEFAULT 'General',
  barcode TEXT UNIQUE,
  cost_price DECIMAL(10, 2) DEFAULT 0.00,
  min_stock INT DEFAULT 5,
  supplier_id UUID,
  supplier_name TEXT,
  wholesale_price DECIMAL(10, 2),
  wholesale_min_qty INT DEFAULT 6,
  promo_type TEXT DEFAULT 'none',
  promo_second_unit_discount DECIMAL(5, 2),
  promo_min_qty INT,
  promo_discount_percentage DECIMAL(5, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Asegurar que todas las columnas existan si la tabla fue creada previamente con columnas reducidas
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS discount_percentage INT DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS image_url_1 TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS image_url_2 TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'General';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS barcode TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10, 2) DEFAULT 0.00;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS min_stock INT DEFAULT 5;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS supplier_id UUID;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS supplier_name TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS wholesale_price DECIMAL(10, 2);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS wholesale_min_qty INT DEFAULT 6;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS promo_type TEXT DEFAULT 'none';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS promo_second_unit_discount DECIMAL(5, 2);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS promo_min_qty INT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS promo_discount_percentage DECIMAL(5, 2);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 4. Crear índices para optimizar rendimiento
CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_stock ON public.products(stock);
CREATE INDEX IF NOT EXISTS idx_products_discount ON public.products(discount_percentage);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON public.products(created_at DESC);

-- 5. Configurar Row Level Security (RLS)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- 6. Política de LECTURA pública (Crucial para traer productos a la tienda, catálogo y dashboard)
DROP POLICY IF EXISTS "Permitir lectura publica a products" ON public.products;
CREATE POLICY "Permitir lectura publica a products"
ON public.products FOR SELECT
TO public
USING (true);

-- 7. Política de ACCESO TOTAL (Permite crear, actualizar y borrar productos desde el ERP)
DROP POLICY IF EXISTS "Permitir acceso completo a productos" ON public.products;
CREATE POLICY "Permitir acceso completo a productos"
ON public.products FOR ALL
TO public
USING (true)
WITH CHECK (true);
