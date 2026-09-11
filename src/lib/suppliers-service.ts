/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '@/lib/supabase';
import { Supplier, PurchaseOrder, RestockOrderItem } from '@/lib/pos-types';
import { invalidateProductsCache } from '@/lib/products-cache';

const LOCAL_SUPPLIERS_KEY = 'distribuidora-suppliers';
const LOCAL_PURCHASE_ORDERS_KEY = 'distribuidora-purchase-orders';

// Proveedores modelo argentinos para inicialización y demostración comercial
export const DEFAULT_SUPPLIERS: Supplier[] = [
  {
    id: 'sup-1',
    name: 'Arcor Distribución S.A.',
    cuit: '30-50279317-5',
    contact_name: 'Martín Gómez (Preventista)',
    phone: '5491134567890',
    email: 'pedidos@arcor.com.ar',
    address: 'Av. Juan B. Justo 4500, CABA',
    category: 'Golosinas y Chocolates',
    payment_terms: '15 días contra factura',
    notes: 'Reparto los martes y jueves por la mañana. Pedidos con 48hs de anticipación.',
    created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'sup-2',
    name: 'Molinos Río de la Plata',
    cuit: '30-50085862-8',
    contact_name: 'Valeria Rossi (Ventas Mayoristas)',
    phone: '5491145678901',
    email: 'vrossi@molinos.com.ar',
    address: 'Uruguay 4075, Victoria, Bs.As.',
    category: 'Almacén y Pastas',
    payment_terms: 'Contado contra entrega (3% desc)',
    notes: 'Aceites, fideos y harinas. Bonificación por bultos de más de 20 cajas.',
    created_at: new Date(Date.now() - 45 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'sup-3',
    name: 'Cervecería y Maltería Quilmes',
    cuit: '30-50349479-1',
    contact_name: 'Nicolás Benítez (Logística)',
    phone: '5491156789012',
    email: 'pedidos.quilmes@ab-inbev.com',
    address: '12 de Octubre 100, Quilmes',
    category: 'Bebidas y Cervezas',
    payment_terms: '30 días',
    notes: 'Envases retornables se canjean en cada entrega. Mínimo 10 cajones.',
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'sup-4',
    name: 'Unilever Argentina S.A.',
    cuit: '30-50058863-9',
    contact_name: 'Camila Duarte (Atención Comercios)',
    phone: '5491167890123',
    email: 'distribucion@unilever.com.ar',
    address: 'Fraga 1163, Chacarita, CABA',
    category: 'Limpieza y Perfumería',
    payment_terms: 'Contado / Cheque 20 días',
    notes: 'Líneas Skip, Rexona, Dove y Cif. Lista de precios se actualiza los 1ros de mes.',
    created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'sup-5',
    name: 'Coca-Cola FEMSA Argentina',
    cuit: '30-65478901-2',
    contact_name: 'Gonzalo Fernández (Preventa)',
    phone: '5491178901234',
    email: 'preventa.femsa@coca-cola.com.ar',
    address: 'Av. Amancio Alcorta 3570, Parque Patricios',
    category: 'Gaseosas y Aguas',
    payment_terms: 'Transferencia bancaria previa',
    notes: 'Entregas los lunes, miércoles y viernes. Solicitar heladeras y material POP.',
    created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// Órdenes iniciales de ejemplo
const DEFAULT_PURCHASE_ORDERS: PurchaseOrder[] = [
  {
    id: 'po-1',
    order_number: 'OC-09281',
    supplier_id: 'sup-1',
    supplier_name: 'Arcor Distribución S.A.',
    supplier_phone: '5491134567890',
    status: 'pending',
    items: [
      {
        product_id: 'prod-sample-1',
        product_name: 'Alfajor Bon o Bon Chocolate 40g',
        barcode: '7790580123456',
        current_stock: 3,
        min_stock: 24,
        quantity_suggested: 48,
        quantity_ordered: 48,
        cost_price: 450,
        estimated_subtotal: 21600,
      },
      {
        product_id: 'prod-sample-2',
        product_name: 'Galletitas Maná Vainilla 150g',
        barcode: '7790580987654',
        current_stock: 1,
        min_stock: 15,
        quantity_suggested: 30,
        quantity_ordered: 30,
        cost_price: 620,
        estimated_subtotal: 18600,
      },
    ],
    total_items: 78,
    total_estimated_cost: 40200,
    notes: 'Enviar antes del fin de semana por alta demanda.',
    created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
  {
    id: 'po-2',
    order_number: 'OC-08940',
    supplier_id: 'sup-3',
    supplier_name: 'Cervecería y Maltería Quilmes',
    supplier_phone: '5491156789012',
    status: 'received',
    items: [
      {
        product_id: 'prod-sample-3',
        product_name: 'Cerveza Quilmes Clásica 1L',
        barcode: '7792798000010',
        current_stock: 45,
        min_stock: 20,
        quantity_suggested: 24,
        quantity_ordered: 24,
        cost_price: 1350,
        estimated_subtotal: 32400,
      },
    ],
    total_items: 24,
    total_estimated_cost: 32400,
    notes: 'Ingreso confirmado con remito #4589.',
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    received_at: new Date(Date.now() - 4 * 86400000).toISOString(),
  },
];

// ==========================================
// HELPERS LOCAL STORAGE
// ==========================================
function getLocalSuppliers(): Supplier[] {
  if (typeof window === 'undefined') return DEFAULT_SUPPLIERS;
  try {
    const raw = localStorage.getItem(LOCAL_SUPPLIERS_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_SUPPLIERS_KEY, JSON.stringify(DEFAULT_SUPPLIERS));
      return DEFAULT_SUPPLIERS;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_SUPPLIERS;
  }
}

function setLocalSuppliers(suppliers: Supplier[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_SUPPLIERS_KEY, JSON.stringify(suppliers));
  } catch (e) {
    console.error('Error guardando proveedores locales:', e);
  }
}

function getLocalPurchaseOrders(): PurchaseOrder[] {
  if (typeof window === 'undefined') return DEFAULT_PURCHASE_ORDERS;
  try {
    const raw = localStorage.getItem(LOCAL_PURCHASE_ORDERS_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_PURCHASE_ORDERS_KEY, JSON.stringify(DEFAULT_PURCHASE_ORDERS));
      return DEFAULT_PURCHASE_ORDERS;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_PURCHASE_ORDERS;
  }
}

function setLocalPurchaseOrders(orders: PurchaseOrder[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_PURCHASE_ORDERS_KEY, JSON.stringify(orders));
  } catch (e) {
    console.error('Error guardando órdenes locales:', e);
  }
}

// ==========================================
// GESTIÓN DE PROVEEDORES (CRUD)
// ==========================================
export async function getSuppliers(): Promise<Supplier[]> {
  try {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .order('name', { ascending: true });

    if (!error && Array.isArray(data)) {
      if (data.length > 0) {
        // Sincronizar en localStorage para redundancia
        setLocalSuppliers(data as Supplier[]);
        return data as Supplier[];
      }
      // Base de datos conectada pero vacía: retornar lista vacía legítima
      return [];
    }
  } catch (err) {
    console.warn('[SUPPLIERS] Supabase no disponible o tabla no creada aún, usando localStorage:', err);
  }

  return getLocalSuppliers();
}

export async function saveSupplier(supplierData: Partial<Supplier>): Promise<Supplier> {
  const isNew = !supplierData.id;
  const now = new Date().toISOString();

  const toSave: Supplier = {
    id: supplierData.id || `sup-${Date.now()}`,
    name: supplierData.name || 'Proveedor Sin Nombre',
    cuit: supplierData.cuit || '',
    contact_name: supplierData.contact_name || '',
    phone: supplierData.phone || '',
    email: supplierData.email || '',
    address: supplierData.address || '',
    category: supplierData.category || '',
    payment_terms: supplierData.payment_terms || 'Contado',
    notes: supplierData.notes || '',
    created_at: supplierData.created_at || now,
    updated_at: now,
  };

  try {
    if (isNew) {
      const { data, error } = await supabase
        .from('suppliers')
        .insert([{
          name: toSave.name,
          cuit: toSave.cuit,
          contact_name: toSave.contact_name,
          phone: toSave.phone,
          email: toSave.email,
          address: toSave.address,
          category: toSave.category,
          payment_terms: toSave.payment_terms,
          notes: toSave.notes,
        }])
        .select()
        .single();

      if (!error && data) {
        toSave.id = data.id;
      }
    } else {
      await supabase
        .from('suppliers')
        .update({
          name: toSave.name,
          cuit: toSave.cuit,
          contact_name: toSave.contact_name,
          phone: toSave.phone,
          email: toSave.email,
          address: toSave.address,
          category: toSave.category,
          payment_terms: toSave.payment_terms,
          notes: toSave.notes,
          updated_at: now,
        })
        .eq('id', toSave.id);
    }
  } catch (err) {
    console.warn('[SUPPLIERS] Guardando proveedor únicamente en localStorage:', err);
  }

  // Actualizar localStorage
  const current = getLocalSuppliers();
  const index = current.findIndex(s => s.id === toSave.id);
  if (index >= 0) {
    current[index] = toSave;
  } else {
    current.unshift(toSave);
  }
  setLocalSuppliers(current);

  return toSave;
}

export async function deleteSupplier(id: string): Promise<boolean> {
  try {
    await supabase.from('suppliers').delete().eq('id', id);
  } catch (err) {
    console.warn('[SUPPLIERS] Eliminando proveedor en local:', err);
  }

  const current = getLocalSuppliers();
  const updated = current.filter(s => s.id !== id);
  setLocalSuppliers(updated);
  return true;
}

// ==========================================
// GESTIÓN DE ÓRDENES DE REPOSICIÓN
// ==========================================
export async function getPurchaseOrders(): Promise<PurchaseOrder[]> {
  try {
    const { data, error } = await supabase
      .from('purchase_orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data)) {
      if (data.length > 0) {
        setLocalPurchaseOrders(data as PurchaseOrder[]);
        return data as PurchaseOrder[];
      }
      return [];
    }
  } catch (err) {
    console.warn('[PURCHASE_ORDERS] Supabase no disponible, usando localStorage:', err);
  }

  return getLocalPurchaseOrders();
}

export async function createPurchaseOrder(
  data: Omit<PurchaseOrder, 'id' | 'order_number' | 'created_at'>
): Promise<PurchaseOrder> {
  const orderNumber = `OC-${Math.floor(10000 + Math.random() * 90000)}`;
  const now = new Date().toISOString();

  const newOrder: PurchaseOrder = {
    id: `po-${Date.now()}`,
    order_number: orderNumber,
    supplier_id: data.supplier_id,
    supplier_name: data.supplier_name,
    supplier_phone: data.supplier_phone,
    status: data.status || 'pending',
    items: data.items,
    total_items: data.total_items,
    total_estimated_cost: data.total_estimated_cost,
    notes: data.notes || '',
    created_at: now,
  };

  try {
    const { data: dbData, error } = await supabase
      .from('purchase_orders')
      .insert([{
        order_number: newOrder.order_number,
        supplier_id: newOrder.supplier_id,
        supplier_name: newOrder.supplier_name,
        supplier_phone: newOrder.supplier_phone,
        status: newOrder.status,
        items: newOrder.items,
        total_items: newOrder.total_items,
        total_estimated_cost: newOrder.total_estimated_cost,
        notes: newOrder.notes,
      }])
      .select()
      .single();

    if (!error && dbData) {
      newOrder.id = dbData.id;
    }
  } catch (err) {
    console.warn('[PURCHASE_ORDERS] Guardando orden de compra en local:', err);
  }

  const current = getLocalPurchaseOrders();
  current.unshift(newOrder);
  setLocalPurchaseOrders(current);

  return newOrder;
}

export async function updatePurchaseOrderStatus(
  orderId: string, 
  status: 'pending' | 'received' | 'cancelled'
): Promise<boolean> {
  const now = status === 'received' ? new Date().toISOString() : undefined;

  try {
    await supabase
      .from('purchase_orders')
      .update({ 
        status, 
        ...(now ? { received_at: now } : {}) 
      })
      .eq('id', orderId);
  } catch (err) {
    console.warn('[PURCHASE_ORDERS] Error actualizando estado en Supabase:', err);
  }

  const orders = getLocalPurchaseOrders();
  const idx = orders.findIndex(o => o.id === orderId);
  if (idx >= 0) {
    orders[idx].status = status;
    if (now) orders[idx].received_at = now;
    setLocalPurchaseOrders(orders);
  }

  return true;
}

// ==========================================
// RECEPCIÓN RÁPIDA DE MERCADERÍA (STOCK + COSTOS)
// ==========================================
export interface ReceivedItemPayload {
  product_id: string;
  product_name: string;
  received_quantity: number;
  new_cost_price?: number;
}

export async function receivePurchaseOrder(
  orderId: string,
  receivedItems: ReceivedItemPayload[]
): Promise<{ success: boolean; updatedCount: number; errors: string[] }> {
  // 0. Prevención de Doble Recepción: verificar que la orden no esté ya recibida
  const localOrders = getLocalPurchaseOrders();
  const localOrder = localOrders.find(o => o.id === orderId);
  if (localOrder && localOrder.status === 'received') {
    return {
      success: false,
      updatedCount: 0,
      errors: ['Esta orden ya fue ingresada al inventario previamente. No se permite duplicar la recepción.'],
    };
  }

  try {
    const { data: dbOrder } = await supabase
      .from('purchase_orders')
      .select('status')
      .eq('id', orderId)
      .maybeSingle();

    if (dbOrder && dbOrder.status === 'received') {
      return {
        success: false,
        updatedCount: 0,
        errors: ['La orden ya figura como Recibida en la base de datos.'],
      };
    }
  } catch (err) {
    console.warn('[RECEIVE_STOCK] Error consultando estado previo de la orden:', err);
  }

  let updatedCount = 0;
  const errors: string[] = [];

  for (const item of receivedItems) {
    if (item.received_quantity <= 0) continue;

    try {
      // 1. Obtener producto actual para sumar stock
      const { data: prod, error: fetchErr } = await supabase
        .from('products')
        .select('id, stock, cost_price')
        .eq('id', item.product_id)
        .single();

      if (fetchErr || !prod) {
        console.warn(`[RECEIVE_STOCK] No se encontró producto ${item.product_id} en Supabase:`, fetchErr);
        errors.push(`Producto no encontrado en el catálogo: ${item.product_name}`);
      } else {
        const currentStock = Number(prod.stock || 0);
        const newStock = currentStock + Number(item.received_quantity);

        const updatePayload: any = {
          stock: newStock,
        };

        if (item.new_cost_price !== undefined && item.new_cost_price > 0) {
          updatePayload.cost_price = item.new_cost_price;
        }

        const { error: updateErr } = await supabase
          .from('products')
          .update(updatePayload)
          .eq('id', item.product_id);

        if (updateErr) {
          errors.push(`Error actualizando producto ${item.product_name}: ${updateErr.message}`);
        } else {
          updatedCount++;

          // 2. Kardex: Registrar movimiento en stock_movements (tipo 'restock')
          try {
            await supabase.from('stock_movements').insert([{
              product_id: item.product_id,
              type: 'restock',
              quantity: item.received_quantity,
              previous_stock: currentStock,
              new_stock: newStock,
              reference_id: orderId,
            }]);
          } catch (kardexErr) {
            console.warn(`[RECEIVE_STOCK] No se pudo asentar kardex para ${item.product_name}:`, kardexErr);
          }
        }
      }
    } catch (err: any) {
      errors.push(`Fallo al procesar ${item.product_name}: ${err?.message || 'Error desconocido'}`);
    }
  }

  // 3. Solo marcar como recibida si se actualizó al menos un producto con éxito
  if (updatedCount > 0 || (receivedItems.length === 0 && errors.length === 0)) {
    await updatePurchaseOrderStatus(orderId, 'received');
    // Invalidar caché SWR de productos para que todo el POS y catálogo vea el nuevo inventario y costos
    invalidateProductsCache();

    return {
      success: errors.length === 0,
      updatedCount,
      errors,
    };
  } else {
    return {
      success: false,
      updatedCount: 0,
      errors: errors.length > 0 ? errors : ['No se pudo ingresar ningún producto al inventario.'],
    };
  }
}

// ==========================================
// GENERADOR DE WHATSAPP DIRECTO
// ==========================================
export function generateRestockWhatsAppUrl(
  phone: string,
  supplierName: string,
  items: RestockOrderItem[],
  notes?: string
): string {
  // Limpiar teléfono y asegurar prefijo 549 para números argentinos
  let cleanPhone = phone.replace(/[^0-9]/g, '');
  if (!cleanPhone.startsWith('54') && cleanPhone.length === 10) {
    cleanPhone = `549${cleanPhone}`;
  } else if (cleanPhone.startsWith('54') && !cleanPhone.startsWith('549') && cleanPhone.length === 12) {
    cleanPhone = `549${cleanPhone.slice(2)}`;
  }

  const dateStr = new Date().toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const totalUnits = items.reduce((acc, it) => acc + Number(it.quantity_ordered || 0), 0);
  const totalCost = items.reduce((acc, it) => acc + (Number(it.quantity_ordered || 0) * Number(it.cost_price || 0)), 0);

  const formattedItems = items
    .filter(it => it.quantity_ordered > 0)
    .map((it, idx) => {
      const codePart = it.barcode ? ` [Cód: ${it.barcode}]` : '';
      return `${idx + 1}. *${it.quantity_ordered} u.* - ${it.product_name}${codePart}`;
    })
    .join('\n');

  const message = 
`📦 *PEDIDO DE REPOSICIÓN DE MERCADERÍA*
🏪 *Distribuidora Express*
🏢 *Proveedor:* ${supplierName}
📅 *Fecha:* ${dateStr}
------------------------------------
📋 *DETALLE DE ARTÍCULOS SOLICITADOS:*
${formattedItems}
------------------------------------
📊 *Total de Unidades Solicitadas:* ${totalUnits} u.
💰 *Monto Estimado:* $${totalCost.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
${notes ? `\n📝 *Observaciones / Entrega:* ${notes}\n` : ''}
💬 _Por favor confirmar recepción de la orden, fecha estimada de entrega y disponibilidad de stock. ¡Muchas gracias!_`;

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

// ==========================================
// EXPORTADOR A EXCEL (XLSX)
// ==========================================
export async function exportRestockToExcel(
  supplierName: string,
  orderNumber: string,
  items: RestockOrderItem[],
  notes?: string
): Promise<void> {
  const XLSX = await import('xlsx');
  const dateStr = new Date().toLocaleDateString('es-AR');

  const rows = items.map((it, index) => ({
    '#': index + 1,
    'Código de Barras': it.barcode || 'S/C',
    'Producto': it.product_name,
    'Stock Actual': it.current_stock,
    'Stock Mínimo': it.min_stock ?? 5,
    'Cantidad Pedida': it.quantity_ordered,
    'Último Costo ($)': it.cost_price,
    'Subtotal Estimado ($)': it.quantity_ordered * it.cost_price,
  }));

  const totalUnits = items.reduce((acc, it) => acc + Number(it.quantity_ordered || 0), 0);
  const totalCost = items.reduce((acc, it) => acc + (Number(it.quantity_ordered || 0) * Number(it.cost_price || 0)), 0);

  // Agregar fila de totales
  rows.push({
    '#': '' as any,
    'Código de Barras': '',
    'Producto': 'TOTALES DE LA ORDEN',
    'Stock Actual': '' as any,
    'Stock Mínimo': '' as any,
    'Cantidad Pedida': totalUnits,
    'Último Costo ($)': '' as any,
    'Subtotal Estimado ($)': totalCost,
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Ajustar ancho de columnas
  worksheet['!cols'] = [
    { wch: 5 },   // #
    { wch: 18 },  // Código de barras
    { wch: 38 },  // Producto
    { wch: 14 },  // Stock Actual
    { wch: 14 },  // Stock Mínimo
    { wch: 16 },  // Cantidad Pedida
    { wch: 16 },  // Último Costo
    { wch: 20 },  // Subtotal Estimado
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Orden de Reposición');

  const safeSupplier = supplierName.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `Pedido_${safeSupplier}_${orderNumber}_${dateStr.replace(/\//g, '-')}.xlsx`;

  XLSX.writeFile(workbook, filename);
}
