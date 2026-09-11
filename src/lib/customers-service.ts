import { supabase } from '@/lib/supabase';
import { Customer, CustomerMovement } from '@/lib/pos-types';
import { addCashMovement } from '@/lib/pos-service';
import { generateUUID } from './formatters';

const LOCAL_CUSTOMERS_KEY = 'distribuidora-customers';
const LOCAL_MOVEMENTS_KEY = 'distribuidora-customer-movements';

// Clientes iniciales de muestra para demostración comercial
const DEFAULT_CUSTOMERS: Customer[] = [
  {
    id: 'cust-1',
    name: 'Kiosco San Cayetano',
    document_type: 'CUIT',
    document_number: '20-34891204-8',
    phone: '5491145678901',
    email: 'kiosco.sancayetano@gmail.com',
    address: 'Av. Corrientes 3420, CABA',
    credit_limit: 150000,
    current_balance: 42500,
    status: 'active',
    notes: 'Cliente habitual hace 3 años. Paga todos los viernes en efectivo.',
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
  {
    id: 'cust-2',
    name: 'Almacén Don Tito',
    document_type: 'CUIT',
    document_number: '23-28941203-9',
    phone: '5491198765432',
    email: 'dontito.almacen@hotmail.com',
    address: 'Calle Mitre 845, San Martín',
    credit_limit: 300000,
    current_balance: 118000,
    status: 'active',
    notes: 'Compra bultos cerrados semanales. Paga por transferencia.',
    created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
  },
  {
    id: 'cust-3',
    name: 'Panadería La Espiga',
    document_type: 'DNI',
    document_number: '32.145.890',
    phone: '5491122334455',
    email: 'laespiga.panaderia@gmail.com',
    address: 'Rivadavia 1204, Ramos Mejía',
    credit_limit: 100000,
    current_balance: 0,
    status: 'active',
    notes: 'Cuenta al día. Siempre compra con límite moderado.',
    created_at: new Date(Date.now() - 90 * 86400000).toISOString(),
  },
];

const DEFAULT_MOVEMENTS: CustomerMovement[] = [
  {
    id: 'mov-1',
    customer_id: 'cust-1',
    type: 'debt',
    amount: 42500,
    balance_after: 42500,
    payment_method: 'cuenta_corriente',
    reference_id: 'POS-CC-849201',
    notes: 'Compra fiado en mostrador (Golosinas y Bebidas)',
    created_by: 'Administrador',
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: 'mov-2',
    customer_id: 'cust-2',
    type: 'debt',
    amount: 158000,
    balance_after: 158000,
    payment_method: 'cuenta_corriente',
    reference_id: 'POS-CC-739182',
    notes: 'Pedido mayorista por bulto (Limpieza y Aceites)',
    created_by: 'Administrador',
    created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
  },
  {
    id: 'mov-3',
    customer_id: 'cust-2',
    type: 'payment',
    amount: 40000,
    balance_after: 118000,
    payment_method: 'transferencia',
    reference_id: 'REC-0012',
    notes: 'Pago a cuenta vía transferencia Bancaria',
    created_by: 'Administrador',
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
];

function getStoredLocalCustomers(): Customer[] {
  if (typeof window === 'undefined') return DEFAULT_CUSTOMERS;
  try {
    const raw = localStorage.getItem(LOCAL_CUSTOMERS_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_CUSTOMERS_KEY, JSON.stringify(DEFAULT_CUSTOMERS));
      return DEFAULT_CUSTOMERS;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_CUSTOMERS;
  }
}

function saveStoredLocalCustomers(customers: Customer[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_CUSTOMERS_KEY, JSON.stringify(customers));
  } catch {}
}

function getStoredLocalMovements(): CustomerMovement[] {
  if (typeof window === 'undefined') return DEFAULT_MOVEMENTS;
  try {
    const raw = localStorage.getItem(LOCAL_MOVEMENTS_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_MOVEMENTS_KEY, JSON.stringify(DEFAULT_MOVEMENTS));
      return DEFAULT_MOVEMENTS;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_MOVEMENTS;
  }
}

function saveStoredLocalMovements(movements: CustomerMovement[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_MOVEMENTS_KEY, JSON.stringify(movements));
  } catch {}
}

/**
 * Obtener todos los clientes registrados
 */
