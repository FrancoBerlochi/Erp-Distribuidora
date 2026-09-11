/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Search, 
  RotateCcw, 
  ArrowLeft, 
  Check, 
  AlertCircle, 
  Minus, 
  Plus, 
  DollarSign, 
  Receipt,
  Users,
  Banknote,
  Wallet,
  ArrowLeftRight
} from 'lucide-react';
import { toast } from 'react-toastify';
import { searchOrdersForReturn, executePOSReturn, POSReturn } from '@/lib/returns-service';

interface POSReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (returnRecord: POSReturn) => void;
  cashierName: string;
  activeCashRegisterId?: string;
}

export default function POSReturnModal({
  isOpen,
  onClose,
  onSuccess,
  cashierName,
  activeCashRegisterId,
}: POSReturnModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

  // Cantidades a devolver por producto: { [productId]: qty }
  const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({});
  const [reason, setReason] = useState('Cambio de producto / arrepentimiento del cliente');
  const [refundMethod, setRefundMethod] = useState<'efectivo' | 'cuenta_corriente' | 'transferencia' | 'otro'>('efectivo');
  const [processing, setProcessing] = useState(false);

  const formatMoney = (val: number) => `$${val.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;

  // Cargar órdenes al abrir o buscar
  const loadOrders = async (q: string = '') => {
    setLoading(true);
    try {
      const results = await searchOrdersForReturn(q);
      setOrders(results);
    } catch (err) {
      console.error(err);
      toast.error('Error buscando comprobantes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadOrders('');
      setSelectedOrder(null);
      setReturnQuantities({});
      setSearchQuery('');
    }
  }, [isOpen]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadOrders(searchQuery);
  };

  const handleSelectOrder = (order: any) => {
    setSelectedOrder(order);
    // Por defecto método de reintegro igual al original si es posible
    if (order.payment_method === 'cuenta_corriente' && order.customer_id) {
      setRefundMethod('cuenta_corriente');
    } else {
      setRefundMethod('efectivo');
    }

    // Inicializar cantidades devueltas en 0
    const initialQty: Record<string, number> = {};
    (order.items || []).forEach((it: any) => {
      initialQty[it.product_id] = 0;
    });
    setReturnQuantities(initialQty);
  };

  // Stepper de cantidades
  const setQuantity = (productId: string, qty: number, maxQty: number) => {
    const clamped = Math.max(0, Math.min(maxQty, qty));
    setReturnQuantities((prev) => ({
      ...prev,
      [productId]: clamped,
    }));
  };

  // Marcar todos los ítems para anulación total
  const handleSelectAll = () => {
    if (!selectedOrder) return;
    const allQty: Record<string, number> = {};
    (selectedOrder.items || []).forEach((it: any) => {
      allQty[it.product_id] = it.quantity;
    });
    setReturnQuantities(allQty);
  };

  // Desmarcar todo
  const handleDeselectAll = () => {
    if (!selectedOrder) return;
    const zeroQty: Record<string, number> = {};
    (selectedOrder.items || []).forEach((it: any) => {
      zeroQty[it.product_id] = 0;
    });
    setReturnQuantities(zeroQty);
  };

  // Total a reembolsar
  const totalRefundAmount = useMemo(() => {
    if (!selectedOrder) return 0;
    return (selectedOrder.items || []).reduce((acc: number, it: any) => {
      const qty = returnQuantities[it.product_id] || 0;
      return acc + qty * it.price;
    }, 0);
  }, [selectedOrder, returnQuantities]);

  const totalItemsReturned = useMemo(() => {
    return Object.values(returnQuantities).reduce((acc, qty) => acc + qty, 0);
  }, [returnQuantities]);

  // Ejecutar Devolución
  const handleConfirmReturn = async () => {
    if (!selectedOrder) return;

    if (totalItemsReturned === 0) {
      toast.warn('Debes seleccionar al menos un producto a devolver');
      return;
    }

    const itemsToReturn = (selectedOrder.items || [])
      .filter((it: any) => (returnQuantities[it.product_id] || 0) > 0)
      .map((it: any) => ({
        product_id: it.product_id,
        product_name: it.name,
        quantity_returned: returnQuantities[it.product_id],
        price_at_purchase: it.price,
      }));

    setProcessing(true);
    try {
      const result = await executePOSReturn({
        order_id: selectedOrder.id,
        order_code: selectedOrder.order_code,
        customer_id: selectedOrder.customer_id,
        customer_name: selectedOrder.customer_name,
        refund_method: refundMethod,
        reason,
        cashier_name: cashierName,
        cash_register_id: activeCashRegisterId,
        items: itemsToReturn,
      });

      toast.success(`Devolución de ${formatMoney(result.total_refunded)} registrada con éxito`);
      onClose();
      onSuccess(result);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Error al procesar la devolución');
    } finally {
      setProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white dark:bg-gray-900 rounded-3xl overflow-hidden shadow-2xl max-w-2xl w-full border border-gray-200 dark:border-gray-800 flex flex-col max-h-[92vh]">
        {/* Cabecera Modal */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {selectedOrder && (
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 mr-1"
                title="Volver al buscador"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div className="w-8 h-8 rounded-xl bg-red-50 dark:bg-red-950/60 text-[#dc2626] flex items-center justify-center">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-gray-900 dark:text-white">
                {selectedOrder ? `Devolución Ticket #${selectedOrder.order_code}` : 'Devoluciones y Notas de Crédito'}
              </h3>
              <p className="text-[11px] text-gray-500">
                {selectedOrder ? 'Selecciona productos a reincorporar al stock' : 'Busca el comprobante de venta a anular o devolver'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CONTENIDO 1: BUSCADOR DE COMPROBANTES PREVIOS */}
        {!selectedOrder ? (
          <div className="flex flex-col flex-1 min-h-0">
            <form onSubmit={handleSearchSubmit} className="p-3 border-b border-gray-100 dark:border-gray-800 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por código de ticket (#XYZ), cliente o ID..."
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#dc2626]"
                />
              </div>
              <button
                type="submit"
                className="bg-[#dc2626] hover:bg-red-700 text-white font-bold px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer"
              >
                Buscar
              </button>
            </form>

            {/* Listado de tickets recientes */}
            <div className="p-3 overflow-y-auto flex-1 space-y-2">
              {loading ? (
                <div className="p-8 text-center text-gray-400 text-xs font-bold">
                  Buscando comprobantes...
                </div>
              ) : orders.length === 0 ? (
                <div className="p-8 text-center text-gray-400 space-y-2">
                  <Receipt className="w-8 h-8 mx-auto text-gray-300" />
                  <p className="text-xs font-bold">No se encontraron ventas para devolver</p>
                  <p className="text-[11px]">Verifica el código del comprobante ingresado.</p>
                </div>
              ) : (
                orders.map((ord) => (
                  <button
                    key={ord.id}
                    type="button"
                    onClick={() => handleSelectOrder(ord)}
                    className="w-full text-left p-3 rounded-2xl border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all flex items-center justify-between gap-3 cursor-pointer group"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-xs text-gray-900 dark:text-white">
                          Ticket #{ord.order_code}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {new Date(ord.created_at).toLocaleDateString('es-AR')}{' '}
                          {new Date(ord.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                          {ord.payment_method?.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-gray-700 dark:text-gray-300 font-bold mt-0.5 truncate">
                        Cliente: {ord.customer_name}
                      </p>
                      <p className="text-[11px] text-gray-400 truncate mt-0.5">
                        {ord.items?.map((it: any) => `${it.quantity}x ${it.name}`).join(', ') || 'Sin detalle'}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-black text-sm text-[#dc2626] block">
                        {formatMoney(ord.total_amount)}
                      </span>
                      <span className="text-xs font-bold text-gray-500 group-hover:text-[#dc2626] transition-colors">
                        Seleccionar →
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        ) : (
          /* CONTENIDO 2: FORMULARIO DE DEVOLUCIÓN DEL TICKET SELECCIONADO */
          <div className="flex flex-col flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
            {/* Info del Ticket */}
            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-2xl border border-gray-200 dark:border-gray-800 flex justify-between items-center text-xs">
              <div>
                <span className="text-gray-500 block text-[10px]">Comprobante Seleccionado:</span>
                <span className="font-black text-sm text-gray-900 dark:text-white">
                  Ticket #{selectedOrder.order_code}
                </span>
                <span className="text-gray-400 block text-[11px]">
                  Cliente: <strong>{selectedOrder.customer_name}</strong> • Pago: {selectedOrder.payment_method?.toUpperCase()}
                </span>
              </div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 font-bold px-2.5 py-1.5 rounded-xl text-xs cursor-pointer hover:bg-red-100"
                >
                  Anular Todo
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className="border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 font-bold px-2.5 py-1.5 rounded-xl text-xs cursor-pointer hover:bg-gray-100"
                >
                  Limpiar
                </button>
              </div>
            </div>

            {/* Selector de Ítems a Devolver */}
            <div className="space-y-2">
              <label className="text-xs font-extrabold text-gray-700 dark:text-gray-300 block">
                Selecciona los productos y unidades a reincorporar al stock:
              </label>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {(selectedOrder.items || []).map((it: any) => {
                  const qtyToReturn = returnQuantities[it.product_id] || 0;
                  const isSelected = qtyToReturn > 0;

                  return (
                    <div
                      key={it.id || it.product_id}
                      className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'border-red-400 bg-red-50/50 dark:bg-red-950/20'
                          : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-xs text-gray-900 dark:text-white truncate">
                          {it.name}
                        </p>
                        <p className="text-[11px] text-gray-400">
                          Comprado: <strong>{it.quantity} u.</strong> a {formatMoney(it.price)} c/u
                        </p>
                      </div>

                      {/* Stepper Cantidad a Devolver */}
                      <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                        <button
                          type="button"
                          onClick={() => setQuantity(it.product_id, qtyToReturn - 1, it.quantity)}
                          className="w-6 h-6 rounded flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-7 text-center font-black text-xs text-gray-900 dark:text-white">
                          {qtyToReturn}
                        </span>
                        <button
                          type="button"
                          onClick={() => setQuantity(it.product_id, qtyToReturn + 1, it.quantity)}
                          className="w-6 h-6 rounded flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Subtotal Devolución */}
                      <div className="text-right min-w-[70px]">
                        <span className="font-black text-xs text-red-600 dark:text-red-400 block">
                          -{formatMoney(qtyToReturn * it.price)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Motivo Comercial de la Devolución */}
            <div>
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1">
                Motivo de la Devolución *:
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl p-2.5 text-xs font-bold text-gray-900 dark:text-white"
              >
                <option value="Cambio de producto / arrepentimiento del cliente">
                  Cambio de producto / arrepentimiento del cliente
                </option>
                <option value="Producto defectuoso / vencido">
                  Producto defectuoso / vencido
                </option>
                <option value="Error de cobro / equivocación del cajero">
                  Error de cobro / equivocación del cajero
                </option>
                <option value="Faltante de mercadería o disconformidad">
                  Faltante de mercadería o disconformidad
                </option>
                <option value="Devolución autorizada por encargado">
                  Devolución autorizada por encargado
                </option>
              </select>
            </div>

            {/* Medio de Reintegro del Dinero */}
            <div>
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1.5">
                Destino del Reintegro:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRefundMethod('efectivo')}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
                    refundMethod === 'efectivo'
                      ? 'border-[#dc2626] bg-red-50/80 dark:bg-red-950/40 text-[#dc2626] font-black shadow-xs'
                      : 'border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  <Banknote className="w-4 h-4" />
                  <span>Efectivo (Egreso de Caja)</span>
                </button>

                <button
                  type="button"
                  disabled={!selectedOrder.customer_id}
                  onClick={() => setRefundMethod('cuenta_corriente')}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
                    refundMethod === 'cuenta_corriente'
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-black shadow-xs'
                      : 'border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 disabled:opacity-30'
                  }`}
                  title={!selectedOrder.customer_id ? 'Requiere cliente con cuenta corriente' : ''}
                >
                  <Wallet className="w-4 h-4" />
                  <span>Acreditar a Cta. Cte.</span>
                </button>
              </div>

              {refundMethod === 'efectivo' && activeCashRegisterId && (
                <p className="text-[10px] text-gray-500 mt-1">
                  Se registrará un egreso automático en la caja registradora activa.
                </p>
              )}
              {refundMethod === 'cuenta_corriente' && selectedOrder.customer_id && (
                <p className="text-[10px] text-amber-700 dark:text-amber-300 mt-1">
                  Se generará una Nota de Crédito restando la deuda de {selectedOrder.customer_name}.
                </p>
              )}
            </div>

            {/* Total a Reintegrar */}
            <div className="p-3 bg-red-50 dark:bg-red-950/40 rounded-2xl border border-red-200 dark:border-red-900 flex justify-between items-center">
              <div>
                <span className="text-[10px] font-bold text-red-700 uppercase block">Total a Reintegrar al Cliente</span>
                <span className="text-xl font-black text-[#dc2626]">{formatMoney(totalRefundAmount)}</span>
              </div>
              <span className="text-xs font-bold text-gray-500">
                {totalItemsReturned} unidades a devolver
              </span>
            </div>
          </div>
        )}

        {/* Pie Modal */}
        {selectedOrder && (
          <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60 flex gap-2">
            <button
              type="button"
              onClick={() => setSelectedOrder(null)}
              className="flex-1 py-2.5 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl text-xs hover:bg-gray-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={processing || totalItemsReturned === 0}
              onClick={handleConfirmReturn}
              className="flex-2 bg-[#dc2626] hover:bg-red-700 disabled:opacity-50 text-white font-extrabold py-2.5 rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{processing ? 'Procesando...' : `Confirmar Devolución (${formatMoney(totalRefundAmount)})`}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
