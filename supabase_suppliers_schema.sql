-- ==============================================================================
-- DISTRIBUIDORA EXPRESS: MIGRACIÓN GESTIÓN DE PROVEEDORES Y REPOSICIÓN DE STOCK
-- ==============================================================================

-- 1. TABLA DE PROVEEDORES
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  cuit TEXT DEFAULT NULL,
  contact_name TEXT DEFAULT NULL,
  phone TEXT DEFAULT NULL,
  email TEXT DEFAULT NULL,
  address TEXT DEFAULT NULL,
  category TEXT DEFAULT NULL,
  payment_terms TEXT DEFAULT 'Contado',
  notes TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);
CREATE INDEX IF NOT EXISTS idx_suppliers_cuit ON suppliers(cuit);

-- 2. CAMPOS DE STOCK MÍNIMO Y PROVEEDOR EN PRODUCTOS
ALTER TABLE products 
  ADD COLUMN IF NOT EXISTS min_stock INTEGER DEFAULT 5;

ALTER TABLE products 
  ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL;

ALTER TABLE products 
  ADD COLUMN IF NOT EXISTS supplier_name TEXT DEFAULT NULL;

-- 3. TABLA DE ÓRDENES DE REPOSICIÓN / COMPRA
CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  supplier_name TEXT NOT NULL,
  supplier_phone TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'received', 'cancelled')),
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_items INTEGER DEFAULT 0,
  total_estimated_cost DECIMAL(12, 2) DEFAULT 0.00,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  received_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_id ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_created_at ON purchase_orders(created_at DESC);
