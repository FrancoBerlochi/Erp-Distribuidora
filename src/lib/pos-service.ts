/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from './supabase';
import { 
  CashRegisterSession, 
  CashMovement, 
  POSCartItem, 
  PaymentMethod, 
  ARCAInvoice,
  UserProfile 
} from './pos-types';
import { invalidateProductsCache } from './products-cache';
import { addCustomerMovement } from './customers-service';
import { generateUUID } from './formatters';

const LOCAL_CASH_KEY = 'distribuidora_active_cash_register';
const LOCAL_HISTORY_KEY = 'distribuidora_cash_registers_history';
const LOCAL_USERS_KEY = 'distribuidora_pos_users';

// Utilidad para hashing SHA-256 de PINs de cajeros
export async function hashPin(pin: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(pin);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  let hash = 0;
  for (let i = 0; i < pin.length; i++) {
    hash = ((hash << 5) - hash) + pin.charCodeAt(i);
    hash |= 0;
  }
  return `h_${Math.abs(hash)}`;
}

// Verifica si un PIN coincide con el hash o código legacy
export async function verifyUserPin(inputPin: string, user: UserProfile): Promise<boolean> {
  const inputHash = await hashPin(inputPin);
  if (user.pin_hash) {
    return user.pin_hash === inputHash;
  }
  if (user.pin_code) {
    return user.pin_code === inputPin;
  }
  return false;
}

// Usuarios y cajeros por defecto (con hashes SHA-256)
const DEFAULT_PROFILES: UserProfile[] = [
  { id: 'usr-admin', email: 'admin@distribuidora.com', full_name: 'Administrador', role: 'admin', pin_hash: '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4' },
  { id: 'usr-cajero-1', email: 'caja1@distribuidora.com', full_name: 'Cajero Turno Mañana', role: 'cajero', pin_hash: '0ffe1abd1a08215353c233d6e009613e95eec4253832a761af28ff37ac5a150c' },
  { id: 'usr-cajero-2', email: 'caja2@distribuidora.com', full_name: 'Cajero Turno Tarde', role: 'cajero', pin_hash: 'edee29f882543b956620b26d0ee0e7e950399b1c4222f5de05e06425b4c995e9' },
];

export function getStoredProfiles(): UserProfile[] {
  if (typeof window === 'undefined') return DEFAULT_PROFILES;
  try {
    const saved = localStorage.getItem(LOCAL_USERS_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return DEFAULT_PROFILES;
}

export function saveProfiles(profiles: UserProfile[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(profiles));
}

// ==========================================
// 1. GESTIÓN DE CAJA Y TURNOS
// ==========================================

export async function getActiveCashRegister(): Promise<CashRegisterSession | null> {
  // Intentar obtener de Supabase
  try {
    const { data, error } = await supabase
      .from('cash_registers')
      .select('*, movements:cash_movements(*)')
      .eq('status', 'open')
      .order('opened_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      return {
        ...data,
        initial_cash: Number(data.initial_cash) || 0,
        expected_cash: Number(data.expected_cash) || 0,
        actual_cash: data.actual_cash != null ? Number(data.actual_cash) : null,
        cash_difference: data.cash_difference != null ? Number(data.cash_difference) : null,
        total_cards: Number(data.total_cards) || 0,
        total_transfers: Number(data.total_transfers) || 0,
        total_sales: Number(data.total_sales) || 0,
        movements: data.movements || [],
      };
    }
  } catch (err) {
    console.warn('Supabase cash_registers no disponible, usando fallback local:', err);
  }

  // Fallback LocalStorage (soporte offline o sin migración corrida)
  if (typeof window !== 'undefined') {
    try {
      const local = localStorage.getItem(LOCAL_CASH_KEY);
      if (local) {
        const parsed = JSON.parse(local);
        if (parsed && parsed.status === 'open') return parsed;
      }
    } catch {}
  }

  return null;
}

export async function openCashRegister(userName: string, initialCash: number = 0): Promise<CashRegisterSession> {
  const newSession: CashRegisterSession = {
    id: generateUUID('cash'),
    user_name: userName,
    opened_at: new Date().toISOString(),
    status: 'open',
    initial_cash: initialCash,
    expected_cash: initialCash,
    total_cards: 0,
    total_transfers: 0,
    total_qr: 0,
    total_credit: 0,
    total_returns_cash: 0,
    total_sales: 0,
    movements: [],
  };

  // Guardar en Supabase
  try {
    const { data, error } = await supabase
      .from('cash_registers')
      .insert([{
        user_name: userName,
        status: 'open',
        initial_cash: initialCash,
        expected_cash: initialCash,
        total_cards: 0,
        total_transfers: 0,
        total_sales: 0,
      }])
      .select()
      .single();

    if (!error && data) {
      newSession.id = data.id;
    }
  } catch (err) {
    console.warn('Error guardando apertura en Supabase, persistiendo localmente:', err);
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_CASH_KEY, JSON.stringify(newSession));
  }

  return newSession;
}

