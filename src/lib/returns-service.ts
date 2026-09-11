/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '@/lib/supabase';
import { invalidateProductsCache } from '@/lib/products-cache';
import { addCashMovement } from '@/lib/pos-service';
import { addCustomerMovement } from '@/lib/customers-service';
import { generateUUID } from './formatters';

export interface POSReturnItem {
  product_id: string;
  product_name: string;
  quantity_returned: number;
  price_at_purchase: number;
  subtotal_returned: number;
}

export interface POSReturn {
  id: string;
  order_id: string;
  order_code: string;
  customer_id?: string;
  customer_name: string;
  total_refunded: number;
  refund_method: 'efectivo' | 'cuenta_corriente' | 'transferencia' | 'otro';
  reason: string;
  cashier_name: string;
  cash_register_id?: string;
  items: POSReturnItem[];
  created_at: string;
}

export interface ExecuteReturnPayload {
  order_id: string;
  order_code: string;
  customer_id?: string;
  customer_name?: string;
  refund_method: 'efectivo' | 'cuenta_corriente' | 'transferencia' | 'otro';
  reason: string;
  cashier_name: string;
  cash_register_id?: string;
  items: {
    product_id: string;
    product_name: string;
    quantity_returned: number;
    price_at_purchase: number;
  }[];
}

const LOCAL_RETURNS_KEY = 'distribuidora_pos_returns';

function getStoredLocalReturns(): POSReturn[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_RETURNS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredLocalReturn(ret: POSReturn): void {
  if (typeof window === 'undefined') return;
  try {
    const list = getStoredLocalReturns();
    list.unshift(ret);
    localStorage.setItem(LOCAL_RETURNS_KEY, JSON.stringify(list));
  } catch {}
}

// Ventas de muestra para demostración comercial inmediata
const DEFAULT_SAMPLE_ORDERS = [
  {
    id: 'ord-sample-1',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    customer_name: 'Kiosco San Cayetano',
    customer_phone: '5491145678901',
    total_amount: 4760,
    status: 'accepted',
    payment_method: 'cuenta_corriente',
    channel: 'pos',
    mp_payment_id: 'POS-CUENTA_CORRIENTE-89EC1D',
    customer_id: 'cust-1',
    items: [
      {
        id: 'it-1',
        product_id: 'prod-lysoform',
        name: 'Desinfectante en Aerosol Lysoform 360ml',
        quantity: 2,
        price: 2380,
      },
    ],
  },
  {
    id: 'ord-sample-2',
    created_at: new Date(Date.now() - 7200000).toISOString(),
    customer_name: 'Consumidor Final',
    customer_phone: '',
    total_amount: 7450,
    status: 'accepted',
    payment_method: 'efectivo',
    channel: 'pos',
    mp_payment_id: 'POS-EFECTIVO-74FA29',
    items: [
      {
        id: 'it-2',
        product_id: 'prod-aceite',
        name: 'Aceite de Girasol Cocinero 1.5L',
        quantity: 1,
        price: 3450,
      },
      {
        id: 'it-3',
        product_id: 'prod-jabon',
        name: 'Jabón Líquido Ala Camellito 3L',
        quantity: 1,
        price: 4000,
      },
    ],
  },
];

/**
 * Buscar pedidos/tickets anteriores para realizar una devolución
 */
export async function searchOrdersForReturn(query: string = ''): Promise<any[]> {
  let ordersList: any[] = [];

  // 1. Intentar buscar en Supabase
  try {
    let q = supabase
      .from('orders')
      .select(`
        id,
        created_at,
        customer_name,
        customer_phone,
        total_amount,
        status,
        payment_method,
        channel,
        mp_payment_id,
        customer_id,
        order_items (
          id,
          product_id,
          quantity,
          price_at_purchase,
          products (
            id,
            name,
            stock,
            barcode,
            image_url_1
          )
        )
      `)
      .order('created_at', { ascending: false })
      .limit(20);

    const cleanQuery = query.trim().replace(/[,()":\\]/g, '');
    if (cleanQuery) {
      // Búsqueda segura por código de ticket o cliente
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanQuery);
      if (isUUID) {
        q = q.or(`id.eq.${cleanQuery},customer_name.ilike.%${cleanQuery}%,mp_payment_id.ilike.%${cleanQuery}%`);
      } else {
        q = q.or(`customer_name.ilike.%${cleanQuery}%,mp_payment_id.ilike.%${cleanQuery}%`);
      }
    }

    const { data, error } = await q;

    if (!error && data && data.length > 0) {
      ordersList = data.map((order: any) => {
        const orderCode = (order.mp_payment_id || order.id || '').slice(-6).toUpperCase();
        return {
          ...order,
          order_code: orderCode,
          items: (order.order_items || []).map((oi: any) => ({
            id: oi.id,
            product_id: oi.product_id,
            name: oi.products?.name || 'Producto',
            quantity: oi.quantity,
            price: Number(oi.price_at_purchase) || 0,
            image_url_1: oi.products?.image_url_1,
            barcode: oi.products?.barcode,
            current_stock: oi.products?.stock || 0,
          })),
        };
      });
    }
  } catch (err) {
    console.warn('Error buscando órdenes en Supabase:', err);
  }

  // 2. Fusionar con órdenes locales almacenadas
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('distribuidora_pos_orders');
      if (raw) {
        const localList: any[] = JSON.parse(raw);
        localList.forEach((lo) => {
          if (!ordersList.some((o) => o.id === lo.id)) {
            ordersList.unshift({
              ...lo,
              order_code: (lo.mp_payment_id || lo.id || '').slice(-6).toUpperCase(),
            });
          }
        });
      }
    } catch {}
  }

  // 3. Si no hay ninguna orden aún, usar ejemplos de muestra
  if (ordersList.length === 0) {
    ordersList = DEFAULT_SAMPLE_ORDERS.map((o) => ({
      ...o,
      order_code: (o.mp_payment_id || o.id || '').slice(-6).toUpperCase(),
    }));
  }

  // 4. Filtrar por término de búsqueda si se proveyó
  if (query.trim()) {
    const q = query.trim().toLowerCase();
    return ordersList.filter(
      (o) =>
        o.order_code?.toLowerCase().includes(q) ||
        o.customer_name?.toLowerCase().includes(q) ||
        o.mp_payment_id?.toLowerCase().includes(q) ||
        o.id?.toLowerCase().includes(q)
    );
  }

  return ordersList;
}

