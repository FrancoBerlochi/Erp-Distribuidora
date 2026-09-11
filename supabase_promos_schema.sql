-- ==============================================================================
-- DISTRIBUIDORA EXPRESS: MIGRACIÓN DE PROMOCIONES Y DESCUENTOS POR CANTIDAD
-- ==============================================================================

-- 1. EXTENSIÓN DE COLUMNAS EN PRODUCTS
ALTER TABLE products 
  ADD COLUMN IF NOT EXISTS promo_type TEXT DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS promo_second_unit_discount NUMERIC(5, 2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS promo_min_qty INT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS promo_discount_percentage NUMERIC(5, 2) DEFAULT NULL;

-- 2. ÍNDICE DE CONSULTA PARA OFERTAS Y PROMOCIONES ACTIVAS
CREATE INDEX IF NOT EXISTS idx_products_promo_type ON products(promo_type);
