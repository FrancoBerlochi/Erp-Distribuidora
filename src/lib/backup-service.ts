/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { supabase } from './supabase';
import { getSavedCache, CACHE_KEYS, invalidateProductsCache } from './products-cache';

export interface BackupMetadata {
  total_products: number;
  total_customers: number;
  total_suppliers: number;
  total_orders: number;
  total_returns: number;
  total_cash_sessions: number;
  total_stock_value: number;
  total_customer_debt: number;
}

export interface DistribuidoraBackupPayload {
  version: '1.0';
  app_name: 'Distribuidora Express';
  timestamp: string;
  metadata: BackupMetadata;
  data: {
    products: any[];
    customers: any[];
    customer_movements: any[];
    suppliers: any[];
    purchase_orders: any[];
    orders: any[];
    returns: any[];
    cash_registers: any[];
    pos_users?: any[];
  };
}

export interface LastBackupInfo {
  timestamp: string;
  filename: string;
  sizeBytes: number;
  metadata: BackupMetadata;
  daysAgo: number;
  status: 'healthy' | 'warning' | 'never';
}

export interface RestoreResult {
  success: boolean;
  message: string;
  stats: {
    products: number;
    customers: number;
    suppliers: number;
    orders: number;
    returns: number;
  };
  errors: string[];
}

const STORAGE_KEYS = {
  LAST_BACKUP: 'distribuidora_last_backup_info',
  CUSTOMERS: 'distribuidora-customers',
  CUSTOMER_MOVEMENTS: 'distribuidora-customer-movements',
  SUPPLIERS: 'distribuidora-suppliers',
  PURCHASE_ORDERS: 'distribuidora-purchase-orders',
  POS_ORDERS: 'distribuidora_pos_orders',
  POS_RETURNS: 'distribuidora_pos_returns',
  ACTIVE_CASH: 'distribuidora_active_cash_register',
  CASH_HISTORY: 'distribuidora_cash_registers_history',
  POS_USERS: 'distribuidora_pos_users',
};

/**
 * Recopila todos los datos comerciales del sistema (Supabase + LocalStorage)
 */
export async function fetchFullCommercialData(): Promise<DistribuidoraBackupPayload['data']> {
  // 1. Productos (Supabase con fallback a caché local)
  let products: any[] = [];
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('name', { ascending: true });
    if (!error && data && data.length > 0) {
      products = data;
    } else {
      products = getSavedCache(CACHE_KEYS.ALL_PRODUCTS) || [];
    }
  } catch {
    products = getSavedCache(CACHE_KEYS.ALL_PRODUCTS) || [];
  }

  // 2. Clientes y Movimientos de Fiado
  let customers: any[] = [];
  let customer_movements: any[] = [];
  try {
    const localCust = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
    if (localCust) customers = JSON.parse(localCust);
    const localMovs = localStorage.getItem(STORAGE_KEYS.CUSTOMER_MOVEMENTS);
    if (localMovs) customer_movements = JSON.parse(localMovs);
  } catch {}

  // 3. Proveedores y Órdenes de Reposición
  let suppliers: any[] = [];
  let purchase_orders: any[] = [];
  try {
    const localSup = localStorage.getItem(STORAGE_KEYS.SUPPLIERS);
    if (localSup) suppliers = JSON.parse(localSup);
    const localPO = localStorage.getItem(STORAGE_KEYS.PURCHASE_ORDERS);
    if (localPO) purchase_orders = JSON.parse(localPO);
  } catch {}

  // 4. Ventas y Comprobantes POS
  let orders: any[] = [];
  try {
    const localOrders = localStorage.getItem(STORAGE_KEYS.POS_ORDERS);
    if (localOrders) orders = JSON.parse(localOrders);

    // Complementar con órdenes de Supabase si existen
    const { data: cloudOrders } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (cloudOrders && cloudOrders.length > 0) {
      const existingIds = new Set(orders.map((o) => o.id));
      for (const co of cloudOrders) {
        if (!existingIds.has(co.id)) {
          orders.push(co);
        }
      }
    }
  } catch {}

  // 5. Devoluciones y Notas de Crédito
  let returns: any[] = [];
  try {
    const localReturns = localStorage.getItem(STORAGE_KEYS.POS_RETURNS);
    if (localReturns) returns = JSON.parse(localReturns);
  } catch {}

  // 6. Arqueos de Caja y Turnos
  let cash_registers: any[] = [];
  try {
    const activeCash = localStorage.getItem(STORAGE_KEYS.ACTIVE_CASH);
    if (activeCash) cash_registers.push(JSON.parse(activeCash));
    const historyCash = localStorage.getItem(STORAGE_KEYS.CASH_HISTORY);
    if (historyCash) {
      const list = JSON.parse(historyCash);
      if (Array.isArray(list)) cash_registers.push(...list);
    }
  } catch {}

  // 7. Usuarios del POS
  let pos_users: any[] = [];
  try {
    const users = localStorage.getItem(STORAGE_KEYS.POS_USERS);
    if (users) pos_users = JSON.parse(users);
  } catch {}

  return {
    products,
    customers,
    customer_movements,
    suppliers,
    purchase_orders,
    orders,
    returns,
    cash_registers,
    pos_users,
  };
}

