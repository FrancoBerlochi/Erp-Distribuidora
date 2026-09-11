/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  ShoppingBag, X, Check, Clock, Ban, Phone, Mail, MapPin, 
  CreditCard, Globe, Store, Search, RefreshCw, 
  Printer, CheckCircle2, ShieldCheck, Truck, PackageCheck, 
  ArrowRight, MessageSquare, Copy, ExternalLink, ChevronRight,
  Send
} from 'lucide-react';
import { toast } from 'react-toastify';
import { invalidateProductsCache } from '@/lib/products-cache';
import { addCustomerMovement } from '@/lib/customers-service';
import { formatCurrency, formatDateTime } from '@/lib/formatters';
import { 
  OrderStatus, 
  ORDER_STATUS_CONFIG, 
  getOrderDeliveryType, 
  getNextOrderStatus, 
  generateOrderWhatsAppMessage, 
  getOrderWhatsAppUrl 
} from '@/lib/order-pipeline';
import { formatArgentineWhatsAppPhone } from '@/lib/pos-service';

export default function DashboardOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');
  const [channelFilter, setChannelFilter] = useState<'all' | 'web' | 'pos'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal de Detalle
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [orderDetails, setOrderDetails] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Estado del mensaje interactivo de WhatsApp en el modal
  const [waTargetStatus, setWaTargetStatus] = useState<OrderStatus>('pending');
  const [waCustomPhone, setWaCustomPhone] = useState<string>('');
  const [copiedWaMessage, setCopiedWaMessage] = useState(false);

  useEffect(() => {
    fetchOrders();

    // Suscripción en tiempo real a nuevos pedidos o cambios de estado
    const realtimeChannel = supabase
      .channel('realtime_orders_dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
        console.log('[DISTRIBUIDORA] Cambio detectado en pedidos:', payload.eventType);
        fetchOrders(false);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(realtimeChannel);
    };
  }, []);

  async function fetchOrders(showLoader = true) {
    if (showLoader) setLoading(true);
    let cloudOrders: any[] = [];
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) {
        console.warn('Aviso fetching orders en Supabase:', error);
      } else if (data) {
        cloudOrders = data;
      }
    } catch (error: any) {
      console.warn('Aviso al cargar pedidos de Supabase:', error);
    }

    // Integrar pedidos almacenados localmente (restaurados de backup o ventas POS locales)
    let combined = [...cloudOrders];
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('distribuidora_pos_orders');
        if (raw) {
          const localOrders = JSON.parse(raw);
          if (Array.isArray(localOrders) && localOrders.length > 0) {
            const existingIds = new Set(combined.map((o: any) => o.id));
            const missingLocal = localOrders.filter((lo: any) => !existingIds.has(lo.id));
            if (missingLocal.length > 0) {
              combined = [...combined, ...missingLocal];
            }
          }
        }
      } catch {}
    }

    // Ordenar cronológicamente descendente
    combined.sort((a, b) => {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return timeB - timeA;
    });

    setOrders(combined);
    if (showLoader) setLoading(false);
  }

  async function openOrderDetails(order: any) {
    setSelectedOrder(order);
    setWaTargetStatus(order.status as OrderStatus || 'pending');
    setWaCustomPhone(order.customer_phone || '');
    setLoadingDetails(true);

    // Si la orden ya trae ítems embebidos (ej: proveniente de POS o backup local)
    if (Array.isArray(order.items) && order.items.length > 0) {
      const mapped = order.items.map((it: any) => ({
        id: it.id || it.product_id,
        quantity: it.quantity,
        price_at_purchase: it.price || it.price_at_purchase,
        products: {
          name: it.name || it.product_name || 'Producto',
          image_url_1: it.image_url_1,
        },
      }));
      setOrderDetails(mapped);
    }

    try {
      const { data, error } = await supabase
        .from('order_items')
        .select('*, products(name, image_url_1)')
        .eq('order_id', order.id);
        
      if (!error && data && data.length > 0) {
        setOrderDetails(data);
      }
    } catch (err) {
      console.warn('Aviso fetching order items:', err);
    } finally {
      setLoadingDetails(false);
    }
  }

  async function updateOrderStatus(orderToUpdate: any, newStatus: OrderStatus) {
    if (!orderToUpdate) return;
    try {
      const previousStatus = orderToUpdate.status;

      // 1. Actualizar estado en Supabase
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderToUpdate.id);

      if (error) {
        console.warn('Aviso actualizando orden remota:', error.message);
      }

      // 1b. Sincronizar en localStorage
      if (typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem('distribuidora_pos_orders');
          if (raw) {
            const list = JSON.parse(raw);
            const updated = list.map((o: any) => o.id === orderToUpdate.id ? { ...o, status: newStatus } : o);
            localStorage.setItem('distribuidora_pos_orders', JSON.stringify(updated));
          }
        } catch {}
      }

      // 2. Si se cancela la orden desde un estado activo, reincorporar stock
      if (newStatus === 'cancelled' && previousStatus !== 'cancelled') {
        let itemsToReintegrate = orderDetails;
        if (itemsToReintegrate.length === 0) {
          const { data: fetchedItems } = await supabase
            .from('order_items')
            .select('*')
            .eq('order_id', orderToUpdate.id);
          if (fetchedItems) itemsToReintegrate = fetchedItems;
        }

        for (const item of itemsToReintegrate) {
          try {
            const { data: prod } = await supabase
              .from('products')
              .select('stock')
              .eq('id', item.product_id)
              .single();

            if (prod) {
              const currentStock = Number(prod.stock) || 0;
              const newStock = currentStock + (Number(item.quantity) || 1);
              await supabase.from('products').update({ stock: newStock }).eq('id', item.product_id);
              await supabase.from('stock_movements').insert([{
                product_id: item.product_id,
                type: 'order_cancellation',
                quantity: item.quantity,
                previous_stock: currentStock,
                new_stock: newStock,
                reference_id: orderToUpdate.id,
              }]);
            }
          } catch (errStock) {
            console.warn('Error reincorporando stock en cancelación:', errStock);
          }
        }

        // Si fue una venta fiada a cuenta corriente, desafectar saldo adeudado
        if (orderToUpdate.customer_id && orderToUpdate.payment_method === 'cuenta_corriente') {
          try {
            await addCustomerMovement({
              customer_id: orderToUpdate.customer_id,
              type: 'payment',
              amount: Number(orderToUpdate.total_amount) || 0,
              notes: `Anulación de Pedido #${orderToUpdate.id.slice(0, 8).toUpperCase()}`,
            });
          } catch {}
        }

        invalidateProductsCache();
      }
      
      const updatedOrder = { ...orderToUpdate, status: newStatus };
      if (selectedOrder && selectedOrder.id === orderToUpdate.id) {
        setSelectedOrder(updatedOrder);
        setWaTargetStatus(newStatus);
      }
      setOrders(prev => prev.map(o => o.id === orderToUpdate.id ? updatedOrder : o));

      const config = ORDER_STATUS_CONFIG[newStatus];
      toast.success(`Pedido #${orderToUpdate.id.slice(0, 8).toUpperCase()}: Estado actualizado a "${config?.label || newStatus}"`);
    } catch (err: any) {
      console.error('Error actualizando estado:', err);
      toast.error('Error al actualizar el estado: ' + err.message);
    }
  }

  function handleQuickAdvance(order: any, e: React.MouseEvent) {
    e.stopPropagation();
    const deliveryType = getOrderDeliveryType(order.shipping_address);
    const next = getNextOrderStatus(order.status, deliveryType);
    if (!next) return;
    updateOrderStatus(order, next);
  }

  function handleDirectWhatsAppOpen(order: any, targetStatus?: OrderStatus, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    if (!order.customer_phone) {
      toast.warn('Este pedido no tiene número de teléfono registrado.');
      return;
    }
    const statusToUse = targetStatus || (order.status as OrderStatus);
    const url = getOrderWhatsAppUrl(order, statusToUse, undefined, orderDetails.length > 0 ? orderDetails : undefined);
    window.open(url, '_blank');
  }

  function handleCopyWhatsAppMessage() {
    if (!selectedOrder) return;
    const msg = generateOrderWhatsAppMessage(selectedOrder, waTargetStatus, orderDetails);
    navigator.clipboard.writeText(msg).then(() => {
      setCopiedWaMessage(true);
      toast.success('Mensaje copiado al portapapeles.');
      setTimeout(() => setCopiedWaMessage(false), 2500);
    });
  }

  function handlePrintReceipt(order: any) {
    const printWindow = window.open('', '_blank', 'width=420,height=600');
    if (!printWindow) {
      toast.warn('Permite las ventanas emergentes para imprimir el comprobante.');
      return;
    }
    const itemsHtml = orderDetails.map(item => `
      <div style="display:flex; justify-content:space-between; margin-bottom: 5px; font-size: 13px;">
        <span>${item.quantity}x ${item.products?.name || 'Producto'}</span>
        <span>$${(Number(item.price_at_purchase) * item.quantity).toFixed(2)}</span>
      </div>
    `).join('');

    const statusConfig = ORDER_STATUS_CONFIG[order.status as OrderStatus] || ORDER_STATUS_CONFIG.pending;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Ticket Pedido #${order.id.slice(0, 8)}</title>
          <style>
            body { font-family: monospace, sans-serif; padding: 18px; max-width: 320px; margin: 0 auto; color: #111; }
            h2 { text-align: center; margin: 0 0 6px 0; font-size: 18px; }
            .line { border-top: 1px dashed #333; margin: 10px 0; }
            .total { font-size: 15px; font-weight: bold; display: flex; justify-content: space-between; }
            .status-badge { text-align: center; font-size: 12px; font-weight: bold; padding: 4px; background: #eee; margin: 6px 0; }
          </style>
        </head>
        <body>
          <h2>DISTRIBUIDORA EXPRESS</h2>
          <p style="text-align:center;font-size:12px;margin:0;">Comprobante de Venta (${order.channel === 'pos' ? 'Punto de Venta Local' : 'Tienda Web'})</p>
          <div class="status-badge">ESTADO: ${statusConfig.label.toUpperCase()}</div>
          <div class="line"></div>
          <p style="font-size:12px;margin:3px 0;"><strong>Pedido:</strong> #${order.id.slice(0, 8).toUpperCase()}</p>
          <p style="font-size:12px;margin:3px 0;"><strong>Fecha:</strong> ${new Date(order.created_at).toLocaleString('es-AR')}</p>
          <p style="font-size:12px;margin:3px 0;"><strong>Cliente:</strong> ${order.customer_name}</p>
          <p style="font-size:12px;margin:3px 0;"><strong>Entrega:</strong> ${order.shipping_address || 'Retiro en mostrador'}</p>
          <p style="font-size:12px;margin:3px 0;"><strong>Pago:</strong> ${order.payment_method || 'Mercado Pago'}</p>
          <div class="line"></div>
          ${itemsHtml || '<p style="font-size:12px;">Sin items detallados</p>'}
          <div class="line"></div>
          <div class="total">
            <span>TOTAL:</span>
            <span>${formatCurrency(Number(order.total_amount))}</span>
          </div>
          <div class="line"></div>
          <p style="text-align:center;font-size:11px;margin-top:14px;">¡Gracias por su compra!</p>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  function getPaymentBadge(method: string | undefined) {
    const m = (method || '').toLowerCase();
    if (m === 'cash' || m === 'efectivo') {
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">💵 Efectivo</span>;
    }
    if (m === 'debit') {
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300">💳 Débito</span>;
    }
    if (m === 'credit') {
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300">💳 Crédito</span>;
    }
    if (m === 'transfer' || m === 'qr') {
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300">📱 QR / Transfer.</span>;
    }
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-cyan-100 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300">⚡ Mercado Pago</span>;
  }

  function getChannelBadge(channel: string | undefined) {
    if (channel === 'pos') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
          <Store className="w-3 h-3" /> Mostrador POS
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
        <Globe className="w-3 h-3" /> Tienda Web
      </span>
    );
  }

  function getDeliveryBadge(shippingAddress: string | undefined) {
    const isPickup = getOrderDeliveryType(shippingAddress) === 'pickup';
    if (isPickup) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
          <Store className="w-3 h-3" /> Retiro Local
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
        <Truck className="w-3 h-3" /> Delivery
      </span>
    );
  }

  function getStatusBadge(statusStr: string | undefined) {
    const normalized = (statusStr || 'pending') as OrderStatus;
    const config = ORDER_STATUS_CONFIG[normalized] || ORDER_STATUS_CONFIG.pending;

    let icon = <Clock className="w-3.5 h-3.5" />;
    if (normalized === 'preparing') icon = <PackageCheck className="w-3.5 h-3.5" />;
    if (normalized === 'ready_pickup') icon = <Store className="w-3.5 h-3.5" />;
    if (normalized === 'in_delivery') icon = <Truck className="w-3.5 h-3.5" />;
    if (normalized === 'delivered' || normalized === 'accepted') icon = <CheckCircle2 className="w-3.5 h-3.5" />;
    if (normalized === 'cancelled') icon = <Ban className="w-3.5 h-3.5" />;

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-full border ${config.badgeClass}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${config.bgLight} animate-pulse`} />
        {icon}
        <span>{config.shortLabel.toUpperCase()}</span>
      </span>
    );
  }

  // Contadores para el Pipeline
  const counts = {
    all: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    preparing: orders.filter(o => o.status === 'preparing').length,
    ready_pickup: orders.filter(o => o.status === 'ready_pickup').length,
    in_delivery: orders.filter(o => o.status === 'in_delivery').length,
    delivered: orders.filter(o => o.status === 'delivered' || o.status === 'accepted').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
  };

  const filteredOrders = orders.filter(o => {
    // Filtro por estado del pipeline
    if (statusFilter !== 'all') {
      if (statusFilter === 'delivered') {
        if (o.status !== 'delivered' && o.status !== 'accepted') return false;
      } else if (o.status !== statusFilter) {
        return false;
      }
    }

    // Filtro por canal (web vs POS)
    if (channelFilter === 'pos' && o.channel !== 'pos') return false;
    if (channelFilter === 'web' && o.channel === 'pos') return false;

    // Búsqueda por texto
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = o.customer_name?.toLowerCase().includes(q);
      const matchEmail = o.customer_email?.toLowerCase().includes(q);
      const matchPhone = o.customer_phone?.toLowerCase().includes(q);
      const matchId = o.id?.toLowerCase().includes(q);
      const matchPayment = o.mp_payment_id?.toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchPhone && !matchId && !matchPayment) return false;
    }

    return true;
  });

  return (
    <div className="h-full flex flex-col min-h-0 space-y-4">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-shrink-0">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>Pipeline de Pedidos</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-primary dark:text-blue-400 font-bold border border-blue-200 dark:border-blue-800">
              WhatsApp Ready
            </span>
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Circuito secuencial de preparación, despacho y avisos automatizados por WhatsApp
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchOrders(true)}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            title="Actualizar pedidos"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-primary' : ''}`} />
            <span>Refrescar</span>
          </button>

          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 px-3 py-1.5 rounded-lg shadow-xs">
            Total: {orders.length} pedidos
          </span>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xs border border-gray-200 dark:border-gray-800 overflow-hidden flex-1 flex flex-col min-h-0">
        
        {/* Pestañas del Pipeline Logístico */}
        <div className="p-3 bg-gray-50/80 dark:bg-gray-800/40 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-1.5 flex-nowrap min-w-max">
            {/* Todos */}
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'all'
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700'
              }`}
            >
              <span>Todos</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${statusFilter === 'all' ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>
                {counts.all}
              </span>
            </button>

            {/* 1. Nuevos / Pendientes */}
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'pending'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-white dark:bg-gray-900 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>📥 Nuevos</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${statusFilter === 'pending' ? 'bg-white/25 text-white' : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'}`}>
                {counts.pending}
              </span>
            </button>

            {/* 2. En Preparación */}
            <button
              onClick={() => setStatusFilter('preparing')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'preparing'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white dark:bg-gray-900 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-blue-200 dark:border-blue-800/50'
              }`}
            >
              <PackageCheck className="w-3.5 h-3.5" />
              <span>📦 En Armado</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${statusFilter === 'preparing' ? 'bg-white/25 text-white' : 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300'}`}>
                {counts.preparing}
              </span>
            </button>

            {/* 3a. Listos para Retiro */}
            <button
              onClick={() => setStatusFilter('ready_pickup')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'ready_pickup'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-white dark:bg-gray-900 text-purple-700 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 border border-purple-200 dark:border-purple-800/50'
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              <span>🏪 Listos Retiro</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${statusFilter === 'ready_pickup' ? 'bg-white/25 text-white' : 'bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300'}`}>
                {counts.ready_pickup}
              </span>
            </button>

            {/* 3b. En Reparto */}
            <button
              onClick={() => setStatusFilter('in_delivery')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'in_delivery'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white dark:bg-gray-900 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/50'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>🚚 En Reparto</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${statusFilter === 'in_delivery' ? 'bg-white/25 text-white' : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300'}`}>
                {counts.in_delivery}
              </span>
            </button>

            {/* 4. Entregados / Completados */}
            <button
              onClick={() => setStatusFilter('delivered')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'delivered'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white dark:bg-gray-900 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>✅ Entregados</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${statusFilter === 'delivered' ? 'bg-white/25 text-white' : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'}`}>
                {counts.delivered}
              </span>
            </button>

            {/* 5. Cancelados */}
            <button
              onClick={() => setStatusFilter('cancelled')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'cancelled'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-white dark:bg-gray-900 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50'
              }`}
            >
              <Ban className="w-3.5 h-3.5" />
              <span>❌ Cancelados</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${statusFilter === 'cancelled' ? 'bg-white/25 text-white' : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300'}`}>
                {counts.cancelled}
              </span>
            </button>
          </div>
        </div>

        {/* Sub-barra con Canales y Buscador */}
        <div className="p-3.5 border-b border-gray-200 dark:border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-gray-900 flex-shrink-0">
          <div className="flex items-center gap-2">
            {/* Selector de Canales */}
            <div className="inline-flex p-0.5 bg-gray-100 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setChannelFilter('all')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  channelFilter === 'all'
                    ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-xs'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Todos los Canales ({orders.length})
              </button>
              <button
                onClick={() => setChannelFilter('web')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  channelFilter === 'web'
                    ? 'bg-white dark:bg-gray-900 text-sky-600 dark:text-sky-400 shadow-xs'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Globe className="w-3 h-3" /> Web ({orders.filter(o => o.channel !== 'pos').length})
              </button>
              <button
                onClick={() => setChannelFilter('pos')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  channelFilter === 'pos'
                    ? 'bg-white dark:bg-gray-900 text-purple-600 dark:text-purple-400 shadow-xs'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Store className="w-3 h-3" /> Mostrador POS ({orders.filter(o => o.channel === 'pos').length})
              </button>
            </div>
          </div>

          {/* Campo de Búsqueda */}
          <div className="relative w-full md:w-72 flex-shrink-0">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por cliente, teléfono o ID..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>
        </div>

        {/* Tabla de Pedidos */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="p-16 text-center text-gray-600 dark:text-gray-300 font-medium flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-6 h-6 animate-spin text-primary" />
              <span>Cargando pedidos del pipeline...</span>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
              <ShoppingBag className="w-14 h-14 text-gray-300 dark:text-gray-700" />
              <p className="text-gray-800 dark:text-gray-200 font-bold text-base">
                No hay pedidos en la etapa &quot;{statusFilter === 'all' ? 'seleccionada' : ORDER_STATUS_CONFIG[statusFilter]?.label}&quot;.
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md">
                Los pedidos del checkout web y las ventas de caja se clasifican automáticamente en cada etapa del pipeline.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-gray-100 dark:bg-gray-800/90 backdrop-blur-xs z-10 border-b border-gray-200 dark:border-gray-700">
                <tr className="text-gray-700 dark:text-gray-200 text-xs font-bold uppercase tracking-wider">
                  <th className="py-3 px-3">ID Pedido</th>
                  <th className="py-3 px-3">Canal & Entrega</th>
                  <th className="py-3 px-3">Cliente</th>
                  <th className="py-3 px-3">Pago</th>
                  <th className="py-3 px-3">Fecha</th>
                  <th className="py-3 px-3">Total</th>
                  <th className="py-3 px-3">Estado</th>
                  <th className="py-3 px-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredOrders.map((order) => {
                  const deliveryType = getOrderDeliveryType(order.shipping_address);
                  const nextStatus = getNextOrderStatus(order.status, deliveryType);
                  const nextConfig = nextStatus ? ORDER_STATUS_CONFIG[nextStatus] : null;

                  return (
                    <tr 
                      key={order.id} 
                      onClick={() => openOrderDetails(order)}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-3 text-xs font-mono font-bold text-gray-700 dark:text-gray-300 whitespace-nowrap">
                        #{order.id.slice(0, 8).toUpperCase()}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex flex-col gap-1 items-start">
                          {getChannelBadge(order.channel)}
                          {getDeliveryBadge(order.shipping_address)}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-gray-900 dark:text-white text-sm truncate max-w-[190px]" title={order.customer_name}>{order.customer_name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                          {order.customer_phone ? (
                            <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-mono font-semibold">
                              <Phone className="w-3 h-3" /> {order.customer_phone}
                            </span>
                          ) : (
                            <span className="truncate max-w-[180px]">{order.customer_email}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        {getPaymentBadge(order.payment_method)}
                      </td>
                      <td className="py-3 px-3 text-xs text-gray-600 dark:text-gray-400 font-medium whitespace-nowrap">
                        {formatDateTime(order.created_at)}
                      </td>
                      <td className="py-3 px-3 font-black text-gray-900 dark:text-white text-sm whitespace-nowrap">
                        {formatCurrency(Number(order.total_amount) || 0)}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        {getStatusBadge(order.status)}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Botón WhatsApp directo */}
                          {order.customer_phone && (
                            <button
                              onClick={(e) => handleDirectWhatsAppOpen(order, undefined, e)}
                              title={`Enviar aviso WhatsApp (+${formatArgentineWhatsAppPhone(order.customer_phone)})`}
                              className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition-colors cursor-pointer"
                            >
                              <MessageSquare className="w-4 h-4" />
                            </button>
                          )}

                          {/* Botón de Avanzar Etapa en Pipeline */}
                          {nextStatus && nextConfig && (
                            <button
                              onClick={(e) => handleQuickAdvance(order, e)}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-primary text-white hover:bg-blue-700 shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
                              title={`Avanzar a: ${nextConfig.label}`}
                            >
                              <span>Avanzar</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Ver Detalles */}
                          <button 
                            onClick={() => openOrderDetails(order)}
                            className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                          >
                            Detalle
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal de Detalles del Pedido y Notificaciones WhatsApp */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Cabecera del Modal */}
            <div className="p-5 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50/70 dark:bg-gray-800/50">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xl font-extrabold text-gray-900 dark:text-white">
                    Pedido #{selectedOrder.id.slice(0, 8).toUpperCase()}
                  </h3>
                  {getChannelBadge(selectedOrder.channel)}
                  {getDeliveryBadge(selectedOrder.shipping_address)}
                  {getStatusBadge(selectedOrder.status)}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Registrado el {formatDateTime(selectedOrder.created_at)}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePrintReceipt(selectedOrder)}
                  className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-bold shadow-2xs"
                  title="Imprimir ticket de venta"
                >
                  <Printer className="w-4 h-4" />
                  <span className="hidden sm:inline">Imprimir</span>
                </button>

                <button 
                  onClick={() => setSelectedOrder(null)}
                  className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Contenido del Modal */}
            <div className="p-6 overflow-y-auto space-y-6">
              
              {/* Stepper Visual de Etapas del Pipeline */}
              <div className="bg-gray-50 dark:bg-gray-800/40 p-4 rounded-2xl border border-gray-200 dark:border-gray-700/60">
                <span className="text-[11px] font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-3">
                  Circuito Logístico del Pedido
                </span>

                {selectedOrder.status === 'cancelled' ? (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl flex items-center gap-3 text-rose-800 dark:text-rose-300 text-xs">
                    <Ban className="w-5 h-5 flex-shrink-0 text-rose-600 dark:text-rose-400" />
                    <div>
                      <p className="font-bold">Este pedido se encuentra CANCELADO</p>
                      <p className="text-[11px] opacity-80 mt-0.5">El stock reservado fue reincorporado automáticamente al inventario general y registrado en Kardex.</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {/* Paso 1: Recibido */}
                    {(() => {
                      const isDone = ['preparing', 'ready_pickup', 'in_delivery', 'delivered', 'accepted'].includes(selectedOrder.status);
                      const isCurrent = selectedOrder.status === 'pending';
                      return (
                        <div className={`p-2.5 rounded-xl border text-center transition-all ${
                          isCurrent 
                            ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-400 dark:border-amber-700 text-amber-900 dark:text-amber-200 ring-2 ring-amber-400/20' 
                            : isDone
                            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300'
                            : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-400'
                        }`}>
                          <div className="flex justify-center mb-1">
                            {isDone ? <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <Clock className="w-4 h-4" />}
                          </div>
                          <p className="font-bold text-xs leading-tight">1. Recibido</p>
                          <span className="text-[10px] block opacity-80 mt-0.5 font-medium">Checkout Web</span>
                        </div>
                      );
                    })()}

                    {/* Paso 2: En Preparación */}
                    {(() => {
                      const isDone = ['ready_pickup', 'in_delivery', 'delivered', 'accepted'].includes(selectedOrder.status);
                      const isCurrent = selectedOrder.status === 'preparing';
                      return (
                        <div className={`p-2.5 rounded-xl border text-center transition-all ${
                          isCurrent 
                            ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-400 dark:border-blue-700 text-blue-900 dark:text-blue-200 ring-2 ring-blue-400/20' 
                            : isDone
                            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300'
                            : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-400'
                        }`}>
                          <div className="flex justify-center mb-1">
                            {isDone ? <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <PackageCheck className="w-4 h-4" />}
                          </div>
                          <p className="font-bold text-xs leading-tight">2. En Armado</p>
                          <span className="text-[10px] block opacity-80 mt-0.5 font-medium">Depósito</span>
                        </div>
                      );
                    })()}

                    {/* Paso 3: Listo p/ Retiro o En Reparto */}
                    {(() => {
                      const isPickup = getOrderDeliveryType(selectedOrder.shipping_address) === 'pickup';
                      const isDone = ['delivered', 'accepted'].includes(selectedOrder.status);
                      const isCurrent = selectedOrder.status === 'ready_pickup' || selectedOrder.status === 'in_delivery';
                      return (
                        <div className={`p-2.5 rounded-xl border text-center transition-all ${
                          isCurrent 
                            ? (isPickup ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-400 dark:border-purple-700 text-purple-900 dark:text-purple-200 ring-2 ring-purple-400/20' : 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-400 dark:border-indigo-700 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-400/20')
                            : isDone
                            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300'
                            : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-400'
                        }`}>
                          <div className="flex justify-center mb-1">
                            {isDone ? <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : isPickup ? <Store className="w-4 h-4" /> : <Truck className="w-4 h-4" />}
                          </div>
                          <p className="font-bold text-xs leading-tight">{isPickup ? '3. Listo Retiro' : '3. En Reparto'}</p>
                          <span className="text-[10px] block opacity-80 mt-0.5 font-medium">{isPickup ? 'Mostrador' : 'En Flete'}</span>
                        </div>
                      );
                    })()}

                    {/* Paso 4: Entregado */}
                    {(() => {
                      const isCurrent = selectedOrder.status === 'delivered' || selectedOrder.status === 'accepted';
                      return (
                        <div className={`p-2.5 rounded-xl border text-center transition-all ${
                          isCurrent 
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-400/20' 
                            : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-400'
                        }`}>
                          <div className="flex justify-center mb-1">
                            <CheckCircle2 className={`w-4 h-4 ${isCurrent ? 'text-emerald-600 dark:text-emerald-400' : ''}`} />
                          </div>
                          <p className="font-bold text-xs leading-tight">4. Entregado</p>
                          <span className="text-[10px] block opacity-80 mt-0.5 font-medium">Finalizado</span>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Información del Cliente & Entrega */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700/60">
                <div className="space-y-1.5 text-sm">
                  <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">Cliente</span>
                  <p className="font-bold text-gray-900 dark:text-white">{selectedOrder.customer_name}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-300 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-gray-400" /> {selectedOrder.customer_email}</p>
                  {selectedOrder.customer_phone && (
                    <p className="text-xs text-gray-600 dark:text-gray-300 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-gray-400" /> 
                      <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">{selectedOrder.customer_phone}</span>
                    </p>
                  )}
                </div>

                <div className="space-y-1.5 text-sm">
                  <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">Entrega & Pago</span>
                  <p className="text-xs text-gray-700 dark:text-gray-300 flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                    <span className="font-medium">{selectedOrder.shipping_address || 'Retiro en mostrador'}</span>
                  </p>
                  <div className="pt-1 flex flex-wrap items-center gap-2">
                    {getPaymentBadge(selectedOrder.payment_method)}
                    <span className="text-[11px] text-gray-500 dark:text-gray-400 font-mono">
                      Ref: {selectedOrder.mp_payment_id || 'S/N'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Items Comprados */}
              <div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center justify-between">
                  <span>Productos del Pedido</span>
                  <span className="text-xs font-normal text-gray-500">{orderDetails.length} items</span>
                </h4>

                {loadingDetails ? (
                  <div className="text-center py-6 text-sm text-gray-500 flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                    <span>Cargando productos...</span>
                  </div>
                ) : orderDetails.length === 0 ? (
                  <div className="text-center py-4 text-xs text-gray-500 bg-gray-50 dark:bg-gray-800/40 rounded-xl p-4 border border-dashed border-gray-200 dark:border-gray-700">
                    Comprobante sin desglose individual de artículos registrado en la venta.
                  </div>
                ) : (
                  <div className="space-y-2 border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden divide-y divide-gray-100 dark:divide-gray-800">
                    {orderDetails.map((item, idx) => (
                      <div key={idx} className="p-3 flex items-center justify-between text-sm hover:bg-gray-50 dark:hover:bg-gray-800/40">
                        <div className="flex items-center gap-3">
                          {item.products?.image_url_1 ? (
                            <img src={item.products.image_url_1} alt="Producto" className="w-10 h-10 object-contain rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700" />
                          ) : (
                            <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-center text-[10px] text-gray-400 font-bold">POS</div>
                          )}
                          <div>
                            <p className="font-bold text-gray-900 dark:text-white">{item.products?.name || 'Producto'}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{formatCurrency(Number(item.price_at_purchase))} x {item.quantity} un.</p>
                          </div>
                        </div>
                        <div className="font-bold text-gray-900 dark:text-white">
                          {formatCurrency(Number(item.price_at_purchase) * item.quantity)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Subtotal y Total */}
                <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-800 space-y-1.5">
                  {selectedOrder.discount_amount > 0 && (
                    <div className="flex justify-between items-center text-xs text-emerald-600 dark:text-emerald-400">
                      <span>Descuento aplicado:</span>
                      <span>-{formatCurrency(Number(selectedOrder.discount_amount))}</span>
                    </div>
                  )}
                  {selectedOrder.surcharge_amount > 0 && (
                    <div className="flex justify-between items-center text-xs text-amber-600 dark:text-amber-400">
                      <span>Recargo / Comisión:</span>
                      <span>+{formatCurrency(Number(selectedOrder.surcharge_amount))}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-1">
                    <span className="font-bold text-gray-900 dark:text-white text-base">Total del Pedido:</span>
                    <span className="font-black text-2xl text-primary dark:text-blue-400">
                      {formatCurrency(Number(selectedOrder.total_amount) || 0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* SECCIÓN INTERACTIVA: NOTIFICADOR POR WHATSAPP */}
              <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-2xs">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-emerald-950 dark:text-emerald-200">
                        Notificación al Cliente por WhatsApp
                      </h4>
                      <p className="text-[11px] text-emerald-800/80 dark:text-emerald-400/80">
                        Mensaje automático pre-armado con datos y estado del pedido
                      </p>
                    </div>
                  </div>

                  {/* Campo de Teléfono editable */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-emerald-900 dark:text-emerald-300">Tel:</span>
                    <input
                      type="text"
                      value={waCustomPhone}
                      onChange={(e) => setWaCustomPhone(e.target.value)}
                      placeholder="Ej: 11-4455-6677"
                      className="px-2.5 py-1 text-xs font-mono font-bold rounded-lg border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-36 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Selector de Plantilla según Etapa */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 self-center mr-1">
                    Plantilla:
                  </span>
                  {(['pending', 'preparing', 'ready_pickup', 'in_delivery', 'delivered', 'cancelled'] as OrderStatus[]).map((st) => {
                    const cfg = ORDER_STATUS_CONFIG[st];
                    const isSelected = waTargetStatus === st;
                    return (
                      <button
                        key={st}
                        onClick={() => setWaTargetStatus(st)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-emerald-100 dark:hover:bg-gray-700 border border-emerald-200 dark:border-gray-700'
                        }`}
                      >
                        {cfg.shortLabel}
                      </button>
                    );
                  })}
                </div>

                {/* Previsualización del Mensaje tipo WhatsApp */}
                <div className="p-3 bg-white dark:bg-gray-900 rounded-xl border border-emerald-200 dark:border-emerald-900/60 shadow-2xs">
                  <p className="text-xs text-gray-700 dark:text-gray-200 whitespace-pre-wrap font-sans leading-relaxed">
                    {generateOrderWhatsAppMessage(selectedOrder, waTargetStatus, orderDetails)}
                  </p>
                </div>

                {/* Botones de Envío y Copia */}
                <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                  <button
                    onClick={handleCopyWhatsAppMessage}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 transition-colors cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedWaMessage ? '¡Copiado!' : 'Copiar Texto'}</span>
                  </button>

                  <a
                    href={getOrderWhatsAppUrl(selectedOrder, waTargetStatus, waCustomPhone, orderDetails)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Abrir Chat de WhatsApp</span>
                    <ExternalLink className="w-3 h-3 opacity-80" />
                  </a>
                </div>
              </div>

              {/* Acciones de Cambio de Estado en Pipeline */}
              <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-2.5">
                  Cambiar Etapa del Pedido:
                </span>
                
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => updateOrderStatus(selectedOrder, 'pending')}
                    disabled={selectedOrder.status === 'pending'}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    <Clock className="w-3.5 h-3.5" /> Pendiente / Nuevo
                  </button>

                  <button
                    onClick={() => updateOrderStatus(selectedOrder, 'preparing')}
                    disabled={selectedOrder.status === 'preparing'}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    <PackageCheck className="w-3.5 h-3.5" /> En Preparación
                  </button>

                  <button
                    onClick={() => updateOrderStatus(selectedOrder, 'ready_pickup')}
                    disabled={selectedOrder.status === 'ready_pickup'}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    <Store className="w-3.5 h-3.5" /> Listo para Retiro
                  </button>

                  <button
                    onClick={() => updateOrderStatus(selectedOrder, 'in_delivery')}
                    disabled={selectedOrder.status === 'in_delivery'}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    <Truck className="w-3.5 h-3.5" /> En Reparto
                  </button>

                  <button
                    onClick={() => updateOrderStatus(selectedOrder, 'delivered')}
                    disabled={selectedOrder.status === 'delivered' || selectedOrder.status === 'accepted'}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Entregado con Éxito
                  </button>

                  <button
                    onClick={() => {
                      if (confirm('¿Estás seguro de cancelar este pedido? Se reincorporará el stock a los productos correspondientes.')) {
                        updateOrderStatus(selectedOrder, 'cancelled');
                      }
                    }}
                    disabled={selectedOrder.status === 'cancelled'}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-40 transition-colors cursor-pointer ml-auto"
                  >
                    <Ban className="w-3.5 h-3.5" /> Cancelar Pedido
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
