/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Banknote, 
  CreditCard, 
  ArrowLeftRight, 
  Plus, 
  Minus, 
  Lock, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  User, 
  History, 
  ArrowRight, 
  Printer, 
  RotateCcw,
  DollarSign,
  TrendingUp,
  FileText,
  Calculator,
  X,
  Share2,
  Smartphone,
  Edit2
} from 'lucide-react';
import { toast } from 'react-toastify';
import { 
  getActiveCashRegister, 
  openCashRegister, 
  addCashMovement, 
  closeCashRegister, 
  getCashHistory,
  getStoredProfiles,
  formatArgentineWhatsAppPhone,
  getOwnerWhatsAppShiftUrl
} from '@/lib/pos-service';
import { formatCurrency } from '@/lib/formatters';
import { CashRegisterSession, UserProfile } from '@/lib/pos-types';
import { CashReceiptModal, OWNER_PHONE_STORAGE_KEY } from '@/components/cash-receipt-modal';

export default function CajaDashboardPage() {
  const [activeRegister, setActiveRegister] = useState<CashRegisterSession | null>(null);
  const [history, setHistory] = useState<CashRegisterSession[]>([]);
  const [loading, setLoading] = useState(true);

  // Teléfono del Dueño para Cierre Z
  const [ownerPhone, setOwnerPhone] = useState<string>('');
  const [isOwnerPhoneModalOpen, setIsOwnerPhoneModalOpen] = useState(false);
  const [ownerPhoneInput, setOwnerPhoneInput] = useState<string>('');

  // Estados de Modales
  const [openRegisterModal, setOpenRegisterModal] = useState(false);
  const [movementModal, setMovementModal] = useState<{ open: boolean; type: 'income' | 'expense' }>({ open: false, type: 'expense' });
  const [closeRegisterModal, setCloseRegisterModal] = useState(false);

  // Campos de Formularios
  const [initialCashInput, setInitialCashInput] = useState<string>('');
  const [movementAmount, setMovementAmount] = useState<string>('');
  const [movementReason, setMovementReason] = useState<string>('');
  const [actualCashCounted, setActualCashCounted] = useState<string>('');
  const [closeNotes, setCloseNotes] = useState<string>('');

  // Comprobante Térmico (Arqueo X y Cierre Z)
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [receiptMode, setReceiptMode] = useState<'X' | 'Z'>('X');
  const [selectedSessionForReceipt, setSelectedSessionForReceipt] = useState<CashRegisterSession | null>(null);

  // Modo de conteo y calculadora de billetes
  const [countMode, setCountMode] = useState<'direct' | 'calculator'>('direct');
  const [billCounts, setBillCounts] = useState<Record<string, number>>({
    '20000': 0,
    '10000': 0,
    '2000': 0,
    '1000': 0,
    '500': 0,
    '200': 0,
    '100': 0,
  });

  const handleBillCountChange = (denom: string, val: string) => {
    const qty = Math.max(0, parseInt(val) || 0);
    const updated = { ...billCounts, [denom]: qty };
    setBillCounts(updated);
    const total = Object.entries(updated).reduce((sum, [d, q]) => sum + Number(d) * q, 0);
    setActualCashCounted(total.toString());
  };

  const [currentUser] = useState<UserProfile>(() => {
    const profiles = getStoredProfiles();
    return profiles[0] || { id: 'usr-admin', email: 'admin@distribuidora.com', full_name: 'Administrador', role: 'admin', pin_code: '1234' };
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const active = await getActiveCashRegister();
      const past = await getCashHistory();
      setActiveRegister(active);
      setHistory(past);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(OWNER_PHONE_STORAGE_KEY) || '';
      setOwnerPhone(saved);
      setOwnerPhoneInput(saved);
    }
  }, []);

  const handleSaveOwnerPhone = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = ownerPhoneInput.trim();
    setOwnerPhone(clean);
    if (typeof window !== 'undefined') {
      localStorage.setItem(OWNER_PHONE_STORAGE_KEY, clean);
    }
    setIsOwnerPhoneModalOpen(false);
    toast.success('📱 Teléfono del dueño actualizado');
  };

  const handleSendSessionWhatsApp = (session: CashRegisterSession) => {
    if (!ownerPhone) {
      setOwnerPhoneInput('');
      setIsOwnerPhoneModalOpen(true);
      toast.info('Configurá el número de WhatsApp del dueño para enviar el balance');
      return;
    }
    const url = getOwnerWhatsAppShiftUrl(session, ownerPhone, 'Z');
    window.open(url, '_blank');
  };

  const formatMoney = formatCurrency;

  // Apertura de Caja
  const handleOpenRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const initial = Number(initialCashInput) || 0;
    const session = await openCashRegister(currentUser.full_name, initial);
    setActiveRegister(session);
    setOpenRegisterModal(false);
    setInitialCashInput('');
    toast.success(`🟢 Caja abierta con éxito con fondo inicial de ${formatMoney(initial)}`);
  };

  // Registro de Movimiento Manual
  const handleRecordMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRegister) return;
    const amt = Number(movementAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.warn('Ingresa un monto válido');
      return;
    }
    if (!movementReason.trim()) {
      toast.warn('Ingresa el motivo del movimiento');
      return;
    }

    try {
      await addCashMovement(activeRegister.id, movementModal.type, amt, movementReason.trim());
      toast.success(
        movementModal.type === 'income'
          ? `➕ Ingreso registrado: +${formatMoney(amt)}`
          : `➖ Egreso registrado: -${formatMoney(amt)}`
      );
      setMovementModal({ open: false, type: 'expense' });
      setMovementAmount('');
      setMovementReason('');
      loadData();
    } catch (err) {
      console.error(err);
      toast.error('Error al registrar movimiento');
    }
  };

  // Cierre Guiado de Caja
  const handleCloseRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRegister) return;
    const counted = Number(actualCashCounted);
    if (isNaN(counted) || counted < 0) {
      toast.warn('Ingresa el dinero físico contado en mano');
      return;
    }

    try {
      const closed = await closeCashRegister(
        activeRegister, 
        counted, 
        closeNotes,
        countMode === 'calculator' ? billCounts : undefined
      );
      toast.success('🏁 Turno de caja cerrado correctamente');
      setCloseRegisterModal(false);
      setActualCashCounted('');
      setCloseNotes('');
      // Abrir comprobante de Cierre Z automáticamente
      setSelectedSessionForReceipt(closed);
      setReceiptMode('Z');
      setIsReceiptModalOpen(true);
      loadData();
    } catch (err) {
      console.error(err);
      toast.error('Error al cerrar la caja');
    }
  };

  // Cálculos de Arqueo Guiado
  const countedNum = Number(actualCashCounted) || 0;
  const expectedCash = activeRegister?.expected_cash || 0;
  const difference = countedNum - expectedCash;

  return (
    <div className="h-full flex flex-col min-h-0 overflow-y-auto pr-1 space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">
              Gestión de Caja y Arqueo
            </h1>
            {activeRegister?.status === 'open' ? (
              <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 font-extrabold text-xs px-3 py-0.5 rounded-full">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Abierta
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 font-extrabold text-xs px-3 py-0.5 rounded-full">
                <Lock className="w-3 h-3" />
                Cerrada
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            Control de fondos de apertura, ingresos, egresos y cierre guiado del turno de mostrador.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setOwnerPhoneInput(ownerPhone);
              setIsOwnerPhoneModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-850 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors cursor-pointer shadow-xs"
            title="Configurar teléfono del dueño para recibir balances de cierre de turno"
          >
            <Smartphone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>
              {ownerPhone ? `Dueño: +${formatArgentineWhatsAppPhone(ownerPhone)}` : 'Configurar WhatsApp Dueño'}
            </span>
            <Edit2 className="w-3 h-3 opacity-60 ml-0.5" />
          </button>

          <Link
            href="/dashboard/pos"
            className="bg-[#dc2626] hover:bg-red-700 text-white font-extrabold py-2.5 px-4 rounded-xl text-xs sm:text-sm transition-all shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <span>Ir a la Terminal POS</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* TARJETA PRINCIPAL: ESTADO DE LA CAJA ACTIVA */}
      {loading ? (
        <div className="p-12 text-center text-gray-400 text-xs font-bold">
          Cargando datos de caja...
        </div>
      ) : activeRegister?.status === 'open' ? (
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-5 sm:p-7 shadow-xs space-y-6">
          {/* Fila Superior: Info del Turno y Botones de Movimiento */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                <Banknote className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Cajero en Turno</p>
                <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white">
                  {activeRegister.user_name}
                </h3>
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                  <Clock className="w-3.5 h-3.5" />
                  Abierta el {new Date(activeRegister.opened_at).toLocaleDateString('es-AR')} a las {new Date(activeRegister.opened_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setMovementModal({ open: true, type: 'income' })}
                className="bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold px-3 py-2 rounded-xl text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Ingreso Manual</span>
              </button>

              <button
                type="button"
                onClick={() => setMovementModal({ open: true, type: 'expense' })}
                className="bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-bold px-3 py-2 rounded-xl text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Minus className="w-3.5 h-3.5" />
                <span>Egreso / Retiro</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedSessionForReceipt(activeRegister);
                  setReceiptMode('X');
                  setIsReceiptModalOpen(true);
                }}
                className="bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold px-3 py-2 rounded-xl text-xs transition-colors flex items-center gap-1.5 cursor-pointer border border-indigo-200 dark:border-indigo-800"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Arqueo Parcial (X)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActualCashCounted(activeRegister.expected_cash.toString());
                  setCountMode('direct');
                  setCloseRegisterModal(true);
                }}
                className="bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 font-black px-4 py-2 rounded-xl text-xs transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Cierre Guiado (Corte Z)</span>
              </button>
            </div>
          </div>

          {/* Bloques de Métricas de Caja */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {/* Fondo Inicial */}
            <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                Fondo Inicial
              </span>
              <p className="text-xl font-black text-gray-900 dark:text-white">
                {formatMoney(activeRegister.initial_cash)}
              </p>
            </div>

            {/* Tarjetas / Posnet */}
            <div className="bg-blue-50/70 dark:bg-blue-950/30 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/40">
              <span className="text-[11px] font-bold text-primary dark:text-blue-400 uppercase tracking-wider block mb-1">
                Tarjeta / Posnet
              </span>
              <p className="text-xl font-black text-primary dark:text-blue-400">
                {formatMoney(activeRegister.total_cards)}
              </p>
            </div>

            {/* Transferencias / QR */}
            <div className="bg-sky-50/70 dark:bg-sky-950/30 p-4 rounded-2xl border border-sky-100 dark:border-sky-900/40">
              <span className="text-[11px] font-bold text-sky-700 dark:text-sky-400 uppercase tracking-wider block mb-1">
                Transfer. / QR
              </span>
              <p className="text-xl font-black text-sky-700 dark:text-sky-400">
                {formatMoney(activeRegister.total_transfers)}
              </p>
            </div>

            {/* Saldo Efectivo Esperado */}
            <div className="bg-emerald-50 dark:bg-emerald-950/40 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/60">
              <span className="text-[11px] font-black text-emerald-700 dark:text-emerald-300 uppercase tracking-wider block mb-1">
                💵 Efectivo Teórico en Cajón
              </span>
              <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300">
                {formatMoney(activeRegister.expected_cash)}
              </p>
            </div>
          </div>

          {/* Historial de Movimientos Manuales del Turno Actual */}
          {activeRegister.movements && activeRegister.movements.length > 0 && (
            <div className="pt-4 border-t border-gray-100 dark:border-gray-800 space-y-2.5">
              <h4 className="font-extrabold text-xs text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Movimientos Manuales Registrados ({activeRegister.movements.length}):
              </h4>
              <div className="space-y-1.5">
                {activeRegister.movements.map((mov) => (
                  <div
                    key={mov.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-200/60 dark:border-gray-800 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-lg flex items-center justify-center font-black ${
                        mov.type === 'income' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {mov.type === 'income' ? '+' : '-'}
                      </span>
                      <span className="font-bold text-gray-800 dark:text-gray-200">{mov.reason}</span>
                    </div>
                    <span className={`font-black ${
                      mov.type === 'income' ? 'text-emerald-600' : 'text-amber-600'
                    }`}>
                      {mov.type === 'income' ? '+' : '-'}{formatMoney(mov.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Caja Cerrada: Invitación a Abrir */
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-8 sm:p-12 text-center shadow-xs space-y-4 max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-3xl bg-gray-100 dark:bg-gray-800 text-gray-500 flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-xl font-black text-gray-900 dark:text-white">
              La Caja se encuentra Cerrada
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
              Abre una nueva sesión de turno para registrar cobros en el local y llevar el control de dinero.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpenRegisterModal(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3 px-6 rounded-2xl text-sm shadow-md transition-all active:scale-95 cursor-pointer inline-flex items-center gap-2"
          >
            <Banknote className="w-4 h-4" />
            <span>Abrir Nueva Caja</span>
          </button>
        </div>
      )}

      {/* SECCIÓN HISTORIAL DE CIERRES ANTERIORES */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-gray-400" />
          <h3 className="font-extrabold text-sm sm:text-base text-gray-900 dark:text-white">
            Historial de Cierres Anteriores (Auditoría)
          </h3>
        </div>

        {history.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 text-center text-gray-400 text-xs">
            No hay registros de cierres anteriores aún.
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400 font-extrabold border-b border-gray-200 dark:border-gray-800">
                  <tr>
                    <th className="p-3.5">Cajero</th>
                    <th className="p-3.5">Apertura</th>
                    <th className="p-3.5">Cierre</th>
                    <th className="p-3.5 text-right">Efectivo Teórico</th>
                    <th className="p-3.5 text-right">Efectivo Real</th>
                    <th className="p-3.5 text-right">Diferencia</th>
                    <th className="p-3.5 text-right">Ventas Totales</th>
                    <th className="p-3.5 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-medium">
                  {history.map((h) => (
                    <tr key={h.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                      <td className="p-3.5 font-bold text-gray-900 dark:text-white">{h.user_name}</td>
                      <td className="p-3.5 text-gray-500">
                        {new Date(h.opened_at).toLocaleDateString('es-AR')} {new Date(h.opened_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="p-3.5 text-gray-500">
                        {h.closed_at 
                          ? `${new Date(h.closed_at).toLocaleDateString('es-AR')} ${new Date(h.closed_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`
                          : '-'}
                      </td>
                      <td className="p-3.5 text-right font-bold">{formatMoney(h.expected_cash)}</td>
                      <td className="p-3.5 text-right font-bold text-gray-900 dark:text-white">
                        {h.actual_cash != null ? formatMoney(h.actual_cash) : '-'}
                      </td>
                      <td className="p-3.5 text-right">
                        {h.cash_difference != null ? (
                          <span className={`px-2 py-0.5 rounded-full font-black text-[11px] ${
                            h.cash_difference === 0 
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : h.cash_difference > 0
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                              : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                          }`}>
                            {h.cash_difference > 0 ? `+${formatMoney(h.cash_difference)}` : formatMoney(h.cash_difference)}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="p-3.5 text-right font-black text-gray-900 dark:text-white">
                        {formatMoney(h.total_sales)}
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedSessionForReceipt(h);
                              setReceiptMode('Z');
                              setIsReceiptModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800 transition-colors cursor-pointer"
                            title="Reimprimir Comprobante de Cierre Z"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Ticket Z</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSendSessionWhatsApp(h)}
                            className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-900 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800 transition-colors cursor-pointer"
                            title={ownerPhone ? `Enviar balance al dueño (+${formatArgentineWhatsAppPhone(ownerPhone)})` : 'Enviar balance por WhatsApp'}
                          >
                            <Share2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span className="hidden sm:inline">WhatsApp</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: APERTURA DE CAJA */}
      {openRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <form
            onSubmit={handleOpenRegister}
            className="bg-white dark:bg-gray-900 rounded-3xl overflow-hidden shadow-2xl max-w-sm w-full border border-gray-200 dark:border-gray-800 p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-gray-900 dark:text-white">
                Abrir Sesión de Caja
              </h3>
              <button
                type="button"
                onClick={() => setOpenRegisterModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1">
                Fondo de Cambio Inicial:
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-gray-400">$</span>
                <input
                  type="number"
                  step="any"
                  value={initialCashInput}
                  onChange={(e) => setInitialCashInput(e.target.value)}
                  placeholder="0.00 (puede iniciar en $0)"
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl pl-8 pr-3 py-2 text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <p className="text-[10px] text-gray-400 mt-1">
                Ingresa los billetes o monedas con los que empieza el cajón.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setOpenRegisterModal(false)}
                className="flex-1 py-2.5 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl text-xs"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2.5 rounded-xl text-xs shadow-md transition-colors"
              >
                Confirmar Apertura
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 2: INGRESO O EGRESO MANUAL */}
      {movementModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <form
            onSubmit={handleRecordMovement}
            className="bg-white dark:bg-gray-900 rounded-3xl overflow-hidden shadow-2xl max-w-sm w-full border border-gray-200 dark:border-gray-800 p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-gray-900 dark:text-white">
                {movementModal.type === 'income' ? '➕ Registrar Ingreso Manual' : '➖ Registrar Egreso / Retiro'}
              </h3>
              <button
                type="button"
                onClick={() => setMovementModal({ open: false, type: 'expense' })}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1">
                Monto del {movementModal.type === 'income' ? 'Ingreso' : 'Egreso'}:
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-gray-400">$</span>
                <input
                  type="number"
                  step="any"
                  required
                  value={movementAmount}
                  onChange={(e) => setMovementAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl pl-8 pr-3 py-2 text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-primary outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1">
                Motivo / Justificación:
              </label>
              <input
                type="text"
                required
                value={movementReason}
                onChange={(e) => setMovementReason(e.target.value)}
                placeholder={movementModal.type === 'income' ? 'Ej. Aporte de cambio extra' : 'Ej. Pago proveedor de pan, viáticos'}
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-primary outline-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setMovementModal({ open: false, type: 'expense' })}
                className="flex-1 py-2.5 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl text-xs"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className={`flex-1 text-white font-extrabold py-2.5 rounded-xl text-xs shadow-md transition-colors ${
                  movementModal.type === 'income' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                Registrar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 3: CIERRE GUIADO DE CAJA (CORTE Z) */}
      {closeRegisterModal && activeRegister && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <form
            onSubmit={handleCloseRegister}
            className="bg-white dark:bg-gray-900 rounded-3xl overflow-hidden shadow-2xl max-w-md w-full border border-gray-200 dark:border-gray-800 p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-black text-base text-gray-900 dark:text-white">
                  Cierre Guiado de Turno (Corte Z)
                </h3>
                <p className="text-[11px] text-gray-500">Conciliación de dinero físico vs. teórico del sistema</p>
              </div>
              <button
                type="button"
                onClick={() => setCloseRegisterModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Resumen del Sistema */}
            <div className="bg-gray-50 dark:bg-gray-800/60 p-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-2 text-xs">
              <div className="flex justify-between text-gray-500">
                <span>Fondo Inicial:</span>
                <span className="font-bold text-gray-800 dark:text-gray-200">{formatMoney(activeRegister.initial_cash)}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Cobros Tarjetas / Posnet:</span>
                <span className="font-bold text-gray-800 dark:text-gray-200">{formatMoney(activeRegister.total_cards)}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Cobros Transferencias / QR:</span>
                <span className="font-bold text-gray-800 dark:text-gray-200">{formatMoney(activeRegister.total_transfers)}</span>
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700 pt-1.5 flex justify-between font-black text-sm text-gray-900 dark:text-white">
                <span>Efectivo Teórico Esperado:</span>
                <span className="text-emerald-600 dark:text-emerald-400">{formatMoney(expectedCash)}</span>
              </div>
            </div>

            {/* Selector de Modo de Conteo */}
            <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl gap-1">
              <button
                type="button"
                onClick={() => setCountMode('direct')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all ${
                  countMode === 'direct'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-xs'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Banknote className="w-3.5 h-3.5" />
                <span>Ingreso Directo</span>
              </button>
              <button
                type="button"
                onClick={() => setCountMode('calculator')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all ${
                  countMode === 'calculator'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-xs'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Calculator className="w-3.5 h-3.5" />
                <span>Calculadora Billetes</span>
              </button>
            </div>

            {/* Campo Dinero Físico Contado: Directo vs Calculadora */}
            {countMode === 'direct' ? (
              <div>
                <label className="text-xs font-extrabold text-gray-800 dark:text-gray-200 block mb-1">
                  Efectivo Físico Contado en Mano:
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-gray-400">$</span>
                  <input
                    type="number"
                    step="any"
                    required
                    value={actualCashCounted}
                    onChange={(e) => setActualCashCounted(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl pl-8 pr-3 py-2.5 text-base font-black text-gray-900 dark:text-white focus:ring-2 focus:ring-[#dc2626] outline-none"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2 bg-gray-50 dark:bg-gray-800/40 p-3 rounded-2xl border border-gray-200 dark:border-gray-700">
                <p className="text-[11px] font-bold text-gray-600 dark:text-gray-300">
                  Ingresa la cantidad de billetes de cada denominación:
                </p>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1 text-xs">
                  {['20000', '10000', '2000', '1000', '500', '200', '100'].map((denom) => (
                    <div key={denom} className="flex items-center justify-between bg-white dark:bg-gray-800 p-2 rounded-xl border border-gray-200 dark:border-gray-700">
                      <span className="font-extrabold text-gray-800 dark:text-gray-200">
                        ${Number(denom).toLocaleString('es-AR')}
                      </span>
                      <div className="flex items-center gap-1.5 w-20">
                        <span className="text-[10px] text-gray-400 font-bold">x</span>
                        <input
                          type="number"
                          min="0"
                          value={billCounts[denom] || ''}
                          onChange={(e) => handleBillCountChange(denom, e.target.value)}
                          placeholder="0"
                          className="w-full text-right bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg p-1 font-bold text-gray-900 dark:text-white text-xs outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="pt-2 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center text-xs">
                  <span className="font-bold text-gray-500">Total Sumado:</span>
                  <span className="font-black text-sm text-gray-900 dark:text-white">
                    {formatMoney(Number(actualCashCounted) || 0)}
                  </span>
                </div>
              </div>
            )}

            {/* Indicador de Diferencia en Vivo */}
            <div className={`p-3 rounded-xl border flex items-center justify-between text-xs font-extrabold ${
              difference === 0 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                : difference > 0
                ? 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300'
                : 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300'
            }`}>
              <span>
                {difference === 0 ? '✓ Caja exacta sin diferencias' : difference > 0 ? 'ℹ️ Sobrante de caja:' : '⚠️ Faltante de dinero:'}
              </span>
              <span className="text-sm">
                {difference > 0 ? `+${formatMoney(difference)}` : formatMoney(difference)}
              </span>
            </div>

            {/* Observaciones */}
            <div>
              <label className="text-[11px] font-bold text-gray-500 block mb-1">
                Observaciones del Cierre (Opcional):
              </label>
              <textarea
                rows={2}
                value={closeNotes}
                onChange={(e) => setCloseNotes(e.target.value)}
                placeholder="Ej. Se retiraron $15.000 para depósito bancario..."
                className="w-full p-2 text-xs rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCloseRegisterModal(false)}
                className="flex-1 py-2.5 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl text-xs"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 bg-[#dc2626] hover:bg-red-700 text-white font-extrabold py-2.5 rounded-xl text-xs shadow-md transition-colors"
              >
                Confirmar Cierre Z
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 4: CONFIGURACIÓN TELÉFONO DUEÑO */}
      {isOwnerPhoneModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <form
            onSubmit={handleSaveOwnerPhone}
            className="bg-white dark:bg-gray-900 rounded-3xl overflow-hidden shadow-2xl max-w-sm w-full border border-gray-200 dark:border-gray-800 p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
                  <Smartphone className="w-4 h-4" />
                </div>
                <h3 className="font-black text-sm text-gray-900 dark:text-white">
                  WhatsApp del Dueño
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOwnerPhoneModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Ingresá el número de celular del dueño o supervisor al cual se enviarán los resúmenes y balances de cierre de turno (Corte Z).
            </p>

            <div>
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1">
                Número de WhatsApp (Argentina):
              </label>
              <input
                type="text"
                required
                value={ownerPhoneInput}
                onChange={(e) => setOwnerPhoneInput(e.target.value)}
                placeholder="Ej. 11 4455-6677 o 351 445-6677"
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
              />
              <p className="text-[10px] text-gray-400 mt-1">
                Formateo automático a +54 9 internacional. No te preocupes por el 0 o 15.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsOwnerPhoneModalOpen(false)}
                className="flex-1 py-2.5 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl text-xs"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2.5 rounded-xl text-xs shadow-md transition-colors"
              >
                Guardar Número
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL COMPROBANTE TÉRMICO (ARQUEO X Y CIERRE Z) */}
      <CashReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        session={selectedSessionForReceipt}
        mode={receiptMode}
      />
    </div>
  );
}