export async function addCashMovement(
  cashRegisterId: string, 
  type: 'income' | 'expense', 
  amount: number, 
  reason: string
): Promise<CashMovement> {
  const movement: CashMovement = {
    id: generateUUID('mov'),
    cash_register_id: cashRegisterId,
    type,
    amount,
    reason,
    created_at: new Date().toISOString(),
  };

  // 1. Guardar movimiento en Supabase
  try {
    await supabase.from('cash_movements').insert([movement]);
    
    // 2. Actualizar saldo esperado en Supabase
    const { data: reg } = await supabase
      .from('cash_registers')
      .select('expected_cash')
      .eq('id', cashRegisterId)
      .single();

    if (reg) {
      const current = Number(reg.expected_cash) || 0;
      const updated = type === 'income' ? current + amount : Math.max(0, current - amount);
      await supabase
        .from('cash_registers')
        .update({ expected_cash: updated })
        .eq('id', cashRegisterId);
    }
  } catch (err) {
    console.warn('Fallo Supabase en cash_movements:', err);
  }

  // Actualizar en LocalStorage
  if (typeof window !== 'undefined') {
    try {
      const local = localStorage.getItem(LOCAL_CASH_KEY);
      if (local) {
        const session: CashRegisterSession = JSON.parse(local);
        if (session.id === cashRegisterId) {
          session.movements = session.movements || [];
          session.movements.push(movement);
          session.expected_cash = type === 'income' 
            ? session.expected_cash + amount 
            : Math.max(0, session.expected_cash - amount);
          localStorage.setItem(LOCAL_CASH_KEY, JSON.stringify(session));
        }
      }
    } catch {}
  }

  return movement;
}

export async function closeCashRegister(
  session: CashRegisterSession, 
  actualCash: number, 
  notes: string = '',
  cashBreakdown?: Record<string, number>
): Promise<CashRegisterSession> {
  const cashDifference = actualCash - session.expected_cash;
  const closedSession: CashRegisterSession = {
    ...session,
    closed_at: new Date().toISOString(),
    status: 'closed',
    actual_cash: actualCash,
    cash_difference: cashDifference,
    cash_breakdown: cashBreakdown,
    notes,
  };

  // Guardar en Supabase
  try {
    await supabase
      .from('cash_registers')
      .update({
        closed_at: closedSession.closed_at,
        status: 'closed',
        actual_cash: actualCash,
        cash_difference: cashDifference,
        notes,
      })
      .eq('id', session.id);
  } catch (err) {
    console.warn('Error cerrando caja en Supabase:', err);
  }

  // Guardar en historial local y limpiar activa
  if (typeof window !== 'undefined') {
    localStorage.removeItem(LOCAL_CASH_KEY);
    try {
      const hist = JSON.parse(localStorage.getItem(LOCAL_HISTORY_KEY) || '[]');
      hist.unshift(closedSession);
      localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(hist.slice(0, 50)));
    } catch {}
  }

  return closedSession;
}

