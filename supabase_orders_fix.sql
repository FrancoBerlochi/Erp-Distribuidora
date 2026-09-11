-- ==============================================================================
-- DISTRIBUIDORA EXPRESS: POLÍTICAS DE ACCESO Y RESTRICCIONES DE PEDIDOS
-- ==============================================================================

-- 1. Asegurar columnas de POS en orders
ALTER TABLE orders 
  ADD COLUMN IF NOT EXISTS channel TEXT DEFAULT 'web',
  ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'mercadopago',
  ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS surcharge_amount DECIMAL(10, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS cash_register_id UUID,
  ADD COLUMN IF NOT EXISTS invoice_type TEXT DEFAULT 'ticket_interno';

-- 2. Asegurar que channel acepte tanto 'web', 'online' como 'pos'
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_channel_check;
ALTER TABLE orders ADD CONSTRAINT orders_channel_check CHECK (channel IN ('web', 'online', 'pos'));

-- 2b. Asegurar que status acepte el pipeline completo de estados
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (status IN ('pending', 'preparing', 'ready_pickup', 'in_delivery', 'delivered', 'cancelled', 'accepted'));

-- 3. Eliminar políticas restrictivas previas
DROP POLICY IF EXISTS "Anyone can insert orders." ON orders;
DROP POLICY IF EXISTS "Admins can view orders." ON orders;
DROP POLICY IF EXISTS "Admins can update orders." ON orders;
DROP POLICY IF EXISTS "Admins can delete orders." ON orders;
DROP POLICY IF EXISTS "Permitir acceso a pedidos" ON orders;

DROP POLICY IF EXISTS "Anyone can insert order items." ON order_items;
DROP POLICY IF EXISTS "Admins can view order items." ON order_items;
DROP POLICY IF EXISTS "Admins can update order items." ON order_items;
DROP POLICY IF EXISTS "Admins can delete order items." ON order_items;
DROP POLICY IF EXISTS "Permitir acceso a items de pedidos" ON order_items;

-- 4. Habilitar RLS con acceso completo para lectura, inserción y actualización
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir acceso a pedidos" ON orders 
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Permitir acceso a items de pedidos" ON order_items 
  FOR ALL USING (true) WITH CHECK (true);
