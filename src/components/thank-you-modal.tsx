/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  CheckCircle2, 
  ShoppingBag, 
  LayoutDashboard, 
  Copy, 
  Check, 
  PackageCheck, 
  MessageCircle, 
  X,
  MapPin,
  Phone,
  Clock
} from 'lucide-react';
import { optimizeImageUrl } from '@/lib/products-cache';

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image_url?: string;
}

interface CompletedOrder {
  id: string;
  customer_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  total_amount: number;
  items: OrderItem[];
}

interface ThankYouModalProps {
  isOpen: boolean;
  order: CompletedOrder | null;
  onClose?: () => void;
}

export default function ThankYouModal({ isOpen, order, onClose }: ThankYouModalProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  if (!isOpen || !order) return null;

  const shortId = order.id ? order.id.slice(0, 8).toUpperCase() : '';

  const handleCopyId = () => {
    if (!order.id) return;
    navigator.clipboard.writeText(`#${shortId}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGoHome = () => {
    if (onClose) onClose();
    router.push('/');
  };

  const handleGoDashboard = () => {
    if (onClose) onClose();
    router.push('/dashboard');
  };

  // Mensaje para enviar por WhatsApp
  const whatsappMessage = encodeURIComponent(
    `¡Hola Distribuidora Express! Acabo de realizar el pedido #${shortId} por un total de $${order.total_amount.toFixed(2)}.\n\nNombre: ${order.customer_name}\nDirección: ${order.address}, ${order.city}\nTel: ${order.phone}\n\nQuedo a la espera del envío. ¡Muchas gracias!`
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-8 relative text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botón Cerrar */}
        <button
          onClick={handleGoHome}
          className="absolute top-4 right-4 p-2 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title="Cerrar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Encabezado con Icono Animado */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-100 dark:bg-emerald-950/60 border-4 border-emerald-50 dark:border-emerald-900/50 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner animate-bounce">
            <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12 text-emerald-600 dark:text-emerald-400" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 rounded-full text-xs font-extrabold mb-3">
            <Clock className="w-3.5 h-3.5" /> PENDIENTE DE ENVÍO
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
            ¡Gracias por tu compra!
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Tu pedido ha sido registrado con éxito y ya está listo para ser preparado.
          </p>
        </div>

        {/* Tarjeta de Resumen del Pedido */}
        <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/80 rounded-2xl p-4 sm:p-5 mb-5 space-y-3">
          <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-3">
            <div>
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium block">N° de Pedido</span>
              <span className="font-mono font-extrabold text-base text-gray-900 dark:text-white">
                #{shortId}
              </span>
            </div>
            <button
              onClick={handleCopyId}
              className="flex items-center gap-1 text-xs font-bold text-primary dark:text-blue-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Copiado</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar ID</span>
                </>
              )}
            </button>
          </div>

          {/* Datos de Entrega */}
          <div className="space-y-1.5 text-xs text-gray-700 dark:text-gray-300">
            <div className="flex items-center gap-2">
              <PackageCheck className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <span className="font-semibold text-gray-900 dark:text-white">{order.customer_name}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <span>{order.address}, {order.city}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <span>{order.phone}</span>
            </div>
          </div>

          {/* Desglose de Productos Comprados */}
          {order.items && order.items.length > 0 && (
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400 block mb-2">
                Productos ({order.items.length}):
              </span>
              <div className="max-h-36 overflow-y-auto space-y-2 pr-1">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs py-1">
                    <div className="flex items-center gap-2 min-w-0">
                      {item.image_url ? (
                        <img 
                          src={optimizeImageUrl(item.image_url, 80)} 
                          alt={item.name} 
                          className="w-8 h-8 rounded-lg object-contain bg-white dark:bg-gray-700 p-0.5 border border-gray-200 dark:border-gray-600 flex-shrink-0" 
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[10px] text-gray-500 flex-shrink-0">
                          📦
                        </div>
                      )}
                      <div className="truncate">
                        <p className="font-bold text-gray-900 dark:text-white truncate">{item.name}</p>
                        <p className="text-gray-500 dark:text-gray-400">{item.quantity} un. x ${item.price.toFixed(2)}</p>
                      </div>
                    </div>
                    <span className="font-extrabold text-gray-900 dark:text-white ml-2 flex-shrink-0">
                      ${(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Total */}
          <div className="pt-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <span className="font-bold text-sm text-gray-900 dark:text-white">Total Pagado:</span>
            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
              ${order.total_amount.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Botón WhatsApp */}
        <a
          href={`https://wa.me/?text=${whatsappMessage}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm py-3 px-4 rounded-xl shadow-md transition-all mb-3 cursor-pointer"
        >
          <MessageCircle className="w-4 h-4" />
          <span>Enviar Comprobante por WhatsApp</span>
        </a>

        {/* Botones de Navegación */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <button
            onClick={handleGoHome}
            className="flex-1 flex items-center justify-center gap-2 bg-primary text-white py-3 px-4 rounded-xl font-bold text-sm hover:bg-primary/90 transition-all shadow-sm cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Volver a la Tienda</span>
          </button>

          <button
            onClick={handleGoDashboard}
            className="sm:w-auto flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 py-3 px-4 rounded-xl font-bold text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-all cursor-pointer"
          >
            <LayoutDashboard className="w-4 h-4 text-primary dark:text-blue-400" />
            <span>Ver Pedidos</span>
          </button>
        </div>
      </div>
    </div>
  );
}