export async function getCashHistory(): Promise<CashRegisterSession[]> {
  try {
    const { data, error } = await supabase
      .from('cash_registers')
      .select('*, movements:cash_movements(*)')
      .eq('status', 'closed')
      .order('closed_at', { ascending: false })
      .limit(30);

    if (!error && data && data.length > 0) {
      return data.map((d: any) => ({
        ...d,
        initial_cash: Number(d.initial_cash) || 0,
        expected_cash: Number(d.expected_cash) || 0,
        actual_cash: d.actual_cash != null ? Number(d.actual_cash) : 0,
        cash_difference: d.cash_difference != null ? Number(d.cash_difference) : 0,
        total_cards: Number(d.total_cards) || 0,
        total_transfers: Number(d.total_transfers) || 0,
        total_sales: Number(d.total_sales) || 0,
        movements: d.movements || [],
      }));
    }
  } catch {}

  if (typeof window !== 'undefined') {
    try {
      return JSON.parse(localStorage.getItem(LOCAL_HISTORY_KEY) || '[]');
    } catch {}
  }
  return [];
}

// ==========================================
// 2. REGISTRO DE VENTA EN PUNTO DE VENTA (POS)
// ==========================================

export interface POSSalePayload {
  items: POSCartItem[];
  paymentMethod: PaymentMethod;
  customerId?: string;
  customerName?: string;
  customerDoc?: string;
  customerDocType?: string;
  discountAmount?: number;
  surchargeAmount?: number;
  cashGiven?: number; // Para cálculo de vuelto
  creditAmount?: number; // Monto a cuenta corriente (si hubo pago parcial)
  paidNowAmount?: number; // Monto abonado al contado hoy (si hubo pago mixto)
  invoiceType?: 'ticket_interno' | 'factura_c';
  cashierName: string;
  cashRegisterId?: string;
}

export interface POSSaleResult {
  orderId: string;
  totalAmount: number;
  changeAmount: number;
  paymentMethod: PaymentMethod;
  customerId?: string;
  customerName?: string;
  creditAmount?: number;
  paidNowAmount?: number;
  customerPreviousBalance?: number;
  customerNewBalance?: number;
  invoice?: ARCAInvoice | null;
  items: POSCartItem[];
  date: string;
  cashierName: string;
}