/**
 * Calcula metadatos y totales económicos del backup
 */
function computeMetadata(data: DistribuidoraBackupPayload['data']): BackupMetadata {
  const total_stock_value = data.products.reduce((sum, p) => {
    const cost = Number(p.cost_price) || Number(p.price) * 0.7 || 0;
    const stock = Number(p.stock) || 0;
    return sum + (stock > 0 ? cost * stock : 0);
  }, 0);

  const total_customer_debt = data.customers.reduce((sum, c) => {
    const bal = Number(c.current_balance) || 0;
    return sum + (bal > 0 ? bal : 0);
  }, 0);

  return {
    total_products: data.products.length,
    total_customers: data.customers.length,
    total_suppliers: data.suppliers.length,
    total_orders: data.orders.length,
    total_returns: data.returns.length,
    total_cash_sessions: data.cash_registers.length,
    total_stock_value: Math.round(total_stock_value),
    total_customer_debt: Math.round(total_customer_debt),
  };
}

/**
 * 1. EXPORTACIÓN COMPLETA EN JSON (.json)
 * Genera y descarga el archivo de respaldo maestro del negocio
 */
export async function exportFullBackupJSON(): Promise<DistribuidoraBackupPayload> {
  const data = await fetchFullCommercialData();
  const metadata = computeMetadata(data);
  const now = new Date();

  const payload: DistribuidoraBackupPayload = {
    version: '1.0',
    app_name: 'Distribuidora Express',
    timestamp: now.toISOString(),
    metadata,
    data,
  };

  const jsonString = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const dateStr = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `backup_distribuidora_${dateStr}.json`;

  // Disparar descarga en navegador
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);

  // Registrar último respaldo
  saveLastBackupInfo(filename, blob.size, metadata);

  return payload;
}

/**
 * 2. MEGA-PLANILLA DE AUDITORÍA CONTABLE EN EXCEL (.xlsx Multi-Hoja)
 * Genera un único libro con 6 hojas independientes
 */
