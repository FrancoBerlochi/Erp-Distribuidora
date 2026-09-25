'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore, getItemEffectiveUnitPrice, isWholesaleApplied, getCartTotalAmount } from '@/lib/store';
import { Lock, Sparkles, ShieldCheck, Store, Truck, MapPin, CheckCircle2, Zap } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-toastify';
import { invalidateProductsCache } from '@/lib/products-cache';
import ThankYouModal from '@/components/thank-you-modal';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, clearCart } = useCartStore();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<any>(null);
  const [showThankYouModal, setShowThankYouModal] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState<'pickup' | 'shipping'>('pickup');
  const [paymentMethod, setPaymentMethod] = useState<'efectivo' | 'transferencia'>('efectivo');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
  });

  useEffect(() => {
    setMounted(true);
    if (!showThankYouModal && items.length === 0) {
      router.push('/cart');
    }
  }, [items, showThankYouModal, router]);

  if (!mounted || (!showThankYouModal && items.length === 0)) return null;

  const totalAmount = getCartTotalAmount(items);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          deliveryMethod,
          paymentMethod,
          items: items.map(i => ({ id: i.id, quantity: i.quantity })),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al procesar el pedido.');
      }

      // Invalidar caché para reflejar el nuevo stock verificado
      await invalidateProductsCache();

      // Guardar datos del pedido para el modal de agradecimiento
      setCompletedOrder({
        id: data.orderId,
        customer_name: formData.name,
        email: formData.email,
        phone: formData.phone,
        address: deliveryMethod === 'pickup' ? 'Retiro en Local Central (Av. Principal 1234)' : formData.address,
        city: deliveryMethod === 'pickup' ? 'Local Comercial' : formData.city,
        total_amount: data.totalAmount,
        items: items.map(i => ({
          id: i.id,
          name: i.name,
          price: getItemEffectiveUnitPrice(i),
          quantity: i.quantity,
          image_url: i.image_url,
        })),
      });

      setShowThankYouModal(true);
      clearCart();

      // Notificar inmediatamente a todas las pestañas abiertas (Dashboard, Admin, etc.)
      try {
        const bc = new BroadcastChannel('erp_orders_broadcast_channel');
        bc.postMessage({
          order: {
            id: data.orderId,
            mp_payment_id: data.orderCode,
            customer_name: formData.name,
            channel: 'web',
            total_amount: data.totalAmount,
            created_at: new Date().toISOString(),
          },
        });
        setTimeout(() => bc.close(), 1000);
      } catch {}
    } catch (error: any) {
      console.error('Error al procesar compra:', error);
      toast.error(error.message || 'Error procesando el pedido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex items-center gap-2 mb-8 text-gray-500 dark:text-gray-400 text-sm">
        <Link href="/cart" className="hover:text-primary">Carrito</Link>
        <span>&gt;</span>
        <span className="font-semibold text-gray-900 dark:text-white">Checkout</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Formulario de Checkout */}
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-6">Detalles de Facturación y Envío</h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 space-y-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-800 pb-2 mb-4">Información de Contacto</h3>
              
              <div>
                <label className="block text-sm font-bold text-gray-900 dark:text-gray-100 mb-1">Nombre Completo *</label>
                <input 
                  required 
                  type="text" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none font-medium placeholder:text-gray-500 dark:placeholder:text-gray-400" 
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-900 dark:text-gray-100 mb-1">Correo Electrónico *</label>
                  <input 
                    required 
                    type="email" 
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    className="w-full px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none font-medium placeholder:text-gray-500 dark:placeholder:text-gray-400" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 dark:text-gray-100 mb-1">Teléfono (WhatsApp) *</label>
                  <input 
                    required 
                    type="tel" 
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    className="w-full px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none font-medium placeholder:text-gray-500 dark:placeholder:text-gray-400" 
                  />
                </div>
              </div>

              {/* Selector de Método de Entrega */}
              <h3 className="text-lg font-bold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-800 pb-2 mb-4 mt-8 pt-4">
                Método de Entrega
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <button
                  type="button"
                  onClick={() => setDeliveryMethod('pickup')}
                  className={`p-4 rounded-xl border-2 text-left transition-all flex flex-col justify-between ${
                    deliveryMethod === 'pickup'
                      ? 'border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/40 shadow-sm'
                      : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-white dark:bg-gray-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <Store className="w-4 h-4" />
                    </div>
                    {deliveryMethod === 'pickup' && (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    )}
                  </div>
                  <div>
                    <p className="font-extrabold text-sm text-gray-900 dark:text-white">Retiro en el Local</p>
                    <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">¡GRATIS!</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setDeliveryMethod('shipping')}
                  className={`p-4 rounded-xl border-2 text-left transition-all flex flex-col justify-between ${
                    deliveryMethod === 'shipping'
                      ? 'border-primary bg-blue-50/70 dark:bg-blue-950/40 shadow-sm'
                      : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-white dark:bg-gray-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-primary dark:text-blue-400 flex items-center justify-center">
                      <Truck className="w-4 h-4" />
                    </div>
                    {deliveryMethod === 'shipping' && (
                      <CheckCircle2 className="w-5 h-5 text-primary dark:text-blue-400" />
                    )}
                  </div>
                  <div>
                    <p className="font-extrabold text-sm text-gray-900 dark:text-white">Envío a Domicilio</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">A coordinar con vendedor</p>
                  </div>
                </button>
              </div>

              {deliveryMethod === 'pickup' ? (
                <div className="p-4 bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-xl space-y-1.5 text-xs">
                  <div className="flex items-center gap-2 font-bold text-emerald-900 dark:text-emerald-200">
                    <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    Punto de Retiro: Casa Central
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 pl-6">
                    Av. Principal 1234, Local 5, Buenos Aires
                  </p>
                  <p className="text-gray-500 dark:text-gray-400 pl-6 text-[11px]">
                    Horario de atención: Lunes a Sábados de 09:00 a 18:00 hs. Te notificaremos por WhatsApp cuando tu pedido esté listo para retirar.
                  </p>
                </div>
              ) : (
                <div className="space-y-4 pt-1">
                  <div>
                    <label className="block text-sm font-bold text-gray-900 dark:text-gray-100 mb-1">Dirección completa *</label>
                    <input 
                      required={deliveryMethod === 'shipping'} 
                      type="text" 
                      placeholder="Calle, número, piso, depto..."
                      value={formData.address}
                      onChange={e => setFormData({...formData, address: e.target.value})}
                      className="w-full px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none font-medium placeholder:text-gray-500 dark:placeholder:text-gray-400" 
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-900 dark:text-gray-100 mb-1">Ciudad / Localidad *</label>
                    <input 
                      required={deliveryMethod === 'shipping'} 
                      type="text" 
                      value={formData.city}
                      onChange={e => setFormData({...formData, city: e.target.value})}
                      className="w-full px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none font-medium placeholder:text-gray-500 dark:placeholder:text-gray-400" 
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Medio de Pago */}
            <div className="space-y-3 pt-2">
              <label className="block text-sm font-bold text-gray-900 dark:text-white">
                Medio de Pago
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('efectivo')}
                  className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                    paymentMethod === 'efectivo'
                      ? 'border-[#dc2626] bg-red-50/50 dark:bg-red-950/30 text-gray-900 dark:text-white ring-1 ring-[#dc2626]'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  <div className="w-5 h-5 rounded-full border border-gray-300 dark:border-gray-600 flex items-center justify-center shrink-0 mt-0.5">
                    {paymentMethod === 'efectivo' && <div className="w-2.5 h-2.5 rounded-full bg-[#dc2626]" />}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-900 dark:text-white">Efectivo / Al Retirar</p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">Aboná al momento de recibir o retirar tu pedido</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('transferencia')}
                  className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                    paymentMethod === 'transferencia'
                      ? 'border-[#dc2626] bg-red-50/50 dark:bg-red-950/30 text-gray-900 dark:text-white ring-1 ring-[#dc2626]'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  <div className="w-5 h-5 rounded-full border border-gray-300 dark:border-gray-600 flex items-center justify-center shrink-0 mt-0.5">
                    {paymentMethod === 'transferencia' && <div className="w-2.5 h-2.5 rounded-full bg-[#dc2626]" />}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-900 dark:text-white">Transferencia Bancaria</p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">Te enviamos el CBU/Alias para abonar</p>
                  </div>
                </button>
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2.5 bg-[#dc2626] text-white py-4 rounded-xl font-bold hover:bg-red-700 transition-all shadow-md text-base disabled:opacity-70 cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Procesando y confirmando pedido...</span>
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5" />
                  <span>Confirmar y Enviar Pedido</span>
                </>
              )}
            </button>
            <p className="text-center text-xs text-gray-500 dark:text-gray-400 font-medium mt-1 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Transacción segura verificada por el servidor
            </p>
          </form>
        </div>

        {/* Resumen de la Orden */}
        <div>
          <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800 sticky top-24 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Resumen de tu Orden</h2>
            
            <div className="space-y-4 mb-6 max-h-[400px] overflow-y-auto pr-2">
              {items.map((item) => {
                const effectivePrice = getItemEffectiveUnitPrice(item);
                const hasWholesale = isWholesaleApplied(item);
                return (
                  <div key={item.id} className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden flex-shrink-0 relative">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="w-full h-full object-contain" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-500 dark:text-gray-400">Sin img</div>
                      )}
                      <span className="absolute -top-2 -right-2 bg-gray-700 dark:bg-gray-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                        {item.quantity}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{item.name}</p>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                          ${effectivePrice.toFixed(2)} c/u
                        </span>
                        {hasWholesale && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                            Mayorista
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-extrabold text-gray-900 dark:text-white">
                        ${(effectivePrice * item.quantity).toFixed(2)}
                      </div>
                      {hasWholesale && (
                        <div className="text-[10px] line-through text-gray-400">
                          ${(item.price * item.quantity).toFixed(2)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-gray-200 dark:border-gray-800 pt-4 space-y-3 text-sm">
              <div className="flex justify-between text-gray-800 dark:text-gray-200 font-medium">
                <span>Subtotal</span>
                <span className="font-bold text-gray-900 dark:text-white">${totalAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-800 dark:text-gray-200 font-medium">
                <span>Envío</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                  {deliveryMethod === 'pickup' ? 'Gratis (Retiro en local)' : 'A coordinar con vendedor'}
                </span>
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-800 mt-4 pt-4 flex justify-between items-end">
              <span className="text-lg font-bold text-gray-900 dark:text-white">Total a Pagar</span>
              <span className="text-3xl font-black text-primary dark:text-blue-400">${totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Emergente de Gracias por tu Compra */}
      <ThankYouModal
        isOpen={showThankYouModal}
        order={completedOrder}
        onClose={() => setShowThankYouModal(false)}
      />
    </div>
  );
}
