/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useCartStore, getItemEffectiveUnitPrice, getItemLineTotal, isWholesaleApplied, getItemPromoCalculation, getCartTotalAmount } from '@/lib/store';
import { Trash2, Plus, Minus, ArrowRight, Zap, Sparkles, Gift } from 'lucide-react';

export default function CartPage() {
  const { items, removeItem, updateQuantity } = useCartStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const totalAmount = getCartTotalAmount(items);
  const promoSavingsTotal = items.reduce((acc, item) => {
    const p = getItemPromoCalculation(item);
    return acc + (p?.discountAmount || 0);
  }, 0);

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 text-center max-w-lg">
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-4">Tu carrito está vacío</h1>
        <p className="text-gray-700 dark:text-gray-300 font-medium mb-8">Parece que aún no has agregado productos a tu carrito de compras.</p>
        <Link href="/" className="bg-primary text-white px-6 py-3 rounded-lg font-bold hover:bg-primary/90 transition-colors inline-block shadow-md">
          Volver a la tienda
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-8">Carrito de Compras</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => {
            const isWholesale = isWholesaleApplied(item);
            const unitPrice = getItemEffectiveUnitPrice(item);
            const lineTotal = getItemLineTotal(item);
            const promoCalc = getItemPromoCalculation(item);
            const minWholesaleQty = item.wholesale_min_qty && item.wholesale_min_qty > 0 ? item.wholesale_min_qty : 6;
            const hasWholesaleOffer = Boolean(item.wholesale_price && Number(item.wholesale_price) > 0);

            return (
              <div key={item.id} className="bg-white dark:bg-gray-900 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 flex items-center gap-4">
                <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800/60 rounded-lg overflow-hidden flex-shrink-0">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-contain" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-gray-500 dark:text-gray-400">Sin img</div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 dark:text-white truncate text-base">{item.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className={`font-bold ${isWholesale ? 'text-emerald-600 dark:text-emerald-400 font-extrabold text-base' : promoCalc?.isPromoActive ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-primary dark:text-blue-400'}`}>
                      ${unitPrice.toFixed(2)} c/u
                    </p>
                    {(isWholesale || (promoCalc && promoCalc.isPromoActive)) && (
                      <span className="text-xs text-gray-400 line-through">
                        ${(item.price * item.quantity / item.quantity).toFixed(2)}
                      </span>
                    )}
                  </div>

                  {isWholesale && (
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 font-black border border-emerald-200 dark:border-emerald-800 mt-1">
                      <Zap className="w-3 h-3 text-emerald-600" /> ¡Precio Mayorista aplicado! (x{minWholesaleQty}+ u.)
                    </span>
                  )}

                  {!isWholesale && promoCalc?.isPromoActive && (
                    <span className="text-[10px] text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-950/80 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 font-black border border-amber-300 dark:border-amber-700 mt-1">
                      <Gift className="w-3 h-3 text-amber-600" /> {promoCalc.appliedDescription} (Ahorrás -${promoCalc.discountAmount.toFixed(2)})
                    </span>
                  )}

                  {!isWholesale && promoCalc && !promoCalc.isPromoActive && promoCalc.promoBadge && (
                    <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium mt-1 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      {promoCalc.promoBadge.description}
                    </p>
                  )}

                  {!isWholesale && !promoCalc?.isPromoActive && hasWholesaleOffer && (
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium mt-1 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-emerald-500" />
                      Llevando {minWholesaleQty - item.quantity} más, pagás <strong className="font-bold font-mono">${Number(item.wholesale_price).toFixed(2)} c/u</strong>
                    </p>
                  )}

                  {!isWholesale && !promoCalc?.isPromoActive && item.discount_percentage > 0 && (
                    <span className="text-xs text-secondary bg-red-50 dark:bg-red-900/30 px-2.5 py-0.5 rounded-full inline-block mt-1 font-bold border border-red-100 dark:border-red-900/40">
                      -{item.discount_percentage}% aplicado
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                    <button 
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="p-2 text-gray-700 hover:text-primary dark:text-gray-300 dark:hover:text-primary disabled:opacity-40 transition-colors"
                      disabled={item.quantity <= 1}
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-8 text-center font-bold text-gray-900 dark:text-white">{item.quantity}</span>
                    <button 
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="p-2 text-gray-700 hover:text-primary dark:text-gray-300 dark:hover:text-primary disabled:opacity-40 transition-colors"
                      disabled={item.quantity >= item.stock}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="w-24 text-right font-extrabold text-gray-900 dark:text-white text-lg">
                    ${lineTotal.toFixed(2)}
                  </div>

                  <button 
                    onClick={() => removeItem(item.id)}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors ml-2"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 sticky top-24">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Resumen de Compra</h2>
            
            <div className="space-y-3 text-sm text-gray-800 dark:text-gray-200 mb-4 border-b border-gray-200 dark:border-gray-800 pb-4">
              <div className="flex justify-between font-medium">
                <span>Subtotal ({items.length} {items.length === 1 ? 'producto' : 'productos'})</span>
                <span className="font-bold text-gray-900 dark:text-white">${totalAmount.toFixed(2)}</span>
              </div>
              {promoSavingsTotal > 0 && (
                <div className="flex justify-between font-bold text-emerald-600 dark:text-emerald-400">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-500" /> Ahorro en Promociones
                  </span>
                  <span>-${promoSavingsTotal.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-medium">
                <span>Envío</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">A convenir</span>
              </div>
            </div>
            
            <div className="flex justify-between items-center mb-6">
              <span className="text-lg font-bold text-gray-900 dark:text-white">Total</span>
              <span className="text-3xl font-black text-primary dark:text-blue-400">${totalAmount.toFixed(2)}</span>
            </div>

            <Link 
              href="/checkout"
              className="w-full flex items-center justify-center gap-2 bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary/90 transition-all shadow-md hover:shadow-lg"
            >
              Continuar Compra
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
