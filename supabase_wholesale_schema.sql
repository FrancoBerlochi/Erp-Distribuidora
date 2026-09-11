-- ==============================================================================
-- DISTRIBUIDORA EXPRESS: MIGRACIÓN LISTAS DE PRECIOS MAYORISTAS Y POR BULTO
-- ==============================================================================

-- 1. EXTENSIONES EN LA TABLA PRODUCTS (Precio mayorista y cantidad mínima de bulto)
ALTER TABLE products 
  ADD COLUMN IF NOT EXISTS wholesale_price DECIMAL(10, 2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS wholesale_min_qty INT DEFAULT 6;

CREATE INDEX IF NOT EXISTS idx_products_wholesale_price ON products(wholesale_price);
