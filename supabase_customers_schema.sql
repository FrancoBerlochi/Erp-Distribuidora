-- ==============================================================================
-- DISTRIBUIDORA EXPRESS: MIGRACIÓN CUENTAS CORRIENTES Y CLIENTES (FIADO)
-- ==============================================================================

-- 1. TABLA DE CLIENTES
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  document_type TEXT DEFAULT 'DNI',
  document_number TEXT DEFAULT NULL,
  phone TEXT DEFAULT NULL,
  email TEXT DEFAULT NULL,
  address TEXT DEFAULT NULL,
  credit_limit DECIMAL(12, 2) DEFAULT 0.00, -- 0 = sin límite o ilimitado
  current_balance DECIMAL(12, 2) DEFAULT 0.00, -- Saldo adeudado acumulado
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'blocked')),
  notes TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_doc ON customers(document_number);
CREATE INDEX IF NOT EXISTS idx_customers_balance ON customers(current_balance);

-- 2. TABLA DE MOVIMIENTOS DE CUENTA CORRIENTE (LIBRO MAYOR DE FIADO)
CREATE TABLE IF NOT EXISTS customer_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('debt', 'payment', 'adjustment')),
  amount DECIMAL(12, 2) NOT NULL,
  balance_after DECIMAL(12, 2) NOT NULL,
  payment_method TEXT DEFAULT NULL, -- 'efectivo', 'transferencia', 'qr', etc. para pagos
  reference_id TEXT DEFAULT NULL, -- ID de orden POS o ID de recibo de cobro
  notes TEXT DEFAULT NULL,
  created_by TEXT DEFAULT 'Cajero',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_movements_customer_id ON customer_movements(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_movements_created_at ON customer_movements(created_at DESC);

-- 3. VINCULAR ORDENES CON CLIENTE Y HABILITAR MÉTODO CUENTA CORRIENTE
ALTER TABLE orders 
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;

-- Actualizar constraint de payment_method en orders si existe
DO $$ 
BEGIN
  ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;
  ALTER TABLE orders ADD CONSTRAINT orders_payment_method_check 
    CHECK (payment_method IN ('efectivo', 'mercadopago', 'tarjeta_posnet', 'transferencia', 'qr', 'cuenta_corriente'));
EXCEPTION WHEN OTHERS THEN
  -- En caso de que no tenga constraint explícito
  NULL;
END $$;