export async function exportAuditMasterExcel(): Promise<void> {
  const data = await fetchFullCommercialData();
  const metadata = computeMetadata(data);
  const now = new Date();
  const dateFormatted = now.toLocaleDateString('es-AR') + ' ' + now.toLocaleTimeString('es-AR');

  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  // Hoja 1: Resumen de Auditoría General
  const auditSummary = [
    ['AUDITORÍA Y BALANCE GENERAL - DISTRIBUIDORA EXPRESS'],
    ['Fecha de Emisión:', dateFormatted],
    ['Versión del Sistema:', '2.0 Producción'],
    [],
    ['INDICADOR DE NEGOCIO', 'CANTIDAD / VALOR'],
    ['Total de Productos en Catálogo', metadata.total_products],
    ['Capital Inmovilizado en Stock (Costo Reposición)', `$${metadata.total_stock_value.toLocaleString('es-AR')}`],
    ['Cartera de Clientes Registrados', metadata.total_customers],
    ['Deuda Total a Cobrar (Saldos Fiados)', `$${metadata.total_customer_debt.toLocaleString('es-AR')}`],
    ['Proveedores Comerciales Activos', metadata.total_suppliers],
    ['Historial de Ventas / Tickets Registrados', metadata.total_orders],
    ['Comprobantes de Devolución / Notas de Crédito', metadata.total_returns],
    ['Arqueos y Cierres de Caja Guardados', metadata.total_cash_sessions],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(auditSummary);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen General');

  // Hoja 2: Inventario y Precios
  const inventoryRows = data.products.map((p) => ({
    'ID Sistema': p.id,
    'Código de Barras / EAN': p.barcode || 'S/C',
    'Nombre del Producto': p.name,
    'Categoría': p.category || 'General',
    'Stock Actual': p.stock || 0,
    'Stock Mínimo': p.min_stock || 0,
    'Costo de Reposición': p.cost_price || 0,
    'Precio Venta Minorista': p.price || 0,
    'Precio Mayorista': p.wholesale_price || '',
    'Mínimo Mayorista': p.wholesale_min_qty || '',
    'Proveedor Habitual': p.supplier_name || '',
    'Promoción Activa': p.promo_type || 'Ninguna',
  }));
  const wsInventory = XLSX.utils.json_to_sheet(inventoryRows);
  XLSX.utils.book_append_sheet(wb, wsInventory, 'Inventario y Precios');

  // Hoja 3: Clientes y Saldos Fiados
  const customersRows = data.customers.map((c) => ({
    'ID Cliente': c.id,
    'Nombre o Razón Social': c.name,
    'Tipo Documento': c.document_type || 'DNI',
    'Número Documento': c.document_number || '',
    'Teléfono': c.phone || '',
    'Dirección': c.address || '',
    'Email': c.email || '',
    'Límite de Crédito': c.credit_limit || 0,
    'Saldo Actual (Deuda)': c.current_balance || 0,
    'Estado': c.status || 'active',
    'Observaciones': c.notes || '',
  }));
  const wsCustomers = XLSX.utils.json_to_sheet(customersRows);
  XLSX.utils.book_append_sheet(wb, wsCustomers, 'Clientes y Cuentas Ctes');

  // Hoja 4: Proveedores
  const suppliersRows = data.suppliers.map((s) => ({
    'ID Proveedor': s.id,
    'Empresa': s.name,
    'CUIT': s.cuit || '',
    'Contacto Preventista': s.contact_name || '',
    'Teléfono': s.phone || '',
    'Email': s.email || '',
    'Dirección': s.address || '',
    'Rubro': s.category || '',
    'Plazo de Pago': s.payment_terms || '',
    'Notas': s.notes || '',
  }));
  const wsSuppliers = XLSX.utils.json_to_sheet(suppliersRows);
  XLSX.utils.book_append_sheet(wb, wsSuppliers, 'Proveedores');

  // Hoja 5: Historial de Ventas POS
  const salesRows = data.orders.map((o) => ({
    'ID Comprobante': o.id,
    'Fecha y Hora': o.created_at || '',
    'Cliente': o.customer_name || 'Consumidor Final',
    'Total ($)': o.total || o.final_total || 0,
    'Medio de Pago': o.payment_method || 'efectivo',
    'Estado': o.status || 'completed',
    'Cantidad de Artículos': Array.isArray(o.items) ? o.items.length : 0,
  }));
  const wsSales = XLSX.utils.json_to_sheet(salesRows);
  XLSX.utils.book_append_sheet(wb, wsSales, 'Historial de Ventas');

  // Hoja 6: Devoluciones y Cambios
  const returnsRows = data.returns.map((r) => ({
    'ID Devolución': r.id,
    'Fecha': r.created_at || '',
    'Ticket Original': r.order_code || r.order_id || '',
    'Cliente': r.customer_name || 'Consumidor Final',
    'Monto Reintegrado ($)': r.total_refunded || 0,
    'Método de Reintegro': r.refund_method || 'efectivo',
    'Motivo': r.reason || '',
    'Cajero': r.cashier_name || 'Admin',
  }));
  const wsReturns = XLSX.utils.json_to_sheet(returnsRows);
  XLSX.utils.book_append_sheet(wb, wsReturns, 'Devoluciones');

  const fileName = `Auditoria_Comercial_Completa_${now.toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * 3. EXPORTACIÓN RÁPIDA POR MÓDULO (1 Clic)
 */
export async function exportModuleData(
  module: 'products' | 'customers' | 'suppliers' | 'orders',
  format: 'xlsx' | 'csv' = 'xlsx'
): Promise<void> {
  const data = await fetchFullCommercialData();
  const dateStr = new Date().toISOString().split('T')[0];
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  let rows: any[] = [];
  let sheetName = '';
  let filename = '';

  switch (module) {
    case 'products':
      rows = data.products.map((p) => ({
        'Código': p.barcode || p.id,
        'Nombre': p.name,
        'Categoría': p.category || '',
        'Stock': p.stock || 0,
        'Stock Mínimo': p.min_stock || 0,
        'Costo': p.cost_price || 0,
        'Precio Venta': p.price || 0,
        'Precio Mayorista': p.wholesale_price || '',
        'Mín. Mayorista': p.wholesale_min_qty || '',
        'Proveedor': p.supplier_name || '',
      }));
      sheetName = 'Productos';
      filename = `Catalogo_Productos_${dateStr}.${format}`;
      break;

    case 'customers':
      rows = data.customers.map((c) => ({
        'Nombre': c.name,
        'Documento': `${c.document_type || 'DNI'} ${c.document_number || ''}`,
        'Teléfono': c.phone || '',
        'Dirección': c.address || '',
        'Límite Crédito': c.credit_limit || 0,
        'Saldo Deuda': c.current_balance || 0,
        'Estado': c.status || 'active',
      }));
      sheetName = 'Clientes';
      filename = `Cartera_Clientes_Fiados_${dateStr}.${format}`;
      break;

    case 'suppliers':
      rows = data.suppliers.map((s) => ({
        'Empresa': s.name,
        'CUIT': s.cuit || '',
        'Contacto': s.contact_name || '',
        'Teléfono': s.phone || '',
        'Email': s.email || '',
        'Condiciones': s.payment_terms || '',
      }));
      sheetName = 'Proveedores';
      filename = `Directorio_Proveedores_${dateStr}.${format}`;
      break;

    case 'orders':
      rows = data.orders.map((o) => ({
        'ID Venta': o.id,
        'Fecha': o.created_at || '',
        'Cliente': o.customer_name || 'Consumidor Final',
        'Total': o.total || o.final_total || 0,
        'Medio de Pago': o.payment_method || 'efectivo',
      }));
      sheetName = 'Ventas';
      filename = `Ventas_Comprobantes_${dateStr}.${format}`;
      break;
  }

  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, filename, { bookType: format });
}

/**
 * 4. VALIDACIÓN DE ARCHIVO DE RESPALDO JSON ANTES DE RESTAURAR
 */
export function validateBackupJSON(jsonText: string): {
  valid: boolean;
  payload?: DistribuidoraBackupPayload;
  error?: string;
} {
  try {
    const parsed = JSON.parse(jsonText);
    if (!parsed || typeof parsed !== 'object') {
      return { valid: false, error: 'El archivo seleccionado no es un objeto JSON válido.' };
    }
    if (parsed.version !== '1.0' || !parsed.data) {
      return {
        valid: false,
        error: 'El archivo no corresponde al formato de respaldo oficial de Distribuidora Express.',
      };
    }
    return { valid: true, payload: parsed as DistribuidoraBackupPayload };
  } catch (err: any) {
    return { valid: false, error: `Error de sintaxis JSON: ${err.message}` };
  }
}

/**
 * 5. RESTAURACIÓN DE CONTINGENCIA
 * Restaura o fusiona los datos del backup en LocalStorage y Supabase
 */
export async function restoreBackupFromJSON(
  payload: DistribuidoraBackupPayload,
  mode: 'upsert' | 'skip_existing' = 'upsert'
): Promise<RestoreResult> {
  const stats = {
    products: 0,
    customers: 0,
    suppliers: 0,
    orders: 0,
    returns: 0,
  };
  const errors: string[] = [];

  try {
    // 1. Restaurar Clientes
    if (Array.isArray(payload.data.customers) && payload.data.customers.length > 0) {
      const current = JSON.parse(localStorage.getItem(STORAGE_KEYS.CUSTOMERS) || '[]');
      const currentMap = new Map(current.map((c: any) => [c.id, c]));

      for (const c of payload.data.customers) {
        if (!currentMap.has(c.id) || mode === 'upsert') {
          currentMap.set(c.id, c);
          stats.customers++;
        }
      }
      localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(Array.from(currentMap.values())));

      // Restaurar movimientos de fiado
      if (Array.isArray(payload.data.customer_movements)) {
        localStorage.setItem(
          STORAGE_KEYS.CUSTOMER_MOVEMENTS,
          JSON.stringify(payload.data.customer_movements)
        );
      }
    }

    // 2. Restaurar Proveedores
    if (Array.isArray(payload.data.suppliers) && payload.data.suppliers.length > 0) {
      const current = JSON.parse(localStorage.getItem(STORAGE_KEYS.SUPPLIERS) || '[]');
      const currentMap = new Map(current.map((s: any) => [s.id, s]));

      for (const s of payload.data.suppliers) {
        if (!currentMap.has(s.id) || mode === 'upsert') {
          currentMap.set(s.id, s);
          stats.suppliers++;
        }
      }
      localStorage.setItem(STORAGE_KEYS.SUPPLIERS, JSON.stringify(Array.from(currentMap.values())));

      if (Array.isArray(payload.data.purchase_orders)) {
        localStorage.setItem(
          STORAGE_KEYS.PURCHASE_ORDERS,
          JSON.stringify(payload.data.purchase_orders)
        );
      }
    }

    // 3. Restaurar Ventas POS
    if (Array.isArray(payload.data.orders) && payload.data.orders.length > 0) {
      const current = JSON.parse(localStorage.getItem(STORAGE_KEYS.POS_ORDERS) || '[]');
      const currentMap = new Map(current.map((o: any) => [o.id, o]));

      for (const o of payload.data.orders) {
        if (!currentMap.has(o.id) || mode === 'upsert') {
          currentMap.set(o.id, o);
          stats.orders++;
        }
      }
      localStorage.setItem(STORAGE_KEYS.POS_ORDERS, JSON.stringify(Array.from(currentMap.values())));

      // Sincronizar también en la tabla 'orders' de Supabase
      try {
        const cleanOrders = payload.data.orders.map((o) => ({
          id: o.id,
          customer_name: o.customer_name || 'Consumidor Final',
          customer_email: o.customer_email || 'cliente@distribuidora.com',
          customer_phone: o.customer_phone || '',
          shipping_address: o.shipping_address || (o.channel === 'pos' ? 'Venta en Mostrador POS' : 'Retiro en Sucursal'),
          total_amount: Number(o.total_amount ?? o.total ?? o.final_total ?? 0),
          status: o.status || 'pending',
          channel: o.channel === 'pos' ? 'pos' : 'web',
          payment_method: o.payment_method || 'efectivo',
          discount_amount: Number(o.discount_amount) || 0,
          surcharge_amount: Number(o.surcharge_amount) || 0,
          cash_register_id: o.cash_register_id || null,
          invoice_type: o.invoice_type || 'ticket_interno',
          mp_payment_id: o.mp_payment_id || `ORD-${(o.id || '').slice(-6)}`,
          created_at: o.created_at || new Date().toISOString(),
        }));

        await supabase
          .from('orders')
          .upsert(cleanOrders, { onConflict: 'id' });

        // Si hay items embebidos, sincronizar en order_items
        for (const o of payload.data.orders) {
          if (Array.isArray(o.items) && o.items.length > 0) {
            const cleanItems = o.items.map((it: any) => ({
              order_id: o.id,
              product_id: it.product_id || it.id,
              quantity: Number(it.quantity) || 1,
              price_at_purchase: Number(it.price || it.price_at_purchase) || 0,
            }));
            await supabase.from('order_items').upsert(cleanItems).select().maybeSingle();
          }
        }
      } catch (cloudOrdersErr) {
        console.warn('[BACKUP_RESTORE] Aviso sincronizando pedidos en Supabase:', cloudOrdersErr);
      }
    }

    // 4. Restaurar Devoluciones
    if (Array.isArray(payload.data.returns) && payload.data.returns.length > 0) {
      const current = JSON.parse(localStorage.getItem(STORAGE_KEYS.POS_RETURNS) || '[]');
      const currentMap = new Map(current.map((r: any) => [r.id, r]));

      for (const r of payload.data.returns) {
        if (!currentMap.has(r.id) || mode === 'upsert') {
          currentMap.set(r.id, r);
          stats.returns++;
        }
      }
      localStorage.setItem(STORAGE_KEYS.POS_RETURNS, JSON.stringify(Array.from(currentMap.values())));
    }

    // 5. Restaurar Productos en Caché y Supabase
    if (Array.isArray(payload.data.products) && payload.data.products.length > 0) {
      stats.products = payload.data.products.length;

      // Actualizar en caché local
      localStorage.setItem(
        CACHE_KEYS.ALL_PRODUCTS,
        JSON.stringify({ data: payload.data.products, timestamp: Date.now() })
      );

      // Intentar sincronización con Supabase
      try {
        const cleanProducts = payload.data.products.map((p) => {
          const item: any = {
            id: p.id,
            name: p.name,
            price: Number(p.price) || 0,
            stock: Number(p.stock) || 0,
            cost_price: p.cost_price != null ? Number(p.cost_price) : null,
            barcode: p.barcode || null,
            category: p.category || 'General',
            min_stock: p.min_stock != null ? Number(p.min_stock) : 0,
          };
          if (p.wholesale_price != null) item.wholesale_price = Number(p.wholesale_price);
          if (p.wholesale_min_qty != null) item.wholesale_min_qty = Number(p.wholesale_min_qty);
          if (p.supplier_name) item.supplier_name = p.supplier_name;
          if (p.discount_percentage != null) item.discount_percentage = Number(p.discount_percentage);
          if (p.description) item.description = p.description;
          if (p.image_url_1) item.image_url_1 = p.image_url_1;
          if (p.image_url_2) item.image_url_2 = p.image_url_2;
          return item;
        });

        let { error } = await supabase
          .from('products')
          .upsert(cleanProducts, { onConflict: 'id' });

        // Si falla por columna faltante en Supabase (ej: supplier_name no migrada), reintentar con columnas estándar
        if (error && (error.code === '42703' || (error.message && (error.message.includes('column') || error.message.includes('schema cache'))))) {
          console.warn('[BACKUP_RESTORE] Aviso de esquema en Supabase, reintentando con columnas estándar:', error.message);
          const safeProducts = payload.data.products.map((p) => ({
            id: p.id,
            name: p.name,
            price: Number(p.price) || 0,
            stock: Number(p.stock) || 0,
            cost_price: p.cost_price != null ? Number(p.cost_price) : null,
            barcode: p.barcode || null,
            category: p.category || 'General',
            min_stock: p.min_stock != null ? Number(p.min_stock) : 0,
            wholesale_price: p.wholesale_price != null ? Number(p.wholesale_price) : null,
            wholesale_min_qty: p.wholesale_min_qty != null ? Number(p.wholesale_min_qty) : null,
            discount_percentage: p.discount_percentage != null ? Number(p.discount_percentage) : 0,
            description: p.description || null,
            image_url_1: p.image_url_1 || null,
            image_url_2: p.image_url_2 || null,
          }));

          const retryRes = await supabase
            .from('products')
            .upsert(safeProducts, { onConflict: 'id' });

          error = retryRes.error;
        }

        if (error) {
          errors.push(`Supabase sincronización parcial: ${error.message}`);
        }
      } catch (cloudErr: any) {
        errors.push(`No se pudo sincronizar en la nube: ${cloudErr.message}`);
      }

      invalidateProductsCache();
    }

    return {
      success: true,
      message: 'Copia de seguridad restaurada exitosamente en el sistema.',
      stats,
      errors,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Fallo crítico durante la restauración: ${err.message}`,
      stats,
      errors: [err.message],
    };
  }
}