export async function executePOSSale(payload: POSSalePayload): Promise<POSSaleResult> {
  const subtotal = payload.items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const discount = payload.discountAmount || 0;
  const surcharge = payload.surchargeAmount || 0;
  const totalAmount = Math.max(0, subtotal - discount + surcharge);
  const cashGiven = payload.cashGiven || totalAmount;
  const changeAmount = payload.paymentMethod === 'efectivo' ? Math.max(0, cashGiven - totalAmount) : 0;
  const orderDate = new Date().toISOString();

  const fakeOrderId = generateUUID('pos');
  let finalOrderId = fakeOrderId;

  // 1. Guardar Orden en Supabase
  try {
    const { data: orderData } = await supabase
      .from('orders')
      .insert([{
        customer_name: payload.customerName || 'Consumidor Final',
        customer_email: 'pos-venta@distribuidora.com',
        customer_phone: payload.customerDoc || '',
        shipping_address: 'Venta en Local Físico (Mostrador)',
        total_amount: totalAmount,
        status: 'accepted',
        mp_payment_id: `POS-${payload.paymentMethod.toUpperCase()}-${Date.now().toString().slice(-6)}`,
        channel: 'pos',
        payment_method: payload.paymentMethod,
        discount_amount: discount,
        surcharge_amount: surcharge,
        cash_register_id: payload.cashRegisterId,
        invoice_type: payload.invoiceType || 'ticket_interno',
      }])
      .select()
      .maybeSingle();

    if (orderData?.id) {
      finalOrderId = orderData.id;
    }

    // 2. Guardar Items y Descontar Stock en Supabase
    for (const item of payload.items) {
      try {
        await supabase.from('order_items').insert([{
          order_id: finalOrderId,
          product_id: item.id,
          quantity: item.quantity,
          price_at_purchase: item.price,
        }]);

        // Descontar inventario
        const { data: currentProd } = await supabase
          .from('products')
          .select('stock')
          .eq('id', item.id)
          .single();

        if (currentProd) {
          const isOverdraft = currentProd.stock < item.quantity;
          const newStock = Math.max(0, currentProd.stock - item.quantity);
          await supabase.from('products').update({ stock: newStock }).eq('id', item.id);

          // Kardex
          await supabase.from('stock_movements').insert([{
            product_id: item.id,
            type: 'sale_pos',
            quantity: item.quantity,
            previous_stock: currentProd.stock,
            new_stock: newStock,
            reference_id: finalOrderId,
            notes: isOverdraft ? `Venta con sobregiro de stock (stock físico previo: ${currentProd.stock} u., vendido: ${item.quantity} u.)` : undefined,
          }]);
        }
      } catch (err) {
        console.warn('Error descontando stock en Supabase:', err);
      }
    }
  } catch (err) {
    console.warn('Fallo guardando orden en Supabase, procesando local:', err);
  }

  // 3. Manejo de Cuenta Corriente / Fiado
  let customerPreviousBalance: number | undefined;
  let customerNewBalance: number | undefined;
  const isCreditSale = payload.paymentMethod === 'cuenta_corriente' || (payload.creditAmount != null && payload.creditAmount > 0);
  const creditPortion = payload.creditAmount != null ? payload.creditAmount : (payload.paymentMethod === 'cuenta_corriente' ? totalAmount : 0);
  const paidNowPortion = payload.paidNowAmount != null ? payload.paidNowAmount : (payload.paymentMethod === 'cuenta_corriente' ? Math.max(0, totalAmount - creditPortion) : totalAmount);

  if (payload.customerId && isCreditSale && creditPortion > 0) {
    try {
      const { movement } = await addCustomerMovement({
        customer_id: payload.customerId,
        type: 'debt',
        amount: creditPortion,
        payment_method: 'cuenta_corriente',
        reference_id: finalOrderId,
        notes: `Venta POS #${finalOrderId.slice(-6).toUpperCase()} (${payload.items.length} items)${paidNowPortion > 0 ? ` - Se abonó $${paidNowPortion} en efectivo de contado` : ''}`,
        created_by: payload.cashierName,
      });
      customerNewBalance = movement.balance_after;
      customerPreviousBalance = movement.balance_after - creditPortion;
    } catch (err) {
      console.warn('Error registrando deuda en cuenta corriente:', err);
    }
  }

  // 4. Actualizar Totales en Sesión de Caja Activa
  if (payload.cashRegisterId) {
    try {
      const { data: reg } = await supabase
        .from('cash_registers')
        .select('*')
        .eq('id', payload.cashRegisterId)
        .single();

      if (reg) {
        const currentExpectedCash = Number(reg.expected_cash) || 0;
        const currentCards = Number(reg.total_cards) || 0;
        const currentTransfers = Number(reg.total_transfers) || 0;
        const currentSales = Number(reg.total_sales) || 0;

        let newExpectedCash = currentExpectedCash;
        let newCards = currentCards;
        let newTransfers = currentTransfers;
        let newQr = Number(reg.total_qr) || 0;
        let newCredit = Number(reg.total_credit) || 0;

        if (payload.paymentMethod === 'efectivo') {
          newExpectedCash += totalAmount;
        } else if (payload.paymentMethod === 'tarjeta_posnet') {
          newCards += totalAmount;
        } else if (payload.paymentMethod === 'transferencia') {
          newTransfers += totalAmount;
        } else if (payload.paymentMethod === 'qr') {
          newQr += totalAmount;
        } else if (payload.paymentMethod === 'cuenta_corriente') {
          newCredit += creditPortion;
          if (paidNowPortion > 0) {
            newExpectedCash += paidNowPortion;
          }
        }

        await supabase
          .from('cash_registers')
          .update({
            expected_cash: newExpectedCash,
            total_cards: newCards,
            total_transfers: newTransfers,
            total_sales: currentSales + totalAmount,
          })
          .eq('id', payload.cashRegisterId);
      }
    } catch {}

    // Sincronizar en localStorage
    if (typeof window !== 'undefined') {
      try {
        const local = localStorage.getItem(LOCAL_CASH_KEY);
        if (local) {
          const session: CashRegisterSession = JSON.parse(local);
          if (session.id === payload.cashRegisterId) {
            if (payload.paymentMethod === 'efectivo') {
              session.expected_cash += totalAmount;
            } else if (payload.paymentMethod === 'tarjeta_posnet') {
              session.total_cards = (session.total_cards || 0) + totalAmount;
            } else if (payload.paymentMethod === 'transferencia') {
              session.total_transfers = (session.total_transfers || 0) + totalAmount;
            } else if (payload.paymentMethod === 'qr') {
              session.total_qr = (session.total_qr || 0) + totalAmount;
            } else if (payload.paymentMethod === 'cuenta_corriente') {
              session.total_credit = (session.total_credit || 0) + creditPortion;
              if (paidNowPortion > 0) {
                session.expected_cash += paidNowPortion;
              }
            }
            session.total_sales = (session.total_sales || 0) + totalAmount;
            localStorage.setItem(LOCAL_CASH_KEY, JSON.stringify(session));
          }
        }
      } catch {}
    }
  }

  // 5. Generar Factura ARCA si fue solicitada
  let invoice: ARCAInvoice | null = null;
  if (payload.invoiceType === 'factura_c') {
    invoice = generateMockARCAInvoice({
      orderId: fakeOrderId,
      totalAmount,
      customerDoc: payload.customerDoc || '00000000',
      customerDocType: payload.customerDocType || 'DNI',
      customerName: payload.customerName || 'Consumidor Final',
    });

    try {
      await supabase.from('invoices').insert([invoice]);
    } catch {}
  }

  // 6. Guardar localmente en historial de órdenes POS para búsqueda y devoluciones inmediatas
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('distribuidora_pos_orders');
      const list = raw ? JSON.parse(raw) : [];
      list.unshift({
        id: finalOrderId,
        created_at: orderDate,
        customer_name: payload.customerName || 'Consumidor Final',
        customer_phone: payload.customerDoc || '',
        total_amount: totalAmount,
        status: 'accepted',
        mp_payment_id: `POS-${payload.paymentMethod.toUpperCase()}-${finalOrderId.slice(-6).toUpperCase()}`,
        channel: 'pos',
        payment_method: payload.paymentMethod,
        customer_id: payload.customerId,
        items: payload.items.map((it) => ({
          product_id: it.id,
          name: it.name,
          quantity: it.quantity,
          price: it.price,
          image_url_1: it.image_url_1,
        })),
      });
      localStorage.setItem('distribuidora_pos_orders', JSON.stringify(list.slice(0, 50)));
    } catch {}
  }

  // Invalida la caché del catálogo para que la tienda online refleje el nuevo stock al instante
  invalidateProductsCache();

  return {
    orderId: finalOrderId,
    totalAmount,
    changeAmount,
    paymentMethod: payload.paymentMethod,
    customerId: payload.customerId,
    customerName: payload.customerName,
    creditAmount: isCreditSale ? creditPortion : undefined,
    paidNowAmount: isCreditSale ? paidNowPortion : undefined,
    customerPreviousBalance,
    customerNewBalance,
    invoice,
    items: payload.items,
    date: orderDate,
    cashierName: payload.cashierName,
  };
}

