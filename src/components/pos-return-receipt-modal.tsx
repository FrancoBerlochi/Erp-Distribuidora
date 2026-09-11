'use client';

import { useRef } from 'react';
import { X, Printer, Share2, RotateCcw } from 'lucide-react';
import { POSReturn } from '@/lib/returns-service';

interface POSReturnReceiptModalProps {
  returnRecord: POSReturn | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function POSReturnReceiptModal({
  returnRecord,
  isOpen,
  onClose,
}: POSReturnReceiptModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !returnRecord) return null;

  const formatMoney = (val: number) => `$${val.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;

  const handlePrint = () => {
    try {
      let iframe = document.getElementById('pos-return-print-iframe') as HTMLIFrameElement;
      if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = 'pos-return-print-iframe';
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
              <title>Nota de Crédito #${returnRecord.id.slice(-6).toUpperCase()}</title>
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
                .border-b { border-bottom: 1px dashed #000 !important; }
                .my-2 { margin-top: 6px; margin-bottom: 6px; }
                .pt-1 { padding-top: 3px; }
                .text-sm { font-size: 13px; }
                .text-base { font-size: 14px; }
                .text-\\[11px\\] { font-size: 11px; }
                .text-\\[10px\\] { font-size: 10px; }
                .text-\\[9px\\] { font-size: 9px; }
                .text-\\[8px\\] { font-size: 8px; }
                .space-y-0\\.5 > * + * { margin-top: 2px; }
                .space-y-1 > * + * { margin-top: 4px; }
                .space-y-2 > * + * { margin-top: 6px; }
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
      console.warn('Error imprimiendo nota de crédito:', err);
    }
    window.print();
  };

  const handleWhatsApp = () => {
    let msg = `*DISTRIBUIDORA EXPRESS*\n`;
    msg += `*COMPROBANTE DE DEVOLUCIÓN / NOTA DE CRÉDITO*\n`;
    msg += `N°: #${returnRecord.id.slice(-6).toUpperCase()}\n`;
    msg += `Ticket Original: #${returnRecord.order_code}\n`;
    msg += `Fecha: ${new Date(returnRecord.created_at).toLocaleString('es-AR')}\n`;
    msg += `Cliente: ${returnRecord.customer_name}\n`;
    msg += `Cajero: ${returnRecord.cashier_name}\n`;
    msg += `Motivo: ${returnRecord.reason}\n`;
    msg += `-----------------------------\n`;
    returnRecord.items.forEach((it) => {
      msg += `${it.quantity_returned}x ${it.product_name} - ${formatMoney(it.subtotal_returned)}\n`;
    });
    msg += `-----------------------------\n`;
    msg += `*TOTAL REINTEGRADO: ${formatMoney(returnRecord.total_refunded)}*\n`;
    msg += `Destino: ${
      returnRecord.refund_method === 'efectivo'
        ? 'Efectivo devuelto en mostrador'
        : returnRecord.refund_method === 'cuenta_corriente'
        ? 'Acreditado a Cuenta Corriente'
        : 'Transferencia Bancaria'
    }\n`;
    msg += `\nComprobante emitido de conformidad.`;

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const methodLabels: Record<string, string> = {
    efectivo: 'Efectivo en Mostrador',
    cuenta_corriente: 'Acreditado en Cuenta Corriente',
    transferencia: 'Transferencia Bancaria',
    otro: 'Otro / Crédito',
  };

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white dark:bg-gray-900 rounded-3xl overflow-hidden shadow-2xl max-w-sm w-full border border-gray-200 dark:border-gray-800 flex flex-col max-h-[90vh]">
        {/* Cabecera modal */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-amber-600" />
            <span className="font-extrabold text-sm text-gray-900 dark:text-white">
              Nota de Crédito Emitida
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* TICKET IMPRIMIBLE (80mm) */}
        <div className="p-6 overflow-y-auto flex-1 bg-gray-50 dark:bg-gray-950 font-mono text-xs text-gray-900 dark:text-gray-100 print:p-0 print:bg-white print:text-black">
          <div
            ref={printRef}
            id="pos-return-print-area"
            className="max-w-[280px] mx-auto space-y-2 text-center"
          >
            {/* Header del Ticket */}
            <div className="space-y-0.5">
              <h2 className="text-base font-black tracking-tight">DISTRIBUIDORA EXPRESS</h2>
              <p className="text-[10px] text-gray-500 print:text-gray-700">Venta Mayorista y Minorista</p>
              <p className="text-[9px] text-gray-400">Av. Central 1234 - Buenos Aires</p>
            </div>

