-- ==============================================================================
-- DISTRIBUIDORA EXPRESS: MIGRACIÓN PUNTO DE VENTA (POS), CAJA Y CONTROL DE STOCK
-- ==============================================================================

-- 1. EXTENSIONES EN LA TABLA PRODUCTS (Códigos de barra, costos y alertas)
ALTER TABLE products 
  ADD COLUMN IF NOT EXISTS barcode TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS min_stock INT DEFAULT 5;

CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock);
CREATE INDEX IF NOT EXISTS idx_products_discount ON products(discount_percentage);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

-- 2. EXTENSIONES EN LA TABLA ORDERS (Canal de venta y método de pago)
ALTER TABLE orders 
  ADD COLUMN IF NOT EXISTS channel TEXT DEFAULT 'web' CHECK (channel IN ('web', 'pos')),
  ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'mercadopago' CHECK (payment_method IN ('mercadopago', 'efectivo', 'tarjeta_posnet', 'transferencia', 'qr')),
  ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS surcharge_amount DECIMAL(10, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS cash_register_id UUID,
  ADD COLUMN IF NOT EXISTS invoice_type TEXT DEFAULT 'ticket_interno' CHECK (invoice_type IN ('ticket_interno', 'factura_c', 'factura_b', 'factura_a'));

-- 3. TABLA DE SESIONES DE CAJA (Aperturas, arqueos y cierres guiados)
CREATE TABLE IF NOT EXISTS cash_registers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  user_name TEXT NOT NULL DEFAULT 'Cajero',
  opened_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  closed_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  initial_cash DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  expected_cash DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  actual_cash DECIMAL(10, 2),
  cash_difference DECIMAL(10, 2),
  total_cards DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  total_transfers DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  total_sales DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_cash_registers_status ON cash_registers(status);

-- 4. TABLA DE MOVIMIENTOS DE CAJA (Ingresos y egresos manuales)
CREATE TABLE IF NOT EXISTS cash_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cash_register_id UUID NOT NULL REFERENCES cash_registers(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount DECIMAL(10, 2) NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cash_movements_register ON cash_movements(cash_register_id);

-- 5. TABLA DE PERFILES CON ROLES Y PIN RÁPIDO
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY,
  email TEXT,
  full_name TEXT NOT NULL DEFAULT 'Operador',
  role TEXT NOT NULL DEFAULT 'cajero' CHECK (role IN ('admin', 'cajero')),
  pin_code TEXT NOT NULL DEFAULT '1234',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. TABLA DE FACTURAS ARCA (ex AFIP)
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  invoice_type TEXT NOT NULL DEFAULT 'C' CHECK (invoice_type IN ('A', 'B', 'C')),
  point_of_sale INT NOT NULL DEFAULT 1,
  invoice_number INT NOT NULL,
  cae TEXT NOT NULL,
  cae_due_date DATE NOT NULL,
  customer_doc_type TEXT DEFAULT 'DNI',
  customer_doc_number TEXT,
  customer_name TEXT,
  total_amount DECIMAL(10, 2) NOT NULL,
  qr_data TEXT,
  status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('approved', 'rejected', 'pending')),
  afip_raw_response JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_cae ON invoices(cae);
CREATE INDEX IF NOT EXISTS idx_invoices_order ON invoices(order_id);

-- 7. TABLA DE AUDITORÍA DE STOCK (Kardex)
CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('sale_pos', 'sale_web', 'restock', 'manual_adjustment', 'waste')),
  quantity INT NOT NULL,
  previous_stock INT NOT NULL,
  new_stock INT NOT NULL,
  reference_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);

-- 8. POLÍTICAS DE SEGURIDAD (Row Level Security - RLS)
ALTER TABLE cash_registers ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

-- Acceso para usuarios autenticados y anónimos (fallback seguro)
CREATE POLICY "Permitir lectura y escritura de cajas" ON cash_registers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir lectura y escritura de movimientos de caja" ON cash_movements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir lectura y escritura de perfiles" ON profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir lectura y escritura de facturas" ON invoices FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir lectura y escritura de movimientos de stock" ON stock_movements FOR ALL USING (true) WITH CHECK (true);

-- Políticas para Pedidos (Acceso completo Tienda Web + POS Físico + Panel Admin)
DROP POLICY IF EXISTS "Anyone can insert orders." ON orders;
DROP POLICY IF EXISTS "Admins can view orders." ON orders;
DROP POLICY IF EXISTS "Admins can update orders." ON orders;
DROP POLICY IF EXISTS "Anyone can insert order items." ON order_items;
DROP POLICY IF EXISTS "Admins can view order items." ON order_items;
DROP POLICY IF EXISTS "Admins can update order items." ON order_items;
DROP POLICY IF EXISTS "Permitir acceso a pedidos" ON orders;
DROP POLICY IF EXISTS "Permitir acceso a items de pedidos" ON order_items;

CREATE POLICY "Permitir acceso a pedidos" ON orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir acceso a items de pedidos" ON order_items FOR ALL USING (true) WITH CHECK (true);