// ==========================================
// 3. FACTURACIÓN ELECTRÓNICA ARCA TIPO C
// ==========================================

export function generateMockARCAInvoice(params: {
  orderId: string;
  totalAmount: number;
  customerDoc: string;
  customerDocType: string;
  customerName: string;
}): ARCAInvoice {
  const ptoVta = 1;
  const invoiceNum = Math.floor(1000 + Math.random() * 90000);
  const now = new Date();
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 10);

  return {
    order_id: params.orderId,
    invoice_type: 'C',
    point_of_sale: ptoVta,
    invoice_number: invoiceNum,
    cae: 'NO-FISCAL-INTERNO',
    cae_due_date: dueDate.toISOString().split('T')[0],
    customer_doc_type: params.customerDocType,
    customer_doc_number: params.customerDoc,
    customer_name: params.customerName,
    total_amount: params.totalAmount,
    qr_data: '',
    status: 'approved',
    created_at: now.toISOString(),
  };
}

// ==========================================
// 4. FEEDBACK SONORO (BEEP DE ESCÁNER DE CAJA)
// ==========================================

export function playScannerBeep() {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1760, ctx.currentTime); // Tono agudo A6 limpio de caja
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  } catch {}
}

// ==========================================
// 5. AUDITORÍA DE ARQUEO X Y CIERRE Z
// ==========================================