/**
 * 6. GESTIÓN DE INFORMACIÓN DEL ÚLTIMO RESPALDO
 */
function saveLastBackupInfo(filename: string, sizeBytes: number, metadata: BackupMetadata): void {
  if (typeof window === 'undefined') return;
  const info = {
    timestamp: new Date().toISOString(),
    filename,
    sizeBytes,
    metadata,
  };
  localStorage.setItem(STORAGE_KEYS.LAST_BACKUP, JSON.stringify(info));
}

export function getLastBackupInfo(): LastBackupInfo | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LAST_BACKUP);
    if (!raw) return null;
    const info = JSON.parse(raw);
    const backupDate = new Date(info.timestamp);
    const now = new Date();
    const diffMs = now.getTime() - backupDate.getTime();
    const daysAgo = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    return {
      ...info,
      daysAgo,
      status: daysAgo <= 3 ? 'healthy' : daysAgo <= 7 ? 'warning' : 'warning',
    };
  } catch {
    return null;
  }
}

/**
 * 7. VACIADO TOTAL DE DATOS COMERCIALES (Para pruebas de contingencia y restauración)
 * Limpia LocalStorage y vacía las tablas en Supabase
 */
export async function clearAllCommercialData(): Promise<{ success: boolean; error?: string }> {
  try {
    if (typeof window !== 'undefined') {
      const keysToRemove = [
        STORAGE_KEYS.CUSTOMERS,
        STORAGE_KEYS.CUSTOMER_MOVEMENTS,
        STORAGE_KEYS.SUPPLIERS,
        STORAGE_KEYS.PURCHASE_ORDERS,
        STORAGE_KEYS.POS_ORDERS,
        STORAGE_KEYS.POS_RETURNS,
        STORAGE_KEYS.ACTIVE_CASH,
        STORAGE_KEYS.CASH_HISTORY,
        'distribuidora_local_batches',
        'distribuidora_landing_banners',
        CACHE_KEYS.ALL_PRODUCTS,
        CACHE_KEYS.DISCOUNTED_PRODUCTS,
        CACHE_KEYS.ADMIN_PRODUCTS,
      ];
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    }

    // Intentar vaciar en Supabase
    try {
      await supabase.from('order_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('stock_movements').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('product_batches').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    } catch (dbErr) {
      console.warn('[BACKUP_SERVICE] Aviso al vaciar Supabase:', dbErr);
    }

    invalidateProductsCache();
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

