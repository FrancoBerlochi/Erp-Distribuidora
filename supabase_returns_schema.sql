-- =======================================================
-- ESQUEMA SUPABASE: DEVOLUCIONES, ANULACIONES Y NOTAS DE CRÉDITO
-- =======================================================

-- 1. Tabla de Devoluciones / Notas de Crédito
CREATE TABLE IF NOT EXISTS pos_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  order_code TEXT NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL DEFAULT 'Consumidor Final',
  total_refunded NUMERIC(12, 2) NOT NULL DEFAULT 0,
  refund_method TEXT NOT NULL DEFAULT 'efectivo',
  reason TEXT NOT NULL DEFAULT 'Devolución de mercadería',
  cashier_name TEXT NOT NULL DEFAULT 'Cajero',
  cash_register_id UUID REFERENCES cash_registers(id) ON DELETE SET NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_pos_returns_order_id ON pos_returns(order_id);
CREATE INDEX IF NOT EXISTS idx_pos_returns_customer_id ON pos_returns(customer_id);
CREATE INDEX IF NOT EXISTS idx_pos_returns_created_at ON pos_returns(created_at DESC);

-- 3. Políticas de Seguridad RLS
ALTER TABLE pos_returns ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'pos_returns' AND policyname = 'Allow public read and write on pos_returns'
  ) THEN
    CREATE POLICY "Allow public read and write on pos_returns"
    ON pos_returns FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);
  END IF;
END $$;
