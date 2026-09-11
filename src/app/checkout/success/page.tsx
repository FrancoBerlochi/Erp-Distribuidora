/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, ArrowRight, LayoutDashboard, ShoppingBag, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('id');
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOrder() {
      if (!orderId) {
        setLoading(false);
        return;
      }
      try {
        const { data } = await supabase
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .single();
        if (data) setOrder(data);
      } catch (err) {
        console.warn('Error fetching order:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchOrder();
  }, [orderId]);

  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl text-center">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-8 md:p-12 shadow-sm">
        <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-950/60 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-12 h-12 text-emerald-600 dark:text-emerald-400" />
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-full text-xs font-bold mb-4">
          <ShieldCheck className="w-3.5 h-3.5" /> Pago Confirmado
        </span>

        <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white mb-3">
          ¡Gracias por tu compra!
        </h1>
        
        <p className="text-gray-700 dark:text-gray-300 font-medium mb-6">
          Tu pago fue procesado correctamente y tu orden ya fue registrada como <span className="font-bold text-amber-600 dark:text-amber-400">Pendiente de envío</span>.
        </p>

        {orderId && (
          <div className="bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 mb-8 text-left space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600 dark:text-gray-400 font-medium">Número de Pedido:</span>
              <span className="font-mono font-bold text-gray-900 dark:text-white">#{orderId.slice(0, 8).toUpperCase()}</span>
            </div>
            {order && (
              <>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600 dark:text-gray-400 font-medium">Cliente:</span>
                  <span className="font-bold text-gray-900 dark:text-white">{order.customer_name}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600 dark:text-gray-400 font-medium">Total Pagado:</span>
                  <span className="font-black text-emerald-600 dark:text-emerald-400 text-base">${Number(order.total_amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600 dark:text-gray-400 font-medium">Estado del Envío:</span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                    PENDIENTE DE ENVÍO
                  </span>
                </div>
              </>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="flex items-center justify-center gap-2 bg-primary text-white px-6 py-3.5 rounded-xl font-bold hover:bg-primary/90 transition-all shadow-md"
          >
            <ShoppingBag className="w-5 h-5" />
            Volver a la Tienda
          </Link>

          <Link
            href="/dashboard"
            className="flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white px-6 py-3.5 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
          >
            <LayoutDashboard className="w-5 h-5 text-primary dark:text-blue-400" />
            Ver en Gestión de Pedidos
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-gray-500">Cargando confirmación...</div>}>
      <SuccessContent />
    </Suspense>
  );
}