            <div className="border-t border-dashed border-gray-300 dark:border-gray-700 my-2"></div>

            {/* Badge Nota de Crédito */}
            <div className="text-left text-[10px] space-y-0.5">
              <div className="bg-amber-50 dark:bg-amber-950/40 p-1.5 rounded border border-amber-300 dark:border-amber-800 text-center font-black text-amber-800 dark:text-amber-200 print:border-black print:text-black print:bg-transparent">
                NOTA DE CRÉDITO INTERNA / DEVOLUCIÓN
              </div>
              <div className="flex justify-between pt-1">
                <span>N° Comprobante:</span>
                <span className="font-bold">#{returnRecord.id.slice(-6).toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span>Ticket Original:</span>
                <span className="font-bold">#{returnRecord.order_code}</span>
              </div>
              <div className="flex justify-between">
                <span>Fecha:</span>
                <span>
                  {new Date(returnRecord.created_at).toLocaleDateString('es-AR')}{' '}
                  {new Date(returnRecord.created_at).toLocaleTimeString('es-AR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Cliente:</span>
                <span className="font-bold">{returnRecord.customer_name}</span>
              </div>
              <div className="flex justify-between">
                <span>Cajero:</span>
                <span>{returnRecord.cashier_name}</span>
              </div>
              <div className="flex justify-between">
                <span>Motivo:</span>
                <span className="text-gray-600 dark:text-gray-300 italic">{returnRecord.reason}</span>
              </div>
            </div>

            <div className="border-t border-dashed border-gray-300 dark:border-gray-700 my-2"></div>

            {/* Lista de Items Devueltos */}
            <div className="text-left space-y-1 text-[11px]">
              <p className="text-[9px] font-bold uppercase text-gray-400">Mercadería Reincorporada al Stock:</p>
              {returnRecord.items.map((it, idx) => (
                <div key={idx} className="flex justify-between items-start">
                  <div className="pr-2 leading-tight">
                    <p className="font-semibold">{it.product_name}</p>
                    <span className="text-[9px] text-gray-500 print:text-gray-700">
                      {it.quantity_returned} x {formatMoney(it.price_at_purchase)}
                    </span>
                  </div>
                  <span className="font-bold shrink-0 text-red-600 dark:text-red-400 print:text-black">
                    -{formatMoney(it.subtotal_returned)}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-dashed border-gray-300 dark:border-gray-700 my-2"></div>

            {/* Totales y Reintegro */}
            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between font-black text-sm pt-1 text-[#dc2626] print:text-black">
                <span>TOTAL REINTEGRADO:</span>
                <span>{formatMoney(returnRecord.total_refunded)}</span>
              </div>
              <div className="flex justify-between text-[10px] text-gray-600 dark:text-gray-400 print:text-gray-700">
                <span>Destino del Reintegro:</span>
                <span className="font-bold">{methodLabels[returnRecord.refund_method] || returnRecord.refund_method}</span>
              </div>
            </div>

            <div className="border-t border-dashed border-gray-300 dark:border-gray-700 my-2"></div>

            {/* Firmas de Conformidad */}
            <div className="pt-4 pb-1 text-center space-y-4">
              <div>
                <div className="w-36 border-b border-black mx-auto mb-1"></div>
                <p className="text-[8px] text-gray-500 print:text-black">Firma y Aclaración del Cliente</p>
              </div>
              <div>
                <div className="w-36 border-b border-black mx-auto mb-1"></div>
                <p className="text-[8px] text-gray-500 print:text-black">Firma Cajero / Autorización</p>
              </div>
            </div>

            <div className="border-t border-dashed border-gray-300 dark:border-gray-700 my-2"></div>
            <p className="text-[9px] text-gray-400 text-center">Stock reincorporado automáticamente al inventario.</p>
          </div>
        </div>

        {/* Botonera de Acciones */}
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
            className="w-full py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