export interface CashAuditSummary {
  session: CashRegisterSession;
  initialCash: number;
  salesCash: number;
  totalCards: number;
  totalTransfers: number;
  totalQr: number;
  totalCredit: number;
  totalIncomeMovements: number;
  totalExpenseMovements: number;
  expectedCash: number;
  actualCash: number | null;
  difference: number | null;
  totalTurnover: number;
}

export function getCashRegisterAudit(session: CashRegisterSession): CashAuditSummary {
  const incomes = (session.movements || [])
    .filter((m) => m.type === 'income')
    .reduce((sum, m) => sum + Number(m.amount), 0);
  const expenses = (session.movements || [])
    .filter((m) => m.type === 'expense')
    .reduce((sum, m) => sum + Number(m.amount), 0);

  const initialCash = Number(session.initial_cash) || 0;
  const expectedCash = Number(session.expected_cash) || 0;
  const salesCash = Math.max(0, expectedCash - initialCash - incomes + expenses);

  const totalCards = Number(session.total_cards) || 0;
  const totalTransfers = Number(session.total_transfers) || 0;
  const totalQr = Number(session.total_qr) || 0;
  const totalCredit = Number(session.total_credit) || 0;
  const totalTurnover = Number(session.total_sales) || (salesCash + totalCards + totalTransfers + totalQr + totalCredit);

  return {
    session,
    initialCash,
    salesCash,
    totalCards,
    totalTransfers,
    totalQr,
    totalCredit,
    totalIncomeMovements: incomes,
    totalExpenseMovements: expenses,
    expectedCash,
    actualCash: session.actual_cash != null ? Number(session.actual_cash) : null,
    difference: session.cash_difference != null ? Number(session.cash_difference) : null,
    totalTurnover,
  };
}

/**
 * Limpia y normaliza un número de teléfono para WhatsApp con formato internacional argentino (549...)
 */
export function formatArgentineWhatsAppPhone(rawPhone: string): string {
  let clean = (rawPhone || '').replace(/[^0-9]/g, '');
  if (!clean) return '';

  // Quitar prefijo internacional si ya lo tiene para normalizar
  if (clean.startsWith('549')) {
    clean = clean.slice(3);
  } else if (clean.startsWith('54')) {
    clean = clean.slice(2);
  }

  // Quitar 0 inicial si existe
  if (clean.startsWith('0')) {
    clean = clean.slice(1);
  }

  // Quitar 15 luego del código de área si fue ingresado (ej: 11-15-4455-6677 -> 1144556677)
  if (clean.length === 12 && clean.slice(2, 4) === '15') {
    clean = clean.slice(0, 2) + clean.slice(4);
  } else if (clean.length === 12 && clean.slice(3, 5) === '15') {
    clean = clean.slice(0, 3) + clean.slice(5);
  }

  return `549${clean}`;
}

