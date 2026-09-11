-- ==============================================================================
-- DISTRIBUIDORA EXPRESS: VACIADO TOTAL DE DATOS PARA PRUEBA DE RESTAURACIÓN
-- ==============================================================================

-- 1. Vaciar tablas de pedidos, kardex e inventario de productos
TRUNCATE TABLE 
  order_items,
  orders,
  stock_movements,
  products
CASCADE;

-- 2. Vaciar tabla de lotes si existe
DO $do$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'product_batches') THEN
    TRUNCATE TABLE product_batches CASCADE;
  END IF;
END $do$;

-- 3. Habilitar política de acceso completo en products para permitir la re-inserción desde el backup
DROP POLICY IF EXISTS "Permitir acceso completo a productos" ON products;
CREATE POLICY "Permitir acceso completo a productos" ON products FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- 4. Habilitar política de acceso completo en orders y order_items para permitir la re-inserción desde el backup
DROP POLICY IF EXISTS "Anyone can insert orders." ON orders;
DROP POLICY IF EXISTS "Admins can view orders." ON orders;
DROP POLICY IF EXISTS "Admins can update orders." ON orders;
DROP POLICY IF EXISTS "Admins can delete orders." ON orders;
DROP POLICY IF EXISTS "Permitir acceso a pedidos" ON orders;
CREATE POLICY "Permitir acceso a pedidos" ON orders FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert order items." ON order_items;
DROP POLICY IF EXISTS "Admins can view order items." ON order_items;
DROP POLICY IF EXISTS "Admins can update order items." ON order_items;
DROP POLICY IF EXISTS "Admins can delete order items." ON order_items;
DROP POLICY IF EXISTS "Permitir acceso a items de pedidos" ON order_items;
CREATE POLICY "Permitir acceso a items de pedidos" ON order_items FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