export async function getCustomers(): Promise<Customer[]> {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('name', { ascending: true });

    if (!error && Array.isArray(data)) {
      const parsed = data.map((c: any) => ({
        ...c,
        credit_limit: Number(c.credit_limit) || 0,
        current_balance: Number(c.current_balance) || 0,
      }));
      saveStoredLocalCustomers(parsed);
      return parsed;
    }
  } catch (err) {
    console.warn('Fallback a LocalStorage para clientes:', err);
  }
  return getStoredLocalCustomers();
}

/**
 * Obtener un cliente por su ID
 */
export async function getCustomerById(id: string): Promise<Customer | null> {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .single();

    if (!error && data) {
      return {
        ...data,
        credit_limit: Number(data.credit_limit) || 0,
        current_balance: Number(data.current_balance) || 0,
      };
    }
  } catch {}

  const local = getStoredLocalCustomers();
  return local.find((c) => c.id === id) || null;
}

/**
 * Guardar o actualizar un cliente
 */
export async function saveCustomer(payload: Partial<Customer>): Promise<Customer> {
  const isNew = !payload.id;
  const id = payload.id || generateUUID('cust');

  const customerToSave: Customer = {
    id,
    name: (payload.name || '').trim(),
    document_type: payload.document_type || 'DNI',
    document_number: payload.document_number?.trim() || '',
    phone: payload.phone?.trim() || '',
    email: payload.email?.trim() || '',
    address: payload.address?.trim() || '',
    credit_limit: Number(payload.credit_limit) || 0,
    current_balance: Number(payload.current_balance) || 0,
    status: payload.status || 'active',
    notes: payload.notes || '',
    created_at: payload.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // 1. Guardar en Supabase
  try {
    if (isNew) {
      const { error } = await supabase.from('customers').insert([customerToSave]);
      if (error) {
        console.warn('[CUSTOMERS] Error guardando cliente en Supabase:', error.message);
      }
    } else {
      const { error } = await supabase.from('customers').update(customerToSave).eq('id', id);
      if (error) {
        console.warn('[CUSTOMERS] Error actualizando cliente en Supabase:', error.message);
      }
    }
  } catch (err) {
    console.warn('Error guardando cliente en Supabase, guardando local:', err);
  }

  // 2. Actualizar en LocalStorage
  const local = getStoredLocalCustomers();
  const existingIdx = local.findIndex((c) => c.id === id);
  if (existingIdx >= 0) {
    local[existingIdx] = customerToSave;
  } else {
    local.unshift(customerToSave);
  }
  saveStoredLocalCustomers(local);

  return customerToSave;
}

/**
 * Eliminar un cliente
 */
export async function deleteCustomer(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (error) {
      console.warn('[CUSTOMERS] Error eliminando cliente en Supabase:', error.message);
    }
  } catch (err) {
    console.warn('Error eliminando cliente en Supabase:', err);
  }

  const local = getStoredLocalCustomers().filter((c) => c.id !== id);
  saveStoredLocalCustomers(local);
  return true;
}

/**
 * Obtener movimientos de cuenta corriente de un cliente
 */
