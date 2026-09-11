'use client';

import { useRef } from 'react';
import { X, Printer, Share2, CheckCircle2 } from 'lucide-react';
import { POSSaleResult } from '@/lib/pos-service';

interface POSReceiptModalProps {
  sale: POSSaleResult | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function POSReceiptModal({ sale, isOpen, onClose }: POSReceiptModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !sale) return null;

  const formatMoney = (val: number) => `$${val.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;

  const handlePrint = () => {
    try {
      // 1. Crear o reutilizar un iframe aislado para impresión térmica
      let iframe = document.getElementById('pos-thermal-print-iframe') as HTMLIFrameElement;
      if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = 'pos-thermal-print-iframe';
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        iframe.style.visibility = 'hidden';
        document.body.appendChild(iframe);
      }

      const doc = iframe.contentWindow?.document;
      if (doc && printRef.current) {
        const ticketContent = printRef.current.innerHTML;

        doc.open();
        doc.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <title>Ticket #${sale.orderId.slice(-6).toUpperCase()}</title>
              <style>
                @page {
                  size: 80mm auto;
                  margin: 0;
                }
                @media print {
                  html, body {
                    margin: 0;
                    padding: 0;
                    background: #fff !important;
                    color: #000 !important;
                  }
                }
                body {
                  font-family: 'Courier New', Courier, monospace, sans-serif;
                  width: 72mm;
                  max-width: 72mm;
                  margin: 0 auto;
                  padding: 8px 4px;
                  color: #000;
                  background: #fff;
                  font-size: 11px;
                  line-height: 1.35;
                  box-sizing: border-box;
                }
                * {
                  box-sizing: border-box;
                  color: #000 !important;
                  background-color: transparent !important;
                }
                h2 {
                  font-size: 14px;
                  font-weight: 900;
                  margin: 0 0 2px 0;
                  text-align: center;
                }
                p {
                  margin: 2px 0;
                }
                .text-center { text-align: center; }
                .text-left { text-align: left; }
                .text-right { text-align: right; }
                .font-bold { font-weight: bold; }
                .font-black { font-weight: 900; }
                .flex { display: flex; }
                .justify-between { justify-content: space-between; }
                .items-start { align-items: flex-start; }
                .shrink-0 { flex-shrink: 0; }
                .border-t { border-top: 1px dashed #000 !important; }
                .border-dashed { border-style: dashed !important; }
                .my-2 { margin-top: 6px; margin-bottom: 6px; }
                .pt-1 { padding-top: 3px; }
                .text-sm { font-size: 13px; }
                .text-base { font-size: 14px; }
                .text-\\[11px\\] { font-size: 11px; }
                .text-\\[10px\\] { font-size: 10px; }
                .text-\\[9px\\] { font-size: 9px; }
                .text-\\[7px\\] { font-size: 8px; }
                .w-24 { width: 90px; }
                .h-24 { height: 90px; }
                .mx-auto { margin-left: auto; margin-right: auto; }
                .block { display: block; }
                .space-y-0\\.5 > * + * { margin-top: 2px; }
                .space-y-1 > * + * { margin-top: 4px; }
                .space-y-2 > * + * { margin-top: 6px; }
                .no-print { display: none !important; }
              </style>
            </head>
            <body>
              <div style="width: 100%; text-align: center;">
                ${ticketContent}
              </div>
              <script>
                window.onload = function() {
                  setTimeout(function() {
                    window.focus();
                    window.print();
                  }, 200);
                };
              </script>
            </body>
          </html>
        `);
        doc.close();
        return;
      }
    } catch (err) {
      console.warn('Error con impresión iframe, usando fallback nativo:', err);
    }

    // Fallback nativo
    window.print();
  };

  const handleWhatsApp = () => {
    let msg = `*DISTRIBUIDORA EXPRESS*\n`;
    msg += `Comprobante: #${sale.orderId.slice(-6).toUpperCase()}\n`;
    msg += `Fecha: ${new Date(sale.date).toLocaleString('es-AR')}\n`;
    msg += `Cajero: ${sale.cashierName}\n`;
    msg += `-----------------------------\n`;
    sale.items.forEach((it) => {
      msg += `${it.quantity}x ${it.name} - ${formatMoney(it.price * it.quantity)}\n`;
    });
    msg += `-----------------------------\n`;
    msg += `*TOTAL: ${formatMoney(sale.totalAmount)}*\n`;
    msg += `Pago: ${sale.paymentMethod.toUpperCase()}\n`;
    if (sale.invoice) {
      msg += `\n*FACTURA C* N° 0001-${sale.invoice.invoice_number.toString().padStart(8, '0')}\n`;
      msg += `CAE: ${sale.invoice.cae}\n`;
      msg += `Vencimiento CAE: ${sale.invoice.cae_due_date}\n`;
    }
    if (sale.paymentMethod === 'cuenta_corriente' || (sale.creditAmount && sale.creditAmount > 0)) {
      msg += `\n*CUENTA CORRIENTE*\n`;
      msg += `Cliente: ${sale.customerName || 'Cliente'}\n`;
      if (sale.paidNowAmount && sale.paidNowAmount > 0) {
        msg += `Abonado hoy: ${formatMoney(sale.paidNowAmount)}\n`;
      }
      msg += `A cuenta: ${formatMoney(sale.creditAmount || sale.totalAmount)}\n`;
      if (sale.customerNewBalance !== undefined) {
        msg += `*Saldo Total Actual: ${formatMoney(sale.customerNewBalance)}*\n`;
      }
    }
    msg += `\n¡Gracias por su compra!`;

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const paymentLabels: Record<string, string> = {
    efectivo: 'Efectivo',
    tarjeta_posnet: 'Tarjeta / Posnet',
    transferencia: 'Transferencia Bancaria',
    qr: 'QR / Mercado Pago',
    cuenta_corriente: 'Cuenta Corriente (Fiado)',
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white dark:bg-gray-900 rounded-3xl overflow-hidden shadow-2xl max-w-sm w-full border border-gray-200 dark:border-gray-800 flex flex-col max-h-[90vh]">
        {/* Cabecera modal */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span className="font-extrabold text-sm text-gray-900 dark:text-white">Venta Registrada</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* CONTENEDOR DE TICKET IMPRIMIBLE (80mm / Rollo térmico) */}
        <div className="p-6 overflow-y-auto flex-1 bg-gray-50 dark:bg-gray-950 font-mono text-xs text-gray-900 dark:text-gray-100 print:p-0 print:bg-white print:text-black">
          <div 
            ref={printRef} 
            id="pos-receipt-print-area" 
            className="max-w-[280px] mx-auto space-y-2 text-center"
          >
            {/* Header del Ticket */}
            <div className="space-y-0.5">
              <h2 className="text-base font-black tracking-tight">DISTRIBUIDORA EXPRESS</h2>
              <p className="text-[10px] text-gray-500 print:text-gray-700">Venta Mayorista y Minorista</p>
              <p className="text-[9px] text-gray-400">CUIT: 30-71849201-5 | Ing. Brutos: 30-71849201-5</p>
              <p className="text-[9px] text-gray-400">Av. Central 1234 - Buenos Aires</p>
            </div>

            <div className="border-t border-dashed border-gray-300 dark:border-gray-700 my-2"></div>

            {/* Datos de Comprobante */}
            <div className="text-left text-[10px] space-y-0.5">
              {sale.invoice ? (
                <div className="bg-amber-50 dark:bg-amber-950/40 p-1.5 rounded border border-amber-200 dark:border-amber-900/60 text-center font-bold text-amber-800 dark:text-amber-300 print:border-black print:text-black print:bg-transparent">
                  COMPROBANTE NO FISCAL N° 0001-{sale.invoice.invoice_number.toString().padStart(8, '0')}
                  <span className="block text-[8px] font-normal text-gray-500 print:text-black">Control de Gestión Interna</span>
                </div>
              ) : (
                <div className="text-center font-bold">TICKET DE VENTA (Control Interno)</div>
              )}
              <div className="flex justify-between pt-1">
                <span>Fecha:</span>
                <span>{new Date(sale.date).toLocaleDateString('es-AR')} {new Date(sale.date).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="flex justify-between">
                <span>Comprobante:</span>
                <span>#{sale.orderId.slice(-6).toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span>Cajero:</span>
                <span>{sale.cashierName}</span>
              </div>
            </div>

            <div className="border-t border-dashed border-gray-300 dark:border-gray-700 my-2"></div>

            {/* Lista de Items */}
            <div className="text-left space-y-1 text-[11px]">
              {sale.items.map((it) => (
                <div key={it.id} className="flex justify-between items-start">
                  <div className="pr-2 leading-tight">
                    <p className="font-semibold">{it.name}</p>
                    <span className="text-[9px] text-gray-500 print:text-gray-700">
                      {it.quantity} x {formatMoney(it.price)} {it.is_wholesale ? '(Mayorista)' : ''}
                    </span>
                  </div>
                  <span className="font-bold shrink-0">{formatMoney(it.price * it.quantity)}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-dashed border-gray-300 dark:border-gray-700 my-2"></div>

            {/* Totales */}
            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between font-black text-sm pt-1">
                <span>TOTAL:</span>
                <span>{formatMoney(sale.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-[10px] text-gray-600 dark:text-gray-400 print:text-gray-700">
                <span>Método de Pago:</span>
                <span className="font-bold">{paymentLabels[sale.paymentMethod] || sale.paymentMethod}</span>
              </div>
              {sale.paymentMethod === 'efectivo' && sale.changeAmount > 0 && (
                <div className="flex justify-between text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                  <span>Vuelto entregado:</span>
                  <span>{formatMoney(sale.changeAmount)}</span>
                </div>
              )}
            </div>

            {/* Sección Cuenta Corriente / Fiado */}
            {(sale.paymentMethod === 'cuenta_corriente' || (sale.creditAmount && sale.creditAmount > 0)) && (
              <>
                <div className="border-t border-dashed border-gray-300 dark:border-gray-700 my-2"></div>
                <div className="text-left text-[10px] space-y-1 bg-amber-50 dark:bg-amber-950/30 p-2 rounded border border-amber-200 dark:border-amber-900/50 print:bg-transparent print:border-black">
                  <p className="font-black text-center text-amber-900 dark:text-amber-300 print:text-black">
                    COMPROBANTE DE CUENTA CORRIENTE
                  </p>
                  <div className="flex justify-between">
                    <span>Cliente:</span>
                    <span className="font-bold">{sale.customerName || 'Cliente'}</span>
                  </div>
                  {sale.customerPreviousBalance !== undefined && (
                    <div className="flex justify-between">
                      <span>Saldo anterior:</span>
                      <span>{formatMoney(sale.customerPreviousBalance)}</span>
                    </div>
                  )}
                  {sale.paidNowAmount !== undefined && sale.paidNowAmount > 0 && (
                    <div className="flex justify-between text-emerald-700 dark:text-emerald-400 print:text-black">
                      <span>Abonado hoy (efectivo):</span>
                      <span className="font-bold">-{formatMoney(sale.paidNowAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-red-600 dark:text-red-400 print:text-black">
                    <span>Cargado a Cta. Cte.:</span>
                    <span className="font-bold">+{formatMoney(sale.creditAmount || sale.totalAmount)}</span>
                  </div>
                  {sale.customerNewBalance !== undefined && (
                    <div className="flex justify-between border-t border-dashed border-amber-300 dark:border-amber-800 pt-1 font-black text-[11px]">
                      <span>Nuevo Saldo Deudor:</span>
                      <span>{formatMoney(sale.customerNewBalance)}</span>
                    </div>
                  )}
                  
                  {/* Línea de firma para resguardo legal del comerciante */}
                  <div className="pt-5 pb-1 text-center">
                    <div className="w-36 border-b border-black mx-auto mb-1"></div>
                    <p className="text-[8px] text-gray-500 print:text-black">Firma y Aclaración del Titular</p>
                  </div>
                </div>
              </>
            )}

            {/* Sección de Control Interno */}
            {sale.invoice && (
              <>
                <div className="border-t border-dashed border-gray-300 dark:border-gray-700 my-2"></div>
                <div className="space-y-1 text-center text-[10px]">
                  <p className="font-bold text-gray-700 dark:text-gray-300 print:text-black">[ COMPROBANTE NO FISCAL ]</p>
                  <p className="text-[8px] text-gray-500 print:text-black">Emisión para control de mostrador y constancia de entrega</p>
                </div>
              </>
            )}

            <div className="border-t border-dashed border-gray-300 dark:border-gray-700 my-2"></div>
            <p className="text-[9px] text-gray-400 text-center">¡Gracias por su compra en Distribuidora Express!</p>
          </div>
        </div>

        {/* Botonera de Acciones (Oculta al imprimir) */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col gap-2 no-print">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="bg-[#dc2626] hover:bg-red-700 text-white font-extrabold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Ticket</span>
            </button>
            <button
              type="button"
              onClick={handleWhatsApp}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              <span>WhatsApp</span>
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold py-2 rounded-xl text-xs transition-colors cursor-pointer"
          >
            Nueva Venta
          </button>
        </div>
      </div>

      {/* Estilos CSS nativos para impresión limpia (tanto con iframe como nativo Ctrl+P) */}
      <style jsx global>{`
        @media print {
          /* Desactivar overflow-hidden del layout que bloquea y deja en blanco la impresión */
          html, body {
            overflow: visible !important;
            height: auto !important;
            background: #fff !important;
            color: #000 !important;
          }
          body * {
            visibility: hidden;
          }
          .no-print,
          .no-print * {
            display: none !important;
          }
          #pos-receipt-print-area,
          #pos-receipt-print-area * {
            visibility: visible !important;
            color: #000 !important;
            background-color: transparent !important;
          }
          #pos-receipt-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 80mm !important;
            margin: 0 auto !important;
            padding: 4mm 2mm !important;
            display: block !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
}