/**
 * Genera el texto formateado profesional del Cierre Z o Arqueo X para enviar por WhatsApp al dueño/supervisor
 */
export function formatOwnerCashShiftMessage(session: CashRegisterSession, mode: 'X' | 'Z' = 'Z'): string {
  const audit = getCashRegisterAudit(session);
  const formatMoney = (val: number) => `$ ${val.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const isZ = mode === 'Z';
  const headerTitle = isZ ? '📊 *DISTRIBUIDORA EXPRESS - CIERRE DE CAJA Z* 📊' : '🔍 *DISTRIBUIDORA EXPRESS - ARQUEO PARCIAL X* 🔍';

  const dateOpened = new Date(session.opened_at).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const dateClosed = session.closed_at
    ? new Date(session.closed_at).toLocaleString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : new Date().toLocaleString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

  let diffText = '🟢 Caja Cuadrada ($ 0,00)';
  if (audit.difference != null) {
    if (audit.difference > 0) diffText = `🔵 Sobrante: +${formatMoney(audit.difference)}`;
    else if (audit.difference < 0) diffText = `🔴 FALTANTE: ${formatMoney(audit.difference)}`;
  }

  const lines = [
    headerTitle,
    `*Turno:* #${session.id.slice(-6).toUpperCase()}`,
    `*Cajero Resp.:* ${session.user_name}`,
    `*Apertura:* ${dateOpened} hs`,
    `${isZ ? `*Cierre:* ${dateClosed} hs` : `*Consulta:* ${dateClosed} hs`}`,
    '------------------------------------',
    `💰 *VENTAS TOTALES:* *${formatMoney(audit.totalTurnover)}*`,
    `• 💵 Efectivo Ventas: ${formatMoney(audit.salesCash)}`,
    `• 💳 Tarjetas (Posnet): ${formatMoney(audit.totalCards)}`,
    `• 📱 Transferencias / QR: ${formatMoney(audit.totalTransfers + audit.totalQr)}`,
    `• 📑 Cuentas Corrientes (Fiado): ${formatMoney(audit.totalCredit)}`,
    '------------------------------------',
    '💵 *MOVIMIENTOS DE CAJÓN FÍSICO:*',
    `• Fondo Inicial: ${formatMoney(audit.initialCash)}`,
    `• (+) Ventas Efectivo: ${formatMoney(audit.salesCash)}`,
    ...(audit.totalIncomeMovements > 0 ? [`• (+) Ingresos Manuales: +${formatMoney(audit.totalIncomeMovements)}`] : []),
    ...(audit.totalExpenseMovements > 0 ? [`• (-) Retiros / Egresos: -${formatMoney(audit.totalExpenseMovements)}`] : []),
    `• *Efectivo Teórico Esperado:* ${formatMoney(audit.expectedCash)}`,
  ];

  if (isZ && audit.actualCash != null) {
    lines.push(`• *Efectivo Real Declarado:* ${formatMoney(audit.actualCash)}`);
    lines.push(`• *RESULTADO DE ARQUEO:* ${diffText}`);
  }

  if (session.notes) {
    lines.push('------------------------------------');
    lines.push(`📝 *Observaciones:* ${session.notes}`);
  }

  lines.push('------------------------------------');
  lines.push('🤖 *Enviado desde Sistema POS Distribuidora Express*');

  return lines.join('\n');
}

/**
 * Genera el enlace directo a WhatsApp (wa.me) para enviar el resumen de caja
 */
export function getOwnerWhatsAppShiftUrl(session: CashRegisterSession, rawPhone?: string, mode: 'X' | 'Z' = 'Z'): string {
  const message = formatOwnerCashShiftMessage(session, mode);
  const cleanPhone = rawPhone ? formatArgentineWhatsAppPhone(rawPhone) : '';
  if (cleanPhone) {
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  }
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