export async function getCustomerMovements(customerId: string): Promise<CustomerMovement[]> {
  try {
    const { data, error } = await supabase
      .from('customer_movements')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      return data.map((m: any) => ({
        ...m,
        amount: Number(m.amount) || 0,
        balance_after: Number(m.balance_after) || 0,
      }));
    }
  } catch (err) {
    console.warn('Fallback a LocalStorage para movimientos:', err);
  }

  const local = getStoredLocalMovements();
  return local
    .filter((m) => m.customer_id === customerId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

/**
 * Registrar un movimiento en la cuenta corriente (deuda, pago o ajuste)
 */
export async function addCustomerMovement(params: {
  customer_id: string;
  type: 'debt' | 'payment' | 'adjustment';
  amount: number;
  payment_method?: string;
  reference_id?: string;
  notes?: string;
  created_by?: string;
}): Promise<{ customer: Customer; movement: CustomerMovement }> {
  const customer = await getCustomerById(params.customer_id);
  if (!customer) {
    throw new Error('Cliente no encontrado.');
  }

  const previousBalance = Number(customer.current_balance) || 0;
  let newBalance = previousBalance;

  if (params.type === 'debt') {
    if (customer.status === 'blocked') {
      throw new Error(`El cliente "${customer.name}" está bloqueado para compras en cuenta corriente.`);
    }
    newBalance = previousBalance + params.amount;
  } else if (params.type === 'payment') {
    // Permitir saldo negativo (saldo a favor del cliente si paga de más o por devolución)
    newBalance = previousBalance - params.amount;
  } else if (params.type === 'adjustment') {
    newBalance = previousBalance + params.amount; // amount puede ser positivo o negativo
  }

  const movementId = generateUUID('mov');
  const movement: CustomerMovement = {
    id: movementId,
    customer_id: params.customer_id,
    type: params.type,
    amount: params.amount,
    balance_after: newBalance,
    payment_method: params.payment_method || 'cuenta_corriente',
    reference_id: params.reference_id || `MOV-${Date.now().toString().slice(-6)}`,
    notes: params.notes || '',
    created_by: params.created_by || 'Cajero',
    created_at: new Date().toISOString(),
  };

  // 1. Guardar movimiento en Supabase
  try {
    const { error } = await supabase.from('customer_movements').insert([movement]);
    if (error) {
      console.warn('[CUSTOMERS] Error guardando movimiento en Supabase:', error.message);
    }
  } catch (err) {
    console.warn('Error guardando movimiento en Supabase:', err);
  }

  // 2. Actualizar saldo del cliente
  const updatedCustomer = await saveCustomer({
    ...customer,
    current_balance: newBalance,
  });

  // 3. Guardar movimiento localmente
  const localMovements = getStoredLocalMovements();
  localMovements.unshift(movement);
  saveStoredLocalMovements(localMovements);

  return { customer: updatedCustomer, movement };
}

/**
 * Registrar un pago o entrega de dinero a cuenta de un cliente
 */
export async function registerCustomerPayment(params: {
  customerId: string;
  amount: number;
  paymentMethod: string;
  notes?: string;
  cashierName?: string;
  cashRegisterId?: string;
}): Promise<{ customer: Customer; movement: CustomerMovement }> {
  if (params.amount <= 0) {
    throw new Error('El monto a abonar debe ser mayor a $0.');
  }

  const result = await addCustomerMovement({
    customer_id: params.customerId,
    type: 'payment',
    amount: params.amount,
    payment_method: params.paymentMethod,
    reference_id: `COB-${Date.now().toString().slice(-6)}`,
    notes: params.notes || `Cobranza a cuenta (${params.paymentMethod})`,
    created_by: params.cashierName || 'Cajero',
  });

  // Si se abonó en efectivo y hay caja activa, registrar el ingreso de dinero
  if (params.cashRegisterId && params.paymentMethod === 'efectivo') {
    try {
      await addCashMovement(
        params.cashRegisterId,
        'income',
        params.amount,
        `Cobranza Cta. Cte. - ${result.customer.name}`
      );
    } catch (err) {
      console.warn('Error impactando cobranza en caja activa:', err);
    }
  }

  return result;
}

/**
 * Generar enlace de WhatsApp para recordatorio de deuda o confirmación de saldo
 */
export function generateWhatsAppReminderUrl(customer: Customer, storeAlias: string = 'distribuidora.express'): string {
  if (!customer.phone) return '';
  let cleanPhone = customer.phone.replace(/[^0-9]/g, '');
  if (!cleanPhone) return '';

  // Prefijo internacional argentino
  if (!cleanPhone.startsWith('54') && cleanPhone.length === 10) {
    cleanPhone = `549${cleanPhone}`;
  } else if (cleanPhone.startsWith('54') && !cleanPhone.startsWith('549') && cleanPhone.length === 12) {
    cleanPhone = `549${cleanPhone.slice(2)}`;
  }

  const balanceNumber = Number(customer.current_balance) || 0;
  const isCreditInFavor = balanceNumber < 0;
  const absBalanceFormatted = `$${Math.abs(balanceNumber).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;

  let message = '';
  if (isCreditInFavor) {
    message = `¡Hola ${customer.name}! 👋 Te escribimos desde *Distribuidora Express*.\n\n` +
      `Te confirmamos que tenés un *Saldo a Favor* en tu Cuenta Corriente de: *${absBalanceFormatted}*.\n\n` +
      `Podés utilizarlo como crédito en tu próxima compra mayorista o minorista en nuestro local.\n\n` +
      `¡Muchas gracias por elegirnos! 🙌`;
  } else {
    message = `¡Hola ${customer.name}! 👋 Te escribimos desde *Distribuidora Express*.\n\n` +
      `Te compartimos el estado actualizado de tu Cuenta Corriente:\n` +
      `📌 *Saldo Pendiente:* ${absBalanceFormatted}\n\n` +
      `Podés abonar mediante transferencia a nuestro Alias: *${storeAlias}* o acercarte a nuestro local central.\n\n` +
      `Cualquier consulta quedamos a tu disposición. ¡Muchas gracias! 🙌`;
  }

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}
