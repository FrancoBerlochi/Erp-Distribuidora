import { formatCurrency } from './formatters';
import { formatArgentineWhatsAppPhone } from './pos-service';

export type OrderStatus =
  | 'pending'
  | 'preparing'
  | 'ready_pickup'
  | 'in_delivery'
  | 'delivered'
  | 'cancelled'
  | 'accepted'; // Retrocompatibilidad para órdenes legacy

export type DeliveryType = 'pickup' | 'delivery';

export interface OrderStatusConfig {
  id: OrderStatus;
  label: string;
  shortLabel: string;
  description: string;
  badgeClass: string;
  bgLight: string;
  textColor: string;
  borderColor: string;
  stepIndex: number;
}

export const ORDER_STATUS_CONFIG: Record<OrderStatus, OrderStatusConfig> = {
  pending: {
    id: 'pending',
    label: 'Pendiente / Nuevo',
    shortLabel: 'Nuevo',
    description: 'Pedido recibido en el sistema, a la espera de ser procesado',
    badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800',
    bgLight: 'bg-amber-500',
    textColor: 'text-amber-700 dark:text-amber-400',
    borderColor: 'border-amber-500',
    stepIndex: 1,
  },
  preparing: {
    id: 'preparing',
    label: 'En Preparación',
    shortLabel: 'Preparando',
    description: 'Armado, empaque y picking de mercadería en depósito',
    badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300 dark:border-blue-800',
    bgLight: 'bg-blue-600',
    textColor: 'text-blue-700 dark:text-blue-400',
    borderColor: 'border-blue-500',
    stepIndex: 2,
  },
  ready_pickup: {
    id: 'ready_pickup',
    label: 'Listo para Retiro',
    shortLabel: 'Listo Retiro',
    description: 'Armado completado, disponible para retiro en mostrador',
    badgeClass: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-300 dark:border-purple-800',
    bgLight: 'bg-purple-600',
    textColor: 'text-purple-700 dark:text-purple-400',
    borderColor: 'border-purple-500',
    stepIndex: 3,
  },
  in_delivery: {
    id: 'in_delivery',
    label: 'En Reparto / Flete',
    shortLabel: 'En Camino',
    description: 'Despachado con el transportista en viaje hacia el domicilio',
    badgeClass: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800',
    bgLight: 'bg-indigo-600',
    textColor: 'text-indigo-700 dark:text-indigo-400',
    borderColor: 'border-indigo-500',
    stepIndex: 3,
  },
  delivered: {
    id: 'delivered',
    label: 'Entregado / Completado',
    shortLabel: 'Entregado',
    description: 'Pedido entregado en mano al cliente con éxito',
    badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
    bgLight: 'bg-emerald-600',
    textColor: 'text-emerald-700 dark:text-emerald-400',
    borderColor: 'border-emerald-500',
    stepIndex: 4,
  },
  accepted: {
    id: 'accepted',
    label: 'Listo / Completado (Legacy)',
    shortLabel: 'Completado',
    description: 'Estado anterior homologado a completado',
    badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
    bgLight: 'bg-emerald-600',
    textColor: 'text-emerald-700 dark:text-emerald-400',
    borderColor: 'border-emerald-500',
    stepIndex: 4,
  },
  cancelled: {
    id: 'cancelled',
    label: 'Cancelado / Anulado',
    shortLabel: 'Cancelado',
    description: 'Venta anulada con reincorporación automática de stock',
    badgeClass: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300 dark:border-rose-800',
    bgLight: 'bg-rose-600',
    textColor: 'text-rose-700 dark:text-rose-400',
    borderColor: 'border-rose-500',
    stepIndex: 0,
  },
};

export function getOrderDeliveryType(shippingAddress?: string): DeliveryType {
  if (!shippingAddress) return 'pickup';
  const lower = shippingAddress.toLowerCase();
  if (
    lower.includes('retiro') ||
    lower.includes('local') ||
    lower.includes('mostrador') ||
    lower.includes('sucursal')
  ) {
    return 'pickup';
  }
  return 'delivery';
}

export function getNextOrderStatus(currentStatus: string, deliveryType: DeliveryType): OrderStatus | null {
  switch (currentStatus) {
    case 'pending':
      return 'preparing';
    case 'preparing':
      return deliveryType === 'pickup' ? 'ready_pickup' : 'in_delivery';
    case 'ready_pickup':
    case 'in_delivery':
      return 'delivered';
    case 'delivered':
    case 'accepted':
    case 'cancelled':
    default:
      return null;
  }
}

