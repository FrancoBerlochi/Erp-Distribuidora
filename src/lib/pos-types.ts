export type UserRole = 'admin' | 'cajero';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  pin_code?: string;
  pin_hash?: string;
}

export type PaymentMethod = 'efectivo' | 'tarjeta_posnet' | 'transferencia' | 'qr' | 'cuenta_corriente';

export interface Customer {
  id: string;
  name: string;
  document_type?: string;
  document_number?: string;
  phone?: string;
  email?: string;
  address?: string;
  credit_limit: number;
  current_balance: number;
  status: 'active' | 'blocked';
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CustomerMovement {
  id: string;
  customer_id: string;
  type: 'debt' | 'payment' | 'adjustment';
  amount: number;
  balance_after: number;
  payment_method?: string;
  reference_id?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
}

export interface CashMovement {
  id: string;
  cash_register_id: string;
  type: 'income' | 'expense';
  amount: number;
  reason: string;
  created_at: string;
}

export interface CashRegisterSession {
  id: string;
  user_id?: string;
  user_name: string;
  opened_at: string;
  closed_at?: string | null;
  status: 'open' | 'closed';
  initial_cash: number;
  expected_cash: number;
  actual_cash?: number | null;
  cash_difference?: number | null;
  total_cards: number;
  total_transfers: number;
  total_qr?: number;
  total_credit?: number;
  total_returns_cash?: number;
  total_sales: number;
  cash_breakdown?: Record<string, number>;
  movements?: CashMovement[];
  notes?: string;
}

export interface POSCartItem {
  id: string;
  name: string;
  price: number;
  regular_price: number;
  discount_percentage: number;
  quantity: number;
  stock: number;
  barcode?: string;
  image_url_1?: string;
  category?: string;
  wholesale_price?: number | null;
  wholesale_min_qty?: number | null;
  is_wholesale?: boolean;
  cost_price?: number | null;
  promo_type?: string | null;
  promo_second_unit_discount?: number | null;
  promo_min_qty?: number | null;
  promo_discount_percentage?: number | null;
  promo_discount_amount?: number;
  promo_description?: string | null;
  promo_badge?: { text: string; shortText: string; bgClass: string; textClass: string; borderClass: string; description: string } | null;
}

export interface ARCAInvoice {
  id?: string;
  order_id?: string;
  invoice_type: 'C' | 'B' | 'A';
  point_of_sale: number;
  invoice_number: number;
  cae: string;
  cae_due_date: string;
  customer_doc_type: string;
  customer_doc_number: string;
  customer_name: string;
  total_amount: number;
  qr_data: string;
  status: 'approved' | 'rejected' | 'pending';
  created_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  cuit?: string;
  contact_name?: string;
  phone?: string;
  email?: string;
  address?: string;
  category?: string;
  payment_terms?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface RestockOrderItem {
  product_id: string;
  product_name: string;
  barcode?: string;
  current_stock: number;
  min_stock?: number;
  quantity_suggested: number;
  quantity_ordered: number;
  cost_price: number;
  estimated_subtotal: number;
}

export interface PurchaseOrder {
  id: string;
  order_number: string;
  supplier_id?: string;
  supplier_name: string;
  supplier_phone?: string;
  status: 'pending' | 'received' | 'cancelled';
  items: RestockOrderItem[];
  total_items: number;
  total_estimated_cost: number;
  notes?: string;
  created_at: string;
  received_at?: string;
}
