-- ==============================================================================
-- DISTRIBUIDORA EXPRESS: TABLA Y POLÍTICAS DE CONFIGURACIÓN DE PORTADA Y BANNERS
-- ==============================================================================

-- 1. CREACIÓN DE LA TABLA LANDING_CONFIG
CREATE TABLE IF NOT EXISTS public.landing_config (
  id TEXT PRIMARY KEY,
  config JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. HABILITAR ROW LEVEL SECURITY (RLS)
ALTER TABLE public.landing_config ENABLE ROW LEVEL SECURITY;

-- 3. ELIMINAR POLÍTICAS PREVIAS PARA EVITAR DUPLICADOS
DROP POLICY IF EXISTS "Permitir lectura publica de landing_config" ON public.landing_config;
DROP POLICY IF EXISTS "Permitir escritura de landing_config" ON public.landing_config;

-- 4. POLÍTICAS DE ACCESO
-- Cualquiera (clientes en la tienda web pública) puede leer los banners y categorías
CREATE POLICY "Permitir lectura publica de landing_config" 
  ON public.landing_config 
  FOR SELECT 
  USING (true);

-- Administradores / personal pueden guardar o actualizar la configuración
CREATE POLICY "Permitir escritura de landing_config" 
  ON public.landing_config 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- 5. SEMBRAR DATOS INICIALES (SI NO EXISTEN)

-- 5.1 Carrusel Principal de Banners ('main')
INSERT INTO public.landing_config (id, config, updated_at)
VALUES (
  'main',
  '{
    "carousel_active": true,
    "show_disclaimer": true,
    "disclaimer_text": "HASTA EL 08/09/2026. PARA MÁS INFORMACIÓN O LIMITACIONES APLICABLES CONSULTE EN SECCIÓN \"SALÓN\". EL CONSUMO EXCESIVO DE ALCOHOL ES PERJUDICIAL PARA LA SALUD. BEBER CON MODERACIÓN. PROHIBIDA SU VENTA A MENORES DE 18 AÑOS. VER LEGALES",
    "autoplay_interval": 5,
    "slides": [
      {
        "id": "slide-1",
        "is_active": true,
        "image_url": "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=1200&q=80",
        "badge_text": "3x2",
        "title": "en vinos finos, espumantes y champañas",
        "link_url": "/ofertas",
        "disclaimer_text": "HASTA EL 08/09/2026. PARA MÁS INFORMACIÓN O LIMITACIONES APLICABLES CONSULTE EN SECCIÓN \"SALÓN\". EL CONSUMO EXCESIVO DE ALCOHOL ES PERJUDICIAL PARA LA SALUD. BEBER CON MODERACIÓN. PROHIBIDA SU VENTA A MENORES DE 18 AÑOS. VER LEGALES"
      },
      {
        "id": "slide-2",
        "is_active": true,
        "image_url": "https://images.unsplash.com/photo-1584813470613-5b1c1cad3d69?auto=format&fit=crop&w=1200&q=80",
        "badge_text": "40% OFF",
        "title": "Especial Limpieza Profesional y Hogar por Mayor",
        "link_url": "/ofertas",
        "disclaimer_text": "VÁLIDO HASTA AGOTAR STOCK DE 500 UNIDADES. DESCUENTO APLICABLE EN EL TOTAL DE LA COMPRA."
      },
      {
        "id": "slide-3",
        "is_active": true,
        "image_url": "https://images.unsplash.com/photo-1621996346565-e3d5d6281691?auto=format&fit=crop&w=1200&q=80",
        "badge_text": "2x1",
        "title": "Descuentos Exclusivos en Almacén y Bebidas",
        "link_url": "/ofertas",
        "disclaimer_text": "PROMOCIÓN VÁLIDA PARA COMPRAS AL POR MAYOR EN PRODUCTOS SELECCIONADOS."
      }
    ]
  }'::jsonb,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- 5.2 Vitrinas de Categorías ('category_showcases')
INSERT INTO public.landing_config (id, config, updated_at)
VALUES (
  'category_showcases',
  '[
    {
      "id": "showcase-1",
      "category": "Bebidas",
      "is_active": true,
      "badge_discount": "15%",
      "badge_tag": "exclusivo online",
      "title": "en seleccionados de bebidas y refrescos",
      "banner_image_url": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=1200&q=80",
      "disclaimer_text": "HASTA EL 07/09/2026. PARA MÁS INFORMACIÓN Y CONDICIONES APLICABLES CONSULTAR EN LEGALES SECCIÓN \"BEBIDAS\". VER LEGALES",
      "discount_percentage": 15
    },
    {
      "id": "showcase-2",
      "category": "Snacks",
      "is_active": true,
      "badge_discount": "20%",
      "badge_tag": "exclusivo online",
      "title": "en toda nuestra línea de snacks y aperitivos",
      "banner_image_url": "https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&w=1200&q=80",
      "disclaimer_text": "HASTA EL 30/09/2026. PROMOCIÓN VÁLIDA EN SNACKS SELECCIONADOS HASTA AGOTAR STOCK. VER LEGALES",
      "discount_percentage": 20
    }
  ]'::jsonb,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- 5.3 Más Vendidos ('best_sellers')
INSERT INTO public.landing_config (id, config, updated_at)
VALUES (
  'best_sellers',
  '{
    "is_active": true,
    "title": "Los Más Vendidos",
    "subtitle": "Descubre los artículos preferidos por nuestros clientes con la mejor calidad y precio",
    "badge_text": "TOP VENTAS",
    "product_ids": []
  }'::jsonb,
  NOW()
)
ON CONFLICT (id) DO NOTHING;
