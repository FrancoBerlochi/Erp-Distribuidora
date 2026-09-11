/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useRef, useState, useEffect } from 'react';
import { 
  Printer, 
  Share2, 
  X, 
  AlertTriangle, 
  CheckCircle2, 
  Copy, 
  Check, 
  Smartphone, 
  Edit2 
} from 'lucide-react';
import { toast } from 'react-toastify';
import { CashRegisterSession } from '@/lib/pos-types';
import { 
  getCashRegisterAudit, 
  CashAuditSummary,
  formatOwnerCashShiftMessage,
  getOwnerWhatsAppShiftUrl,
  formatArgentineWhatsAppPhone 
} from '@/lib/pos-service';
import { formatCurrency } from '@/lib/formatters';

export const OWNER_PHONE_STORAGE_KEY = 'distribuidora_owner_phone';

interface CashReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: CashRegisterSession | null;
  mode: 'X' | 'Z'; // X = Arqueo Parcial / En vivo, Z = Cierre Definitivo
}

export function CashReceiptModal({ isOpen, onClose, session, mode }: CashReceiptModalProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  const [ownerPhone, setOwnerPhone] = useState<string>('');
  const [isEditingPhone, setIsEditingPhone] = useState<boolean>(false);
  const [phoneInput, setPhoneInput] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(OWNER_PHONE_STORAGE_KEY) || '';
      setOwnerPhone(saved);
      setPhoneInput(saved);
    }
  }, [isOpen]);

  if (!isOpen || !session) return null;

  const audit: CashAuditSummary = getCashRegisterAudit(session);
  const formatMoney = formatCurrency;

  const isZ = mode === 'Z';
  const title = isZ ? 'CIERRE DE TURNO DEFINITIVO (Z)' : 'ARQUEO PARCIAL DE CAJA (X)';
  const subtitle = isZ ? '*** SESIÓN CERRADA Y CONCILIADA ***' : '*** CONTROL EN VIVO - NO CIERRA CAJA ***';

  const dateOpened = new Date(session.opened_at).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const dateClosed = session.closed_at
    ? new Date(session.closed_at).toLocaleString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : new Date().toLocaleString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

  const handlePrint = () => {
    window.print();
  };

  const handleSavePhone = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = phoneInput.trim();
    setOwnerPhone(clean);
    if (typeof window !== 'undefined') {
      localStorage.setItem(OWNER_PHONE_STORAGE_KEY, clean);
    }
    setIsEditingPhone(false);
    toast.success('📱 Teléfono del dueño guardado');
  };

  const handleShareWhatsApp = () => {
    if (!ownerPhone) {
      setIsEditingPhone(true);
      toast.info('Ingresá el WhatsApp del dueño o supervisor para enviarle el balance');
      return;
    }
    const url = getOwnerWhatsAppShiftUrl(session, ownerPhone, mode);
    window.open(url, '_blank');
  };

  const handleCopySummary = async () => {
    try {
      const text = formatOwnerCashShiftMessage(session, mode);
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('📋 ¡Resumen de turno copiado al portapapeles!');
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast.error('No se pudo copiar al portapapeles');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col my-8">
        
        {/* Cabecera modal de acciones */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 print:hidden">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${isZ ? 'bg-indigo-600 animate-pulse' : 'bg-amber-500'}`} />
            <h3 className="font-bold text-gray-900 dark:text-white text-sm">
              {isZ ? 'Comprobante de Cierre Z' : 'Comprobante de Arqueo X'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Contacto y Envío al Dueño */}
        <div className="px-5 py-2.5 bg-emerald-50/70 dark:bg-emerald-950/40 border-b border-emerald-100 dark:border-emerald-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs print:hidden">
          <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-200">
            <Smartphone className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-emerald-800 dark:text-emerald-300">WhatsApp Dueño:</span>
              {ownerPhone ? (
                <span className="font-mono font-bold bg-emerald-100 dark:bg-emerald-900/70 px-2 py-0.5 rounded text-[11px] text-emerald-950 dark:text-emerald-100">
                  +{formatArgentineWhatsAppPhone(ownerPhone)}
                </span>
              ) : (
                <span className="italic text-amber-700 dark:text-amber-400 font-medium">Sin configurar</span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setPhoneInput(ownerPhone);
              setIsEditingPhone(!isEditingPhone);
            }}
            className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-200 underline cursor-pointer flex items-center gap-1"
          >
            <Edit2 className="w-3 h-3" />
            <span>{ownerPhone ? 'Cambiar' : 'Configurar'}</span>
          </button>
        </div>

        {/* Formulario rápido desplegable si está editando número del dueño */}
        {isEditingPhone && (
          <div className="px-5 py-3 bg-amber-50/90 dark:bg-amber-950/50 border-b border-amber-200 dark:border-amber-900/70 flex flex-col gap-2 print:hidden animate-fadeIn">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-900 dark:text-amber-200">
                Ingresá el WhatsApp del Dueño / Supervisor:
              </span>
              <span className="text-[10px] text-amber-700 dark:text-amber-400">Ej: 11 4455-6677</span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder="Ej. 11 4455 6677 (Arg)"
                className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-gray-800 border border-amber-300 dark:border-amber-800 rounded-xl text-gray-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={() => handleSavePhone()}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Guardar
              </button>
              <button
                type="button"
                onClick={() => setIsEditingPhone(false)}
                className="px-2.5 py-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 text-gray-700 dark:text-gray-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* CONTENEDOR DE TICKET TÉRMICO (80mm) */}
        <div className="p-6 bg-gray-50 dark:bg-gray-950/40 flex justify-center">
          <div
            ref={receiptRef}
            id="thermal-receipt-container"
            className="w-[300px] bg-white text-gray-900 p-5 rounded shadow-md border border-gray-200 font-mono text-[11px] leading-relaxed select-text"
          >
            {/* Encabezado Comercio */}
            <div className="text-center space-y-0.5 mb-3">
              <h2 className="font-bold text-[14px] uppercase tracking-wider text-black">DISTRIBUIDORA EXPRESS</h2>
              <p className="text-[10px] text-gray-600">Venta Mayorista y Minorista</p>
              <p className="text-[10px] text-gray-600">Av. Central 1234 - Buenos Aires</p>
              <div className="border-b border-dashed border-gray-400 my-2" />
              <div className={`py-1 px-1 rounded font-bold text-[12px] uppercase ${isZ ? 'bg-gray-900 text-white' : 'bg-amber-100 text-amber-900 border border-amber-300'}`}>
                {title}
              </div>
              <p className="text-[9px] text-gray-500 mt-0.5 tracking-tight">{subtitle}</p>
            </div>

            {/* Metadatos de la Sesión */}
            <div className="space-y-1 mb-3 text-[10px]">
              <div className="flex justify-between">
                <span className="text-gray-600">Turno / Sesión:</span>
                <span className="font-bold">#{session.id.slice(-6).toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Cajero Resp.:</span>
                <span className="font-bold">{session.user_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Apertura:</span>
                <span>{dateOpened}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{isZ ? 'Cierre:' : 'Consulta:'}</span>
                <span>{dateClosed}</span>
              </div>
            </div>

            <div className="border-b border-dashed border-gray-400 my-2" />

            {/* Resumen por Medio de Pago */}
            <div className="space-y-1 mb-3">
              <p className="font-bold text-[10px] uppercase text-gray-700 tracking-wider">VENTAS POR CANAL</p>
              <div className="flex justify-between text-[11px]">
                <span>Efectivo:</span>
                <span className="font-bold">{formatMoney(audit.salesCash)}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span>Tarjetas (Posnet):</span>
                <span className="font-bold">{formatMoney(audit.totalCards)}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span>Transferencias:</span>
                <span className="font-bold">{formatMoney(audit.totalTransfers)}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span>Mercado Pago QR:</span>
                <span className="font-bold">{formatMoney(audit.totalQr)}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span>Cuentas Corrientes:</span>
                <span className="font-bold">{formatMoney(audit.totalCredit)}</span>
              </div>
              <div className="border-b border-gray-300 my-1" />
              <div className="flex justify-between text-[12px] font-bold text-black">
                <span>TOTAL VENTAS:</span>
                <span>{formatMoney(audit.totalTurnover)}</span>
              </div>
            </div>

            <div className="border-b border-dashed border-gray-400 my-2" />

            {/* Flujo de Efectivo Físico en Mostrador */}
            <div className="space-y-1 mb-3 text-[11px]">
              <p className="font-bold text-[10px] uppercase text-gray-700 tracking-wider">MOVIMIENTOS DE CAJÓN</p>
              <div className="flex justify-between">
                <span className="text-gray-600">Fondo Inicial:</span>
                <span>{formatMoney(audit.initialCash)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">(+) Ventas Contado:</span>
                <span className="text-green-700 font-bold">+{formatMoney(audit.salesCash)}</span>
              </div>
              {audit.totalIncomeMovements > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">(+) Ingresos manuales:</span>
                  <span className="text-green-700 font-bold">+{formatMoney(audit.totalIncomeMovements)}</span>
                </div>
              )}
              {audit.totalExpenseMovements > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">(-) Egresos / Retiros:</span>
                  <span className="text-red-700 font-bold">-{formatMoney(audit.totalExpenseMovements)}</span>
                </div>
              )}
              <div className="border-b border-gray-300 my-1" />
              <div className="flex justify-between font-bold text-[12px] text-blue-900 bg-blue-50/80 p-1 rounded">
                <span>EFECTIVO ESPERADO:</span>
                <span>{formatMoney(audit.expectedCash)}</span>
              </div>
            </div>

            {/* Auditoría de Cierre Físico (Solo en Cierre Z) */}
            {isZ && (
              <>
                <div className="border-b border-dashed border-gray-400 my-2" />
                <div className="space-y-1.5 mb-3 bg-gray-50 p-2 rounded border border-gray-200">
                  <p className="font-bold text-[10px] uppercase text-gray-700 tracking-wider">ARQUEO FÍSICO CONTADO</p>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-gray-600">Efectivo en Mano:</span>
                    <span className="font-bold text-[12px]">{formatMoney(audit.actualCash || 0)}</span>
                  </div>
                  <div className="flex justify-between text-[11px] items-center pt-1 border-t border-gray-200">
                    <span className="text-gray-600">Diferencia de Caja:</span>
                    {audit.difference === 0 ? (
                      <span className="font-bold text-green-700">CUADRADA ($0,00)</span>
                    ) : (audit.difference || 0) > 0 ? (
                      <span className="font-bold text-green-700">SOBRANTE +{formatMoney(audit.difference || 0)}</span>
                    ) : (
                      <span className="font-bold text-red-700">FALTANTE {formatMoney(audit.difference || 0)}</span>
                    )}
                  </div>
                </div>

                {/* Desglose de billetes si existe */}
                {session.cash_breakdown && Object.keys(session.cash_breakdown).length > 0 && (
                  <div className="text-[9px] text-gray-600 mb-3 space-y-0.5">
                    <p className="font-bold text-[9px] uppercase text-gray-500">Detalle de Billetes:</p>
                    {Object.entries(session.cash_breakdown).map(([denom, count]) => {
                      if (!count || Number(count) <= 0) return null;
                      const sub = Number(denom) * Number(count);
                      return (
                        <div key={denom} className="flex justify-between">
                          <span>{count}x ${Number(denom).toLocaleString('es-AR')}</span>
                          <span>{formatMoney(sub)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* Observaciones */}
            {session.notes && (
              <div className="text-[10px] text-gray-600 mb-3 bg-yellow-50/60 p-1.5 rounded border border-yellow-200">
                <p className="font-bold text-[9px] uppercase text-yellow-800">Observaciones:</p>
                <p className="italic">{session.notes}</p>
              </div>
            )}

            <div className="border-b border-dashed border-gray-400 my-4" />

            {/* Espacio para firmas de conformidad */}
            <div className="pt-4 pb-2 grid grid-cols-2 gap-4 text-center text-[9px]">
              <div>
                <div className="border-b border-gray-800 mb-1 h-8" />
                <p className="font-bold text-gray-800">Firma Cajero</p>
                <p className="text-gray-500 text-[8px]">Entrega de Turno</p>
              </div>
              <div>
                <div className="border-b border-gray-800 mb-1 h-8" />
                <p className="font-bold text-gray-800">Firma Supervisor</p>
                <p className="text-gray-500 text-[8px]">Recepción Conforme</p>
              </div>
            </div>

            <div className="text-center text-[8px] text-gray-400 mt-3">
              Comprobante Interno de Auditoría • Distribuidora Express
            </div>
          </div>
        </div>

        {/* Acciones del pie de página modal */}
        <div className="p-4 bg-gray-50 dark:bg-gray-800/80 border-t border-gray-100 dark:border-gray-800 flex flex-col gap-2.5 print:hidden">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-xs text-xs transition-all active:scale-[0.98] cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir (80mm)</span>
            </button>
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-xs text-xs transition-all active:scale-[0.98] cursor-pointer"
              title={ownerPhone ? `Enviar al Dueño (+${formatArgentineWhatsAppPhone(ownerPhone)})` : 'Enviar por WhatsApp'}
            >
              <Share2 className="w-4 h-4" />
              <span>{isZ ? 'WhatsApp Dueño' : 'Enviar WhatsApp'}</span>
            </button>
            <button
              type="button"
              onClick={handleCopySummary}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-xs text-xs transition-all active:scale-[0.98] cursor-pointer"
              title="Copiar resumen para enviar por Telegram, Email u otro canal"
            >
              {copied ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? '¡Copiado!' : 'Copiar Resumen'}</span>
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-full bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold py-2 px-4 rounded-xl border border-gray-200 dark:border-gray-700 text-xs transition-colors cursor-pointer"
          >
            Cerrar Ventana
          </button>
        </div>

      </div>

      {/* ESTILOS DE IMPRESIÓN TÉRMICA ESTRICTA (80mm) */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #thermal-receipt-container,
          #thermal-receipt-container * {
            visibility: visible;
          }
          #thermal-receipt-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm !important;
            margin: 0 !important;
            padding: 4mm !important;
            box-shadow: none !important;
            border: none !important;
          }
        }
      `}</style>
    </div>
  );
}
