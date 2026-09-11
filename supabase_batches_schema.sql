-- ==============================================================================
-- DISTRIBUIDORA EXPRESS: ESQUEMA DE LOTES Y VENCIMIENTOS (BATCH TRACKING)
-- ==============================================================================

-- 1. Crear tabla de lotes y fechas de vencimiento de productos
CREATE TABLE IF NOT EXISTS product_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  batch_code TEXT NOT NULL,
  expiration_date DATE NOT NULL,
  manufacturing_date DATE,
  initial_quantity INT NOT NULL DEFAULT 1,
  current_quantity INT NOT NULL DEFAULT 1,
  cost_price DECIMAL(10, 2),
  location TEXT,
  supplier_id UUID,
  notes TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'exhausted', 'discarded')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Índices de aceleración para consultas de rotación y semáforo preventivo
CREATE INDEX IF NOT EXISTS idx_product_batches_product ON product_batches(product_id);
CREATE INDEX IF NOT EXISTS idx_product_batches_expiration ON product_batches(expiration_date);
CREATE INDEX IF NOT EXISTS idx_product_batches_status ON product_batches(status);

-- 3. Habilitar Seguridad a Nivel de Fila (Row Level Security - RLS)
ALTER TABLE product_batches ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de acceso (Permitir lectura y gestión completa)
DROP POLICY IF EXISTS "Permitir acceso completo a lotes" ON product_batches;
CREATE POLICY "Permitir acceso completo a lotes" ON product_batches
  FOR ALL USING (true) WITH CHECK (true);

-- 5. Comentario descriptivo en el catálogo de PostgreSQL
COMMENT ON TABLE product_batches IS 'Control de lotes, vencimientos y trazabilidad FEFO para mercadería perecedera de Distribuidora Express';