export function generateOrderWhatsAppMessage(
  order: {
    id: string;
    customer_name?: string;
    total_amount?: number | string;
    shipping_address?: string;
    status?: string;
  },
  targetStatus?: OrderStatus,
  items?: Array<{ quantity: number; products?: { name?: string }; price_at_purchase?: number }>
): string {
  const status = targetStatus || (order.status as OrderStatus) || 'pending';
  const orderShortId = order.id ? order.id.slice(0, 8).toUpperCase() : 'SN';
  const customerName = (order.customer_name || 'Estimado/a cliente').trim();
  const totalStr = formatCurrency(Number(order.total_amount) || 0);
  const deliveryType = getOrderDeliveryType(order.shipping_address);

  const lines: string[] = [];

  switch (status) {
    case 'pending':
      lines.push(`¡Hola *${customerName}*! 👋`);
      lines.push(`Recibimos tu pedido *#${orderShortId}* en *Distribuidora Express*.`);
      lines.push(`💰 *Total:* ${totalStr}`);
      if (deliveryType === 'pickup') {
        lines.push(`🏪 *Modalidad:* Retiro en Local Central`);
      } else {
        lines.push(`🚚 *Modalidad:* Envío a domicilio (${order.shipping_address || 'Dirección indicada'})`);
      }
      lines.push('');
      lines.push('Estamos procesando tu orden y te avisaremos ni bien comience la preparación en depósito. ¡Muchas gracias!');
      break;

    case 'preparing':
      lines.push(`¡Hola *${customerName}*! 📦`);
      lines.push(`Tu pedido *#${orderShortId}* ya se encuentra *EN PREPARACIÓN* en nuestro depósito.`);
      lines.push('Nuestros operarios están armando y embalando tus productos.');
      lines.push('Te avisaremos en cuanto esté listo para su entrega.');
      break;

    case 'ready_pickup':
      lines.push(`¡Hola *${customerName}*! 🏪`);
      lines.push(`¡Buenas noticias! Tu pedido *#${orderShortId}* ya está *LISTO PARA RETIRAR*.`);
      lines.push('');
      lines.push('📍 *Punto de Retiro:* Local Central (Av. Principal 1234)');
      lines.push('🕒 *Horarios de Atención:* Lunes a Sábados de 08:00 a 20:00 hs.');
      lines.push('Podés acercarte mencionando tu nombre y número de pedido.');
      break;

    case 'in_delivery':
      lines.push(`¡Hola *${customerName}*! 🚚`);
      lines.push(`Tu pedido *#${orderShortId}* ya salió *EN CAMINO* hacia tu domicilio.`);
      lines.push(`📍 *Destino:* ${order.shipping_address || 'Tu dirección registrada'}`);
      lines.push('');
      lines.push('El repartidor llegará a la brevedad. Por favor tené a mano tu DNI al recibir.');
      break;

    case 'delivered':
    case 'accepted':
      lines.push(`¡Hola *${customerName}*! ✅`);
      lines.push(`Tu pedido *#${orderShortId}* figura como *ENTREGADO CON ÉXITO*.`);
      lines.push('');
      lines.push('¡Esperamos que disfrutes tu compra y agradecemos tu confianza en *Distribuidora Express*! 🌟');
      break;

    case 'cancelled':
      lines.push(`Hola *${customerName}*.`);
      lines.push(`Te informamos que tu pedido *#${orderShortId}* ha sido *CANCELADO*.`);
      lines.push('');
      lines.push('Si creés que se trata de un error o tenés alguna duda sobre el pago o cancelación, respondé directamente a este mensaje para ayudarte.');
      break;
  }

  if (items && items.length > 0) {
    lines.push('');
    lines.push('📋 *Detalle de Productos:*');
    items.slice(0, 5).forEach((it) => {
      lines.push(`• ${it.quantity}x ${it.products?.name || 'Producto'}`);
    });
    if (items.length > 5) {
      lines.push(`• ... y ${items.length - 5} producto(s) más`);
    }
  }

  lines.push('');
  lines.push('— *Distribuidora Express*');

  return lines.join('\n');
}

export function getOrderWhatsAppUrl(
  order: {
    id: string;
    customer_name?: string;
    customer_phone?: string;
    total_amount?: number | string;
    shipping_address?: string;
    status?: string;
  },
  targetStatus?: OrderStatus,
  customPhone?: string,
  items?: Array<{ quantity: number; products?: { name?: string }; price_at_purchase?: number }>
): string {
  const phoneToFormat = customPhone || order.customer_phone || '';
  const cleanPhone = formatArgentineWhatsAppPhone(phoneToFormat);
  const message = generateOrderWhatsAppMessage(order, targetStatus, items);
  const encoded = encodeURIComponent(message);

  if (cleanPhone) {
    return `https://wa.me/${cleanPhone}?text=${encoded}`;
  }
  return `https://wa.me/?text=${encoded}`;
}
