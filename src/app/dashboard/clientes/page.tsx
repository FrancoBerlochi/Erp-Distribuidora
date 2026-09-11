/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  RefreshCw, 
  DollarSign, 
  CreditCard, 
  AlertCircle, 
  CheckCircle2, 
  MessageCircle, 
  Receipt, 
  Edit3, 
  Trash2, 
  ArrowUpRight, 
  ArrowDownLeft, 
  X, 
  Save, 
  Phone, 
  MapPin, 
  FileText,
  Clock,
  TrendingDown,
  Building2,
  Banknote,
  Send,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { toast } from 'react-toastify';
import { 
  getCustomers, 
  saveCustomer, 
  deleteCustomer, 
  getCustomerMovements, 
  registerCustomerPayment,
  generateWhatsAppReminderUrl 
} from '@/lib/customers-service';
import { getActiveCashRegister } from '@/lib/pos-service';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/formatters';
import { Customer, CustomerMovement, CashRegisterSession } from '@/lib/pos-types';

export default function ClientesPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'with_debt' | 'zero_debt'>('all');
  const [activeCashRegister, setActiveCashRegister] = useState<CashRegisterSession | null>(null);

  // Modales
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<Partial<Customer> | null>(null);

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentCustomer, setPaymentCustomer] = useState<Customer | null>(null);
  const [paymentAmountStr, setPaymentAmountStr] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'efectivo' | 'transferencia' | 'tarjeta_posnet' | 'qr'>('efectivo');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);

  const [movementsModalOpen, setMovementsModalOpen] = useState(false);
  const [selectedCustomerForMovements, setSelectedCustomerForMovements] = useState<Customer | null>(null);
  const [movements, setMovements] = useState<CustomerMovement[]>([]);
  const [loadingMovements, setLoadingMovements] = useState(false);

  const formatMoney = formatCurrency;
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  const loadData = async () => {
    setLoading(true);
    try {
      const [custList, cashReg] = await Promise.all([
        getCustomers(),
        getActiveCashRegister().catch(() => null),
      ]);
      setCustomers(custList);
      setActiveCashRegister(cashReg);
    } catch (err) {
      console.error(err);
      toast.error('Error cargando clientes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Clientes filtrados
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      // Filtro de estado
      if (statusFilter === 'with_debt' && (c.current_balance || 0) <= 0) return false;
      if (statusFilter === 'zero_debt' && (c.current_balance || 0) > 0) return false;

      // Filtro de búsqueda
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        (c.document_number && c.document_number.includes(q)) ||
        (c.phone && c.phone.includes(q)) ||
        (c.address && c.address.toLowerCase().includes(q))
      );
    });
  }, [customers, statusFilter, searchQuery]);

  // Resetear página al filtrar o buscar
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  const totalPages = Math.ceil(filteredCustomers.length / pageSize) || 1;
  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCustomers.slice(start, start + pageSize);
  }, [filteredCustomers, currentPage, pageSize]);

  // Métricas globales
  const totalDebt = useMemo(() => {
    return customers.reduce((acc, c) => acc + (Number(c.current_balance) || 0), 0);
  }, [customers]);

  const customersWithDebtCount = useMemo(() => {
    return customers.filter((c) => (Number(c.current_balance) || 0) > 0).length;
  }, [customers]);

  const totalCreditGranted = useMemo(() => {
    return customers.reduce((acc, c) => acc + (Number(c.credit_limit) || 0), 0);
  }, [customers]);

  // Guardar / Crear cliente
  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerToEdit?.name?.trim()) {
      toast.warn('El nombre del cliente es obligatorio');
      return;
    }

    try {
      await saveCustomer(customerToEdit);
      toast.success(customerToEdit.id ? 'Cliente actualizado' : 'Cliente registrado');
      setEditModalOpen(false);
      setCustomerToEdit(null);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Error guardando cliente');
    }
  };

  // Eliminar cliente
  const handleDeleteCustomer = async (id: string, name: string) => {
    if (!confirm(`¿Estás seguro de eliminar el cliente "${name}"?`)) return;
    try {
      await deleteCustomer(id);
      toast.success('Cliente eliminado');
      await loadData();
    } catch {
      toast.error('Error eliminando cliente');
    }
  };

  // Abrir modal de movimientos
  const handleOpenMovements = async (cust: Customer) => {
    setSelectedCustomerForMovements(cust);
    setMovementsModalOpen(true);
    setLoadingMovements(true);
    try {
      const list = await getCustomerMovements(cust.id);
      setMovements(list);
    } catch {
      toast.error('Error cargando movimientos');
    } finally {
      setLoadingMovements(false);
    }
  };

  // Registrar Cobranza
  const handleRegisterPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentCustomer) return;
    const amount = Number(paymentAmountStr) || 0;
    if (amount <= 0) {
      toast.warn('Ingresa un monto válido a cobrar');
      return;
    }

    setProcessingPayment(true);
    try {
      const result = await registerCustomerPayment({
        customerId: paymentCustomer.id,
        amount,
        paymentMethod,
        notes: paymentNotes.trim() || undefined,
        cashRegisterId: activeCashRegister?.id,
        cashierName: 'Administrador',
      });

      toast.success(`Cobranza de ${formatMoney(amount)} registrada con éxito`);
      setPaymentModalOpen(false);
      setPaymentCustomer(null);
      setPaymentAmountStr('');
      setPaymentNotes('');
      await loadData();

      // Si el modal de movimientos estaba abierto para este cliente, actualizarlo
      if (selectedCustomerForMovements?.id === paymentCustomer.id) {
        setSelectedCustomerForMovements(result.customer);
        const updatedMovs = await getCustomerMovements(paymentCustomer.id);
        setMovements(updatedMovs);
      }
    } catch (err: any) {
      toast.error(err.message || 'Error registrando cobranza');
    } finally {
      setProcessingPayment(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. CABECERA PRINCIPAL */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#dc2626]/10 text-[#dc2626] flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                Clientes y Cuentas Corrientes
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Control de saldo deudor, límites de fiado, cobranzas e historial de movimientos.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            title="Recargar datos"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => {
              setCustomerToEdit({
                name: '',
                document_type: 'CUIT',
                document_number: '',
                phone: '',
                email: '',
                address: '',
                credit_limit: 150000,
                current_balance: 0,
                status: 'active',
                notes: '',
              });
              setEditModalOpen(true);
            }}
            className="bg-[#dc2626] hover:bg-red-700 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Cliente</span>
          </button>
        </div>
      </div>

      {/* 2. TARJETAS DE MÉTRICAS (KPIS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Deuda en la Calle */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Deuda en la Calle</span>
            <div className="w-8 h-8 rounded-xl bg-red-50 dark:bg-red-950/60 text-[#dc2626] flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-[#dc2626]">
              {formatMoney(totalDebt)}
            </span>
          </div>
          <p className="text-[11px] text-gray-400 mt-1">
            Total adeudado por clientes fiados
          </p>
        </div>

        {/* Clientes con Deuda Activa */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Clientes con Deuda</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-gray-900 dark:text-white">
              {customersWithDebtCount}
              <span className="text-xs text-gray-400 font-medium ml-1">/ {customers.length} clientes</span>
            </span>
          </div>
          <p className="text-[11px] text-gray-400 mt-1">
            {customers.length > 0 ? `${Math.round((customersWithDebtCount / customers.length) * 100)}% de la cartera con saldo pendiente` : 'Sin clientes'}
          </p>
        </div>

        {/* Crédito Total Autorizado */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Crédito Total Otorgado</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-gray-900 dark:text-white">
              {formatMoney(totalCreditGranted)}
            </span>
          </div>
          <p className="text-[11px] text-gray-400 mt-1">
            {totalCreditGranted > 0 ? `${Math.round((totalDebt / totalCreditGranted) * 100)}% de exposición actual` : 'Sin límites asignados'}
          </p>
        </div>

        {/* Estado de Caja para Cobranzas */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Caja Activa</span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${activeCashRegister ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className={`text-base font-black ${activeCashRegister ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'}`}>
              {activeCashRegister ? '🟢 Caja Abierta' : '🔴 Caja Cerrada'}
            </span>
          </div>
          <p className="text-[11px] text-gray-400 mt-1">
            {activeCashRegister ? `Las cobranzas en efectivo sumarán a la caja de ${activeCashRegister.user_name}` : 'Abre la caja en POS para registrar ingresos'}
          </p>
        </div>
      </div>

      {/* 3. BARRA DE FILTROS Y BÚSQUEDA */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between shadow-xs">
        {/* Input Buscador */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre, CUIT, teléfono..."
            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#dc2626]"
          />
        </div>

        {/* Filtros de Segmentación */}
        <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl text-xs font-bold w-full md:w-auto overflow-x-auto">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === 'all'
                ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-xs'
                : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            Todos ({customers.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('with_debt')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap ${
              statusFilter === 'with_debt'
                ? 'bg-red-500 text-white shadow-xs font-black'
                : 'text-red-600 dark:text-red-400 hover:bg-red-50/50'
            }`}
          >
            <span>Con Deuda</span>
            <span className="bg-white/20 px-1.5 py-0.2 rounded text-[10px]">{customersWithDebtCount}</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('zero_debt')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === 'zero_debt'
                ? 'bg-emerald-600 text-white shadow-xs font-black'
                : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50/50'
            }`}
          >
            Al Día ({customers.length - customersWithDebtCount})
          </button>
        </div>
      </div>

      {/* 4. LISTADO / TABLA DE CLIENTES */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-gray-400 space-y-2">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#dc2626]" />
            <p className="text-xs font-bold">Cargando base de clientes...</p>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="p-12 text-center text-gray-400 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto">
              <Users className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-sm font-bold text-gray-700 dark:text-gray-300">
              No se encontraron clientes
            </p>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              {searchQuery ? 'Prueba con otro término de búsqueda o cambia los filtros.' : 'Comienza registrando tu primer cliente habitual o almacén.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400 font-bold border-b border-gray-100 dark:border-gray-800">
                <tr>
                  <th className="p-4">Cliente / Razón Social</th>
                  <th className="p-4">Documento / Contacto</th>
                  <th className="p-4">Saldo Deudor</th>
                  <th className="p-4">Límite de Crédito</th>
                  <th className="p-4">Uso de Línea</th>
                  <th className="p-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {paginatedCustomers.map((cust) => {
                  const balance = Number(cust.current_balance) || 0;
                  const limit = Number(cust.credit_limit) || 0;
                  const percent = limit > 0 ? Math.min(100, Math.round((balance / limit) * 100)) : 0;
                  const isOverLimit = balance > limit && limit > 0;

                  return (
                    <tr key={cust.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors">
                      {/* Cliente */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-700 dark:text-gray-300 font-black shrink-0">
                            {cust.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-gray-900 dark:text-white truncate">
                              {cust.name}
                            </p>
                            {cust.address && (
                              <p className="text-[11px] text-gray-400 flex items-center gap-1 truncate">
                                <MapPin className="w-3 h-3 shrink-0" />
                                <span>{cust.address}</span>
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Documento y Contacto */}
                      <td className="p-4">
                        <div className="space-y-0.5">
                          <span className="font-mono text-[11px] text-gray-600 dark:text-gray-300 block">
                            {cust.document_type}: {cust.document_number || 'S/D'}
                          </span>
                          {cust.phone && (
                            <span className="text-[11px] text-gray-400 flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              <span>{cust.phone}</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Saldo Deudor */}
                      <td className="p-4">
                        <div>
                          <span className={`font-black text-sm block ${balance > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            {formatMoney(balance)}
                          </span>
                          {isOverLimit && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-black px-1.5 py-0.2 rounded bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300">
                              Límite Excedido
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Límite de Crédito */}
                      <td className="p-4">
                        <span className="font-bold text-gray-700 dark:text-gray-300">
                          {formatMoney(limit)}
                        </span>
                      </td>

                      {/* Uso de Línea */}
                      <td className="p-4 w-44">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] text-gray-400">
                            <span>{percent}% usado</span>
                            <span>Disp: {formatMoney(Math.max(0, limit - balance))}</span>
                          </div>
                          <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                isOverLimit 
                                  ? 'bg-red-600' 
                                  : percent > 80 
                                    ? 'bg-amber-500' 
                                    : 'bg-emerald-500'
                              }`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Acciones */}
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Cobrar */}
                          {balance > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setPaymentCustomer(cust);
                                setPaymentAmountStr(balance.toString());
                                setPaymentModalOpen(true);
                              }}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                              title="Registrar Cobranza"
                            >
                              <DollarSign className="w-3.5 h-3.5" />
                              <span>Cobrar</span>
                            </button>
                          )}

                          {/* WhatsApp Recordatorio */}
                          {cust.phone && balance > 0 && (
                            <a
                              href={generateWhatsAppReminderUrl(cust)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                              title="Enviar recordatorio de deuda por WhatsApp"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </a>
                          )}

                          {/* Ficha / Movimientos */}
                          <button
                            type="button"
                            onClick={() => handleOpenMovements(cust)}
                            className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors cursor-pointer"
                            title="Ver Ficha y Movimientos de Cuenta Corriente"
                          >
                            <FileText className="w-4 h-4" />
                          </button>

                          {/* Editar */}
                          <button
                            type="button"
                            onClick={() => {
                              setCustomerToEdit({ ...cust });
                              setEditModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors cursor-pointer"
                            title="Editar Datos"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {/* Eliminar */}
                          <button
                            type="button"
                            onClick={() => handleDeleteCustomer(cust.id, cust.name)}
                            className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 text-gray-400 transition-colors cursor-pointer"
                            title="Eliminar Cliente"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Barra de Paginación */}
        {!loading && filteredCustomers.length > pageSize && (
          <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500 dark:text-gray-400 bg-gray-50/50 dark:bg-gray-800/30">
            <div>
              Mostrando <span className="font-bold text-gray-700 dark:text-gray-200">{(currentPage - 1) * pageSize + 1}</span> a{' '}
              <span className="font-bold text-gray-700 dark:text-gray-200">
                {Math.min(currentPage * pageSize, filteredCustomers.length)}
              </span>{' '}
              de <span className="font-bold text-gray-700 dark:text-gray-200">{filteredCustomers.length}</span> clientes
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                title="Página Anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-1 font-bold text-gray-700 dark:text-gray-200">
                Página {currentPage} de {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                title="Página Siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 5. MODAL DE REGISTRAR COBRANZA */}
      {paymentModalOpen && paymentCustomer && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <form
            onSubmit={handleRegisterPayment}
            className="bg-white dark:bg-gray-900 rounded-3xl overflow-hidden shadow-2xl max-w-md w-full border border-gray-200 dark:border-gray-800 flex flex-col"
          >
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-gray-900 dark:text-white">Registrar Cobranza</h3>
                  <p className="text-[11px] text-gray-500">Ingreso de dinero a cuenta de {paymentCustomer.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPaymentModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Deuda Actual */}
              <div className="bg-red-50 dark:bg-red-950/40 p-3 rounded-2xl border border-red-200 dark:border-red-900 flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-bold text-red-600 uppercase block">Deuda Total Actual</span>
                  <span className="text-xl font-black text-[#dc2626]">{formatMoney(paymentCustomer.current_balance)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setPaymentAmountStr(paymentCustomer.current_balance.toString())}
                  className="text-xs bg-red-600 hover:bg-red-700 text-white font-black px-2.5 py-1 rounded-lg cursor-pointer transition-colors"
                >
                  Saldar Todo
                </button>
              </div>

              {/* Monto a Cobrar */}
              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1">
                  Monto Cobrado ($) *:
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-gray-500">$</span>
                  <input
                    type="number"
                    step="any"
                    required
                    value={paymentAmountStr}
                    onChange={(e) => setPaymentAmountStr(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl pl-8 pr-3 py-2 text-base font-black text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                {/* Botones rápidos */}
                <div className="flex gap-1.5 mt-1.5 flex-wrap">
                  {[5000, 10000, 20000, 50000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setPaymentAmountStr(amt.toString())}
                      className="text-[11px] bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 font-bold px-2 py-0.5 rounded-md cursor-pointer"
                    >
                      +${amt.toLocaleString('es-AR')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Método de Cobro */}
              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1.5">
                  Método de Cobro:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'efectivo', label: 'Efectivo (Entra a Caja)' },
                    { id: 'transferencia', label: 'Transferencia Bancaria' },
                    { id: 'tarjeta_posnet', label: 'Tarjeta / Posnet' },
                    { id: 'qr', label: 'QR / Mercado Pago' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id as any)}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer text-left ${
                        paymentMethod === m.id
                          ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 shadow-xs'
                          : 'border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
                {paymentMethod === 'efectivo' && activeCashRegister && (
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Impactará en la caja activa actual de {activeCashRegister.user_name}
                  </p>
                )}
              </div>

              {/* Notas */}
              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1">
                  Concepto / Observaciones (Opcional):
                </label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Ej. Pago semana 36 - Recibo nro 412"
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-1.5 text-xs text-gray-900 dark:text-white outline-none"
                />
              </div>

              {/* Saldo Restante Proyectado */}
              <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex justify-between text-xs font-bold">
                <span className="text-gray-500">Nuevo Saldo Deudor tras Cobro:</span>
                <span className="text-gray-900 dark:text-white font-black">
                  {formatMoney(Math.max(0, paymentCustomer.current_balance - (Number(paymentAmountStr) || 0)))}
                </span>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60 flex gap-2">
              <button
                type="button"
                onClick={() => setPaymentModalOpen(false)}
                className="flex-1 py-2.5 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl text-xs"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={processingPayment}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold py-2.5 rounded-xl text-xs shadow-md transition-colors cursor-pointer"
              >
                {processingPayment ? 'Guardando...' : 'Confirmar Cobro'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 6. MODAL DE FICHA Y MOVIMIENTOS HISTÓRICOS */}
      {movementsModalOpen && selectedCustomerForMovements && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-gray-900 rounded-3xl overflow-hidden shadow-2xl max-w-2xl w-full border border-gray-200 dark:border-gray-800 flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-sm text-gray-900 dark:text-white">
                  Ficha de Cuenta Corriente: {selectedCustomerForMovements.name}
                </h3>
                <p className="text-[11px] text-gray-500">
                  {selectedCustomerForMovements.document_type}: {selectedCustomerForMovements.document_number || 'S/D'} • Tel: {selectedCustomerForMovements.phone || 'S/T'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMovementsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cabecera con Saldos del Cliente */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-800 grid grid-cols-3 gap-3 text-center">
              <div className="bg-white dark:bg-gray-900 p-2.5 rounded-xl border border-gray-200 dark:border-gray-700">
                <span className="text-[10px] text-gray-500 block uppercase font-bold">Saldo Deudor</span>
                <span className="text-lg font-black text-red-600 dark:text-red-400">
                  {formatMoney(selectedCustomerForMovements.current_balance)}
                </span>
              </div>
              <div className="bg-white dark:bg-gray-900 p-2.5 rounded-xl border border-gray-200 dark:border-gray-700">
                <span className="text-[10px] text-gray-500 block uppercase font-bold">Límite Otorgado</span>
                <span className="text-lg font-black text-gray-900 dark:text-white">
                  {formatMoney(selectedCustomerForMovements.credit_limit)}
                </span>
              </div>
              <div className="bg-white dark:bg-gray-900 p-2.5 rounded-xl border border-gray-200 dark:border-gray-700">
                <span className="text-[10px] text-gray-500 block uppercase font-bold">Crédito Disponible</span>
                <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                  {formatMoney(Math.max(0, selectedCustomerForMovements.credit_limit - selectedCustomerForMovements.current_balance))}
                </span>
              </div>
            </div>

            {/* Listado Cronológico de Movimientos */}
            <div className="p-4 overflow-y-auto flex-1 space-y-2">
              <h4 className="text-xs font-black text-gray-800 dark:text-gray-200 uppercase tracking-wider mb-2">
                Historial de Deudas y Pagos
              </h4>
              {loadingMovements ? (
                <div className="p-8 text-center text-gray-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#dc2626]" />
                  <p className="text-xs mt-2">Cargando libro de movimientos...</p>
                </div>
              ) : movements.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-xs">
                  Este cliente no registra movimientos en cuenta corriente aún.
                </div>
              ) : (
                <div className="space-y-2">
                  {movements.map((mov) => {
                    const isDebt = mov.type === 'debt';
                    const isPayment = mov.type === 'payment';

                    return (
                      <div
                        key={mov.id}
                        className="bg-white dark:bg-gray-900 p-3 rounded-xl border border-gray-200 dark:border-gray-800 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                              isDebt
                                ? 'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400'
                                : isPayment
                                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400'
                                : 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400'
                            }`}
                          >
                            {isDebt ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-gray-900 dark:text-white">
                                {isDebt ? 'Compra Fiada' : isPayment ? 'Cobranza / Pago' : 'Ajuste de Saldo'}
                              </span>
                              <span className="text-[10px] text-gray-400">
                                {new Date(mov.created_at).toLocaleDateString('es-AR')} {new Date(mov.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                              {mov.notes || `Ref: ${mov.reference_id || 'S/R'}`}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span
                            className={`font-black text-sm block ${
                              isDebt ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            {isDebt ? `+${formatMoney(mov.amount)}` : `-${formatMoney(mov.amount)}`}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            Saldo: {formatMoney(mov.balance_after)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60 flex justify-between items-center">
              <span className="text-[11px] text-gray-400">
                {movements.length} movimientos registrados
              </span>
              <button
                type="button"
                onClick={() => setMovementsModalOpen(false)}
                className="py-2 px-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold rounded-xl text-xs"
              >
                Cerrar Ficha
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. MODAL DE CREAR / EDITAR CLIENTE */}
      {editModalOpen && customerToEdit && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <form
            onSubmit={handleSaveCustomer}
            className="bg-white dark:bg-gray-900 rounded-3xl overflow-hidden shadow-2xl max-w-lg w-full border border-gray-200 dark:border-gray-800 flex flex-col"
          >
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-red-50 dark:bg-red-950 text-[#dc2626] flex items-center justify-center">
                  <Edit3 className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-sm text-gray-900 dark:text-white">
                  {customerToEdit.id ? 'Editar Cliente' : 'Nuevo Cliente'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3 overflow-y-auto max-h-[75vh]">
              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1">
                  Nombre o Razón Social *:
                </label>
                <input
                  type="text"
                  required
                  value={customerToEdit.name || ''}
                  onChange={(e) => setCustomerToEdit({ ...customerToEdit, name: e.target.value })}
                  placeholder="Ej. Autoservicio Don Carlos"
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#dc2626]"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-gray-500 block mb-1">Tipo Doc:</label>
                  <select
                    value={customerToEdit.document_type || 'CUIT'}
                    onChange={(e) => setCustomerToEdit({ ...customerToEdit, document_type: e.target.value as any })}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl p-2 text-xs font-bold text-gray-900 dark:text-white"
                  >
                    <option value="CUIT">CUIT</option>
                    <option value="DNI">DNI</option>
                    <option value="CUIL">CUIL</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-[11px] font-bold text-gray-500 block mb-1">Número de Documento:</label>
                  <input
                    type="text"
                    value={customerToEdit.document_number || ''}
                    onChange={(e) => setCustomerToEdit({ ...customerToEdit, document_number: e.target.value })}
                    placeholder="Ej. 20-33444555-9"
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 dark:text-white outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-gray-500 block mb-1">Teléfono (WhatsApp):</label>
                  <input
                    type="text"
                    value={customerToEdit.phone || ''}
                    onChange={(e) => setCustomerToEdit({ ...customerToEdit, phone: e.target.value })}
                    placeholder="5491144445555"
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-white outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-500 block mb-1">Correo Electrónico:</label>
                  <input
                    type="email"
                    value={customerToEdit.email || ''}
                    onChange={(e) => setCustomerToEdit({ ...customerToEdit, email: e.target.value })}
                    placeholder="cliente@ejemplo.com"
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-500 block mb-1">Dirección / Local:</label>
                <input
                  type="text"
                  value={customerToEdit.address || ''}
                  onChange={(e) => setCustomerToEdit({ ...customerToEdit, address: e.target.value })}
                  placeholder="Ej. Av. Rivadavia 4500, Local 2"
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-gray-500 block mb-1">Límite de Crédito ($):</label>
                  <input
                    type="number"
                    step="any"
                    value={customerToEdit.credit_limit || 0}
                    onChange={(e) => setCustomerToEdit({ ...customerToEdit, credit_limit: Number(e.target.value) })}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 dark:text-white outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-500 block mb-1">Saldo Deudor Inicial ($):</label>
                  <input
                    type="number"
                    step="any"
                    value={customerToEdit.current_balance || 0}
                    onChange={(e) => setCustomerToEdit({ ...customerToEdit, current_balance: Number(e.target.value) })}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 dark:text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-500 block mb-1">Notas / Condiciones de Pago:</label>
                <textarea
                  rows={2}
                  value={customerToEdit.notes || ''}
                  onChange={(e) => setCustomerToEdit({ ...customerToEdit, notes: e.target.value })}
                  placeholder="Ej. Paga todos los viernes. Descuento del 5% si liquida antes del día 10."
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl p-2.5 text-xs text-gray-900 dark:text-white outline-none"
                />
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60 flex gap-2">
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="flex-1 py-2.5 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl text-xs"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 bg-[#dc2626] hover:bg-red-700 text-white font-extrabold py-2.5 rounded-xl text-xs shadow-md transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Guardar Cliente</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