/**
 * Ejecutar una Devolución / Nota de Crédito
 */
export async function executePOSReturn(payload: ExecuteReturnPayload): Promise<POSReturn> {
  const returnId = generateUUID('ret');

  const returnItems: POSReturnItem[] = payload.items
    .filter((it) => it.quantity_returned > 0)
    .map((it) => ({
      product_id: it.product_id,
      product_name: it.product_name,
      quantity_returned: it.quantity_returned,
      price_at_purchase: it.price_at_purchase,
      subtotal_returned: it.quantity_returned * it.price_at_purchase,
    }));

  if (returnItems.length === 0) {
    throw new Error('Debe seleccionar al menos un producto y cantidad a devolver.');
  }

  const totalRefunded = returnItems.reduce((acc, it) => acc + it.subtotal_returned, 0);

  const posReturn: POSReturn = {
    id: returnId,
    order_id: payload.order_id,
    order_code: payload.order_code,
    customer_id: payload.customer_id,
    customer_name: payload.customer_name || 'Consumidor Final',
    total_refunded: totalRefunded,
    refund_method: payload.refund_method,
    reason: payload.reason || 'Devolución de mercadería',
    cashier_name: payload.cashier_name || 'Cajero',
    cash_register_id: payload.cash_register_id,
    items: returnItems,
    created_at: new Date().toISOString(),
  };

  // 1. Reincorporar stock en productos y registrar en stock_movements
  for (const it of returnItems) {
    try {
      // Obtener stock actual
      const { data: prod } = await supabase
        .from('products')
        .select('stock')
        .eq('id', it.product_id)
        .single();

      if (prod) {
        const currentStock = Number(prod.stock) || 0;
        const newStock = currentStock + it.quantity_returned;

        await supabase
          .from('products')
          .update({ stock: newStock })
          .eq('id', it.product_id);

        await supabase.from('stock_movements').insert([{
          product_id: it.product_id,
          type: 'return_pos',
          quantity: it.quantity_returned,
          previous_stock: currentStock,
          new_stock: newStock,
          reference_id: returnId,
        }]);
      }
    } catch (err) {
      console.warn(`Error reincorporando stock de ${it.product_name}:`, err);
    }
  }

  // 2. Impacto Financiero en Caja Diaria si se reembolsa en Efectivo
  if (payload.refund_method === 'efectivo' && payload.cash_register_id) {
    try {
      await addCashMovement(
        payload.cash_register_id,
        'expense',
        totalRefunded,
        `Devolución / Nota de Crédito Ticket #${payload.order_code} (${payload.reason})`
      );
    } catch (err) {
      console.warn('Error registrando egreso en caja:', err);
    }
  }

  // 3. Impacto en Cuenta Corriente si se reembolsa a la cuenta del Cliente (Fiado)
  if (payload.refund_method === 'cuenta_corriente' && payload.customer_id) {
    try {
      await addCustomerMovement({
        customer_id: payload.customer_id,
        type: 'payment', // Reduce el saldo deudor del cliente
        amount: totalRefunded,
        payment_method: 'cuenta_corriente',
        reference_id: returnId,
        notes: `Nota de Crédito por Devolución Ticket #${payload.order_code} (${payload.reason})`,
        created_by: payload.cashier_name,
      });
    } catch (err) {
      console.warn('Error acreditando a cuenta corriente:', err);
    }
  }

  // 4. Guardar registro de devolución en Supabase
  try {
    await supabase.from('pos_returns').insert([{
      id: posReturn.id,
      order_id: posReturn.order_id,
      order_code: posReturn.order_code,
      customer_id: posReturn.customer_id || null,
      customer_name: posReturn.customer_name,
      total_refunded: posReturn.total_refunded,
      refund_method: posReturn.refund_method,
      reason: posReturn.reason,
      cashier_name: posReturn.cashier_name,
      cash_register_id: posReturn.cash_register_id || null,
      items: posReturn.items,
      created_at: posReturn.created_at,
    }]);
  } catch (err) {
    console.warn('Fallo guardando pos_returns en Supabase, guardando local:', err);
  }

  // 5. Persistir localmente
  saveStoredLocalReturn(posReturn);

  // 6. Refrescar caché del catálogo para sincronizar stock en tiempo real
  invalidateProductsCache();

  return posReturn;
}

/**
 * Obtener historial de devoluciones
 */
export async function getPOSReturns(orderId?: string): Promise<POSReturn[]> {
  try {
    let q = supabase
      .from('pos_returns')
      .select('*')
      .order('created_at', { ascending: false });

    if (orderId) {
      q = q.eq('order_id', orderId);
    }

    const { data, error } = await q;
    if (!error && data && data.length > 0) {
      return data;
    }
  } catch {}

  const local = getStoredLocalReturns();
  if (orderId) {
    return local.filter((r) => r.order_id === orderId);
  }
  return local;
}
